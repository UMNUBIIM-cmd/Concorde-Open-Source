/**
 * Transforma o PCM que chega do capturador nativo (concorde-audio.exe) em uma
 * faixa de áudio (MediaStreamTrack) que vai junto com a transmissão de tela.
 *
 * Entrada: PCM 48 kHz, estéreo, 16 bits little-endian, em pedaços de tamanho
 * qualquer (não necessariamente alinhados a 4 bytes).
 */

const RATE = 48000;
const CAPACITY = RATE * 2; // 2 s de folga no buffer
const PREBUFFER = 2400; // 50 ms antes de começar a tocar
const MAX_LATENCY = RATE * 0.25; // se acumular mais de 250 ms, descarta o excesso
const TARGET_LATENCY = RATE * 0.08;

export function createPcmTrack() {
  const ctx = new AudioContext({ sampleRate: RATE });
  const left = new Float32Array(CAPACITY);
  const right = new Float32Array(CAPACITY);
  let readIdx = 0;
  let writeIdx = 0;
  let count = 0;
  let started = false;
  let pending = null; // bytes que sobraram de um pedaço (desalinhado)
  let peak = 0;

  function push(chunk) {
    let bytes = chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk);
    if (pending && pending.length) {
      const merged = new Uint8Array(pending.length + bytes.length);
      merged.set(pending, 0);
      merged.set(bytes, pending.length);
      bytes = merged;
      pending = null;
    }
    const frames = Math.floor(bytes.length / 4);
    const rest = bytes.length - frames * 4;
    if (rest) pending = bytes.slice(bytes.length - rest);
    const view = new DataView(bytes.buffer, bytes.byteOffset, frames * 4);
    for (let i = 0; i < frames; i++) {
      left[writeIdx] = view.getInt16(i * 4, true) / 32768;
      right[writeIdx] = view.getInt16(i * 4 + 2, true) / 32768;
      writeIdx = (writeIdx + 1) % CAPACITY;
      if (count < CAPACITY) count++;
      else readIdx = (readIdx + 1) % CAPACITY;
    }
    // Mantém a latência baixa (som sincronizado com o vídeo).
    if (count > MAX_LATENCY) {
      const drop = count - TARGET_LATENCY;
      readIdx = (readIdx + drop) % CAPACITY;
      count -= drop;
    }
  }

  // ScriptProcessor: simples e funciona em qualquer Electron (sem carregar módulo).
  const node = ctx.createScriptProcessor(2048, 0, 2);
  node.onaudioprocess = (e) => {
    const outL = e.outputBuffer.getChannelData(0);
    const outR = e.outputBuffer.getChannelData(1);
    const n = outL.length;
    if (!started && count < PREBUFFER) {
      outL.fill(0);
      outR.fill(0);
      return;
    }
    started = true;
    const avail = Math.min(n, count);
    let p = 0;
    for (let i = 0; i < avail; i++) {
      const l = left[readIdx];
      const r = right[readIdx];
      outL[i] = l;
      outR[i] = r;
      const a = Math.abs(l) > Math.abs(r) ? Math.abs(l) : Math.abs(r);
      if (a > p) p = a;
      readIdx = (readIdx + 1) % CAPACITY;
    }
    count -= avail;
    if (avail < n) {
      outL.fill(0, avail);
      outR.fill(0, avail);
      started = false; // faltou áudio: espera encher de novo
    }
    peak = p;
  };

  const dest = ctx.createMediaStreamDestination();
  node.connect(dest);
  // Ligado ao destino com volume 0 só para garantir que o nó seja processado.
  const keepAlive = ctx.createGain();
  keepAlive.gain.value = 0;
  node.connect(keepAlive);
  keepAlive.connect(ctx.destination);

  return {
    track: dest.stream.getAudioTracks()[0],
    push,
    level: () => peak,
    close() {
      try { node.disconnect(); } catch (_) {}
      try { keepAlive.disconnect(); } catch (_) {}
      try { dest.stream.getTracks().forEach((t) => t.stop()); } catch (_) {}
      ctx.close().catch(() => {});
    },
  };
}

/**
 * Inicia a captura do som da fonte escolhida e devolve a faixa.
 * Lança erro com mensagem amigável se não der.
 */
export async function startAppAudio(sourceId, onEnded) {
  const desktop = window.desktop;
  if (!desktop || !desktop.appAudioStart) throw new Error('Captura de som indisponível.');
  const pcm = createPcmTrack();
  // Assina antes de iniciar, para não perder os primeiros pedaços.
  const offData = desktop.onAppAudioData((chunk) => pcm.push(chunk));
  const offEnded = desktop.onAppAudioEnded((info) => {
    if (onEnded) onEnded(info);
  });
  const res = await desktop.appAudioStart(sourceId);
  if (!res || !res.ok) {
    offData();
    offEnded();
    pcm.close();
    throw new Error((res && res.error) || 'Não foi possível capturar o som.');
  }
  return {
    track: pcm.track,
    level: pcm.level,
    stop() {
      offData();
      offEnded();
      desktop.appAudioStop().catch(() => {});
      pcm.close();
    },
  };
}
