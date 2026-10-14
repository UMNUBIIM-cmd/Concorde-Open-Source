//go:build windows

// concorde-audio.exe — captura o áudio de UM aplicativo no Windows (WASAPI
// "process loopback", Windows 10 2004+ / build 19041+).
//
// Uso:
//   concorde-audio.exe --hwnd <HWND>     captura só o processo dono da janela (e filhos)
//   concorde-audio.exe --include <PID>   captura só esse processo (e filhos)
//   concorde-audio.exe --exclude <PID>   captura TUDO, menos esse processo (e filhos)
//
// Saída: PCM bruto em stdout — 48000 Hz, 2 canais, 16 bits little-endian.
// Erros vão para stderr com o prefixo "ERRO:". Encerra quando stdin fecha
// (ou seja, quando o Concorde fecha ou para a transmissão).
//
// Como o Concorde usa:
//   - Transmitindo uma JANELA  -> --hwnd  (só o som daquele programa)
//   - Transmitindo a TELA      -> --exclude <pid do Concorde> (tudo menos a chamada)
// Nos dois casos a voz dos colegas (que toca dentro do Concorde) nunca é capturada,
// então ninguém se ouve de volta.

package main

import (
	"flag"
	"fmt"
	"io"
	"os"
	"runtime"
	"syscall"
	"unsafe"
)

type guid struct {
	Data1 uint32
	Data2 uint16
	Data3 uint16
	Data4 [8]byte
}

var (
	iidIUnknown      = guid{0x00000000, 0x0000, 0x0000, [8]byte{0xC0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x46}}
	iidIAgileObject  = guid{0x94EA2B94, 0xE9CC, 0x49E0, [8]byte{0xC0, 0xFF, 0xEE, 0x64, 0xCA, 0x8F, 0x5B, 0x90}}
	iidCompletion    = guid{0x41D949AB, 0x9862, 0x444A, [8]byte{0x80, 0xF6, 0xC2, 0x61, 0x33, 0x4D, 0xA5, 0xEB}}
	iidIAudioClient  = guid{0x1CB9AD4C, 0xDBFA, 0x4C32, [8]byte{0xB1, 0x78, 0xC2, 0xF5, 0x68, 0xA7, 0x03, 0xB2}}
	iidIAudioCapture = guid{0xC8ADBD64, 0xE71E, 0x48A0, [8]byte{0xA4, 0xDE, 0x18, 0x5C, 0x39, 0x5C, 0xD3, 0x17}}
)

const (
	streamFlagsLoopback       = 0x00020000
	streamFlagsEventCallback  = 0x00040000
	streamFlagsSrcDefaultQual = 0x08000000
	streamFlagsAutoConvertPCM = 0x80000000
	bufferFlagsSilent         = 0x2

	vtBlob                 = 65
	activationTypeLoopback = 1
	modeInclude            = 0
	modeExclude            = 1

	sampleRate = 48000
	channels   = 2
	bits       = 16
	blockAlign = channels * bits / 8
)

var (
	ole32                           = syscall.NewLazyDLL("ole32.dll")
	procCoInitializeEx              = ole32.NewProc("CoInitializeEx")
	mmdevapi                        = syscall.NewLazyDLL("mmdevapi.dll")
	procActivateAudioInterfaceAsync = mmdevapi.NewProc("ActivateAudioInterfaceAsync")
	kernel32                        = syscall.NewLazyDLL("kernel32.dll")
	procCreateEventW                = kernel32.NewProc("CreateEventW")
	procSetEvent                    = kernel32.NewProc("SetEvent")
	procWaitForSingleObject         = kernel32.NewProc("WaitForSingleObject")
	user32                          = syscall.NewLazyDLL("user32.dll")
	procGetWindowThreadProcessId    = user32.NewProc("GetWindowThreadProcessId")
)

// AUDIOCLIENT_ACTIVATION_PARAMS
type activationParams struct {
	ActivationType      uint32
	TargetProcessId     uint32
	ProcessLoopbackMode uint32
}

// PROPVARIANT com VT_BLOB (layout x64: vt + 3 reservados, depois BLOB{cbSize, ptr}).
type propVariantBlob struct {
	vt        uint16
	r1, r2    uint16
	r3        uint16
	cbSize    uint32
	_         uint32
	pBlobData uintptr
}

// WAVEFORMATEX
type waveFormatEx struct {
	wFormatTag      uint16
	nChannels       uint16
	nSamplesPerSec  uint32
	nAvgBytesPerSec uint32
	nBlockAlign     uint16
	wBitsPerSample  uint16
	cbSize          uint16
}

// Objeto COM mínimo que implementa IActivateAudioInterfaceCompletionHandler
// (+ IAgileObject). Fica em variáveis globais para o endereço nunca mudar.
type comObject struct{ vtbl *[4]uintptr }

var (
	handlerVtbl    [4]uintptr
	handlerObj     comObject
	completedEvent uintptr
	gParams        activationParams
	gPropVariant   propVariantBlob
	gFormat        waveFormatEx

	// Parâmetros de saída das chamadas COM. Globais = endereço fixo (o Windows
	// escreve neles; variáveis de pilha poderiam ser movidas pelo runtime do Go).
	gPid        uint32
	gOp         uintptr
	gActivateHr uint32
	gPunk       uintptr
	gClient     uintptr
	gCapture    uintptr
	gPacket     uint32
	gFrames     uint32
	gBFlags     uint32
	gData       uintptr
)

func handlerQueryInterface(this, riid, ppv uintptr) uintptr {
	g := *(*guid)(unsafe.Pointer(riid))
	if g == iidIUnknown || g == iidIAgileObject || g == iidCompletion {
		*(*uintptr)(unsafe.Pointer(ppv)) = this
		return 0
	}
	*(*uintptr)(unsafe.Pointer(ppv)) = 0
	return 0x80004002 // E_NOINTERFACE
}
func handlerAddRef(this uintptr) uintptr  { return 1 }
func handlerRelease(this uintptr) uintptr { return 1 }
func handlerActivateCompleted(this, op uintptr) uintptr {
	procSetEvent.Call(completedEvent)
	return 0
}

// Chama o método de índice idx da vtable de um objeto COM.
func vcall(obj uintptr, idx int, args ...uintptr) uintptr {
	vtbl := *(*uintptr)(unsafe.Pointer(obj))
	fn := *(*uintptr)(unsafe.Pointer(vtbl + uintptr(idx)*unsafe.Sizeof(uintptr(0))))
	all := append([]uintptr{obj}, args...)
	r, _, _ := syscall.SyscallN(fn, all...)
	return r
}

func fail(msg string, hr uintptr) {
	if hr != 0 {
		fmt.Fprintf(os.Stderr, "ERRO: %s (0x%08X)\n", msg, uint32(hr))
	} else {
		fmt.Fprintf(os.Stderr, "ERRO: %s\n", msg)
	}
	os.Exit(2)
}

func failed(hr uintptr) bool { return int32(uint32(hr)) < 0 }

func main() {
	runtime.LockOSThread()

	hwnd := flag.Uint64("hwnd", 0, "HWND da janela a capturar")
	include := flag.Uint("include", 0, "PID a capturar (com filhos)")
	exclude := flag.Uint("exclude", 0, "PID a excluir (captura todo o resto)")
	flag.Parse()

	var pid uint32
	mode := uint32(modeInclude)
	switch {
	case *hwnd != 0:
		procGetWindowThreadProcessId.Call(uintptr(*hwnd), uintptr(unsafe.Pointer(&gPid)))
		if gPid == 0 {
			fail("janela não encontrada", 0)
		}
		pid = gPid
	case *include != 0:
		pid = uint32(*include)
	case *exclude != 0:
		pid = uint32(*exclude)
		mode = modeExclude
	default:
		fail("uso: concorde-audio.exe --hwnd N | --include PID | --exclude PID", 0)
	}

	// Encerra quando o Concorde fechar o stdin (parou a transmissão ou fechou).
	go func() {
		io.Copy(io.Discard, os.Stdin)
		os.Exit(0)
	}()

	if hr, _, _ := procCoInitializeEx.Call(0, 0 /* COINIT_MULTITHREADED */); failed(hr) {
		fail("CoInitializeEx", hr)
	}

	handlerVtbl = [4]uintptr{
		syscall.NewCallback(handlerQueryInterface),
		syscall.NewCallback(handlerAddRef),
		syscall.NewCallback(handlerRelease),
		syscall.NewCallback(handlerActivateCompleted),
	}
	handlerObj.vtbl = &handlerVtbl
	completedEvent, _, _ = procCreateEventW.Call(0, 0, 0, 0)

	gParams = activationParams{
		ActivationType:      activationTypeLoopback,
		TargetProcessId:     pid,
		ProcessLoopbackMode: mode,
	}
	gPropVariant = propVariantBlob{
		vt:        vtBlob,
		cbSize:    uint32(unsafe.Sizeof(gParams)),
		pBlobData: uintptr(unsafe.Pointer(&gParams)),
	}

	devicePath, _ := syscall.UTF16PtrFromString(`VAD\Process_Loopback`)
	hr, _, _ := procActivateAudioInterfaceAsync.Call(
		uintptr(unsafe.Pointer(devicePath)),
		uintptr(unsafe.Pointer(&iidIAudioClient)),
		uintptr(unsafe.Pointer(&gPropVariant)),
		uintptr(unsafe.Pointer(&handlerObj)),
		uintptr(unsafe.Pointer(&gOp)),
	)
	if failed(hr) {
		fail("ActivateAudioInterfaceAsync (requer Windows 10 2004 ou mais novo)", hr)
	}
	procWaitForSingleObject.Call(completedEvent, 10000)

	if gOp == 0 {
		fail("ativação não retornou operação", 0)
	}
	if hr := vcall(gOp, 3, uintptr(unsafe.Pointer(&gActivateHr)), uintptr(unsafe.Pointer(&gPunk))); failed(hr) {
		fail("GetActivateResult", hr)
	}
	if failed(uintptr(gActivateHr)) || gPunk == 0 {
		fail("ativação do áudio do processo", uintptr(gActivateHr))
	}

	if hr := vcall(gPunk, 0, uintptr(unsafe.Pointer(&iidIAudioClient)), uintptr(unsafe.Pointer(&gClient))); failed(hr) {
		fail("QueryInterface IAudioClient", hr)
	}

	gFormat = waveFormatEx{
		wFormatTag:      1, // WAVE_FORMAT_PCM
		nChannels:       channels,
		nSamplesPerSec:  sampleRate,
		nAvgBytesPerSec: sampleRate * blockAlign,
		nBlockAlign:     blockAlign,
		wBitsPerSample:  bits,
		cbSize:          0,
	}
	flags := uintptr(streamFlagsLoopback | streamFlagsEventCallback | streamFlagsAutoConvertPCM | streamFlagsSrcDefaultQual)
	if hr := vcall(gClient, 3, 0 /* SHARED */, flags, 200000 /* 20ms */, 0, uintptr(unsafe.Pointer(&gFormat)), 0); failed(hr) {
		fail("IAudioClient.Initialize", hr)
	}

	bufferEvent, _, _ := procCreateEventW.Call(0, 0, 0, 0)
	if hr := vcall(gClient, 13, bufferEvent); failed(hr) {
		fail("SetEventHandle", hr)
	}

	if hr := vcall(gClient, 14, uintptr(unsafe.Pointer(&iidIAudioCapture)), uintptr(unsafe.Pointer(&gCapture))); failed(hr) {
		fail("GetService IAudioCaptureClient", hr)
	}

	if hr := vcall(gClient, 10); failed(hr) {
		fail("IAudioClient.Start", hr)
	}
	fmt.Fprintln(os.Stderr, "OK: capturando")

	out := make([]byte, 0, sampleRate*blockAlign)
	for {
		procWaitForSingleObject.Call(bufferEvent, 100)
		for {
			if hr := vcall(gCapture, 5, uintptr(unsafe.Pointer(&gPacket))); failed(hr) {
				fail("GetNextPacketSize", hr)
			}
			if gPacket == 0 {
				break
			}
			if hr := vcall(gCapture, 3,
				uintptr(unsafe.Pointer(&gData)),
				uintptr(unsafe.Pointer(&gFrames)),
				uintptr(unsafe.Pointer(&gBFlags)),
				0, 0); failed(hr) {
				fail("GetBuffer", hr)
			}
			n := int(gFrames) * blockAlign
			if gBFlags&bufferFlagsSilent != 0 || gData == 0 {
				for i := 0; i < n; i++ {
					out = append(out, 0)
				}
			} else if n > 0 {
				out = append(out, unsafe.Slice((*byte)(unsafe.Pointer(gData)), n)...)
			}
			vcall(gCapture, 4, uintptr(gFrames))
		}
		if len(out) > 0 {
			if _, err := os.Stdout.Write(out); err != nil {
				os.Exit(0)
			}
			out = out[:0]
		}
	}
}
