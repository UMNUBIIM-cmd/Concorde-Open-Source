# Som só da janela transmitida — `concorde-audio.exe`

Este é o capturador que faz a transmissão levar **só o som do programa que você
está transmitindo** (ex.: só o jogo), e nunca a voz da chamada.

- `bin/concorde-audio.exe` — o executável já compilado (Windows x64). O Concorde
  o inclui automaticamente no `.exe` portátil (via `extraResources`).
- `concorde-audio/main.go` — o código-fonte (Go, sem dependências).

## Como funciona

Usa a API do Windows **WASAPI process loopback** (Windows 10 versão 2004 /
build 19041 ou mais novo — a mesma que o OBS usa na "Captura de áudio de
aplicativo"):

| Você transmite… | O Concorde roda | Resultado |
|---|---|---|
| Uma **janela** (jogo, navegador…) | `concorde-audio.exe --hwnd <janela>` | só o som daquele programa (e dos processos filhos dele) |
| A **tela inteira** | `concorde-audio.exe --exclude <pid do Concorde>` | todo o som do PC **menos** o Concorde — a voz da chamada fica de fora |

O áudio sai em PCM (48 kHz, estéreo, 16 bits) pelo `stdout`; o Concorde
transforma isso numa faixa de áudio **separada da sua voz**. Quem assiste tem um
volume só para a sua transmissão.

## Recompilar (opcional)

Só precisa se você mudar o `main.go`. Com o Go instalado (https://go.dev):

```
cd electron/native/concorde-audio
set GOOS=windows
set GOARCH=amd64
set CGO_ENABLED=0
go build -trimpath -ldflags "-s -w" -o ../bin/concorde-audio.exe .
```

## Testar sozinho (sem o Concorde)

Abra o PowerShell na pasta `electron/native/bin` com algum som tocando no PC:

```
.\concorde-audio.exe --exclude 4 > $null
```

Se aparecer `OK: capturando`, está funcionando (Ctrl+C para sair). Se aparecer
`ERRO: ...`, o seu Windows é anterior ao 10 versão 2004.

> Alguns antivírus desconfiam de executáveis novos sem assinatura digital. Se o
> Windows Defender bloquear, libere o `concorde-audio.exe`.
