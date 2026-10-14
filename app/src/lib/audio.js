// AudioContext único compartilhado para TOCAR o áudio que chega.
let ctx = null;
let master = null; // ganho geral (volume de saída), antes do destino

export function getAudioContext() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 1;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}
function masterNode() {
  getAudioContext();
  return master;
}

/** Volume geral de saída (0 a 1). */
export function setMasterVolume(v) {
  masterNode().gain.value = Math.max(0, Math.min(1, v));
}

/** Dispositivo de saída (alto-falante/fone). Precisa de Chromium recente. */
export async function setOutputDevice(deviceId) {
  const c = getAudioContext();
  try {
    if (typeof c.setSinkId === 'function') {
      await c.setSinkId(deviceId && deviceId !== 'default' ? deviceId : '');
      return true;
    }
  } catch (_) {}
  return false;
}

/**
 * Uma "saída" de áudio com volume próprio (0% a 200%).
 * Cada participante tem DUAS: voz (microfone) e transmissão (som da janela).
 */
export function createAudioSink() {
  const context = getAudioContext();
  const stream = new MediaStream();
  const analyser = context.createAnalyser();
  analyser.fftSize = 512;
  const gain = context.createGain();
  gain.gain.value = 1;
  analyser.connect(gain);
  gain.connect(masterNode());

  const pumpEl = document.createElement('audio');
  pumpEl.muted = true;
  pumpEl.autoplay = true;
  pumpEl.style.display = 'none';
  document.body.appendChild(pumpEl);

  const buf = new Uint8Array(analyser.fftSize);
  let source = null;
  let volume = 1;
  let muted = false;

  function rewire() {
    if (source) { try { source.disconnect(); } catch (_) {} source = null; }
    if (stream.getAudioTracks().length === 0) return;
    source = context.createMediaStreamSource(stream);
    source.connect(analyser);
  }
  function apply() { gain.gain.value = muted ? 0 : volume; }

  return {
    has(track) { return stream.getTrackById(track.id) != null; },
    addTrack(track) {
      if (stream.getTrackById(track.id)) return;
      stream.addTrack(track);
      pumpEl.srcObject = stream;
      pumpEl.play().catch(() => {});
      rewire();
    },
    removeTrack(track) {
      if (!stream.getTrackById(track.id)) return;
      try { stream.removeTrack(track); } catch (_) {}
      rewire();
    },
    setVolume(v) { volume = Math.max(0, Math.min(2, v)); apply(); },
    setMuted(m) { muted = !!m; apply(); },
    level() {
      if (!source) return 0;
      analyser.getByteTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v; }
      return Math.sqrt(sum / buf.length);
    },
    destroy() {
      try { source && source.disconnect(); } catch (_) {}
      try { analyser.disconnect(); } catch (_) {}
      try { gain.disconnect(); } catch (_) {}
      try { pumpEl.pause(); pumpEl.srcObject = null; pumpEl.remove(); } catch (_) {}
    },
  };
}

/**
 * Captura o microfone já com controle de volume de ENTRADA (ganho).
 * Devolve a faixa processada (que é a que enviamos) e o nível do mic cru.
 */
export function createMicPipeline(rawStream, inputVolume) {
  const context = getAudioContext();
  const rawTrack = rawStream.getAudioTracks()[0];
  const source = context.createMediaStreamSource(rawStream);
  const analyser = context.createAnalyser();
  analyser.fftSize = 512;
  const gain = context.createGain();
  gain.gain.value = typeof inputVolume === 'number' ? inputVolume : 1;
  const dest = context.createMediaStreamDestination();
  source.connect(analyser);
  source.connect(gain);
  gain.connect(dest);
  const buf = new Uint8Array(analyser.fftSize);
  const outTrack = dest.stream.getAudioTracks()[0];
  return {
    track: outTrack,
    stream: dest.stream,
    setInputVolume(v) { gain.gain.value = Math.max(0, Math.min(3, v)); },
    setMuted(m) { outTrack.enabled = !m; },
    level() {
      analyser.getByteTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v; }
      return Math.sqrt(sum / buf.length);
    },
    destroy() {
      try { source.disconnect(); } catch (_) {}
      try { gain.disconnect(); } catch (_) {}
      try { analyser.disconnect(); } catch (_) {}
      try { outTrack.stop(); } catch (_) {}
      try { rawTrack.stop(); } catch (_) {}
    },
  };
}

// ---- Volumes por pessoa lembrados ----
function loadVolumes() {
  try { return JSON.parse(localStorage.getItem('concorde:volumes') || '{}') || {}; } catch (_) { return {}; }
}
export function getSavedVolume(nick, kind) {
  const v = loadVolumes()[kind + ':' + nick];
  return typeof v === 'number' ? v : 1;
}
export function saveVolume(nick, kind, value) {
  try {
    const all = loadVolumes();
    all[kind + ':' + nick] = value;
    localStorage.setItem('concorde:volumes', JSON.stringify(all));
  } catch (_) {}
}
