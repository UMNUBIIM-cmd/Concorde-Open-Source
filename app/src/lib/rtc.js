import { ICE_SERVERS, QUALITY_PRESETS } from '../config.js';
import {
  createAudioSink, createMicPipeline, getSavedVolume, saveVolume,
  setMasterVolume, setOutputDevice,
} from './audio.js';
import { startAppAudio } from './appAudio.js';
import { getAudioPrefs, setAudioPref } from './prefs.js';

const SPEAK_THRESHOLD = 0.035;
const SPEAK_HOLD_MS = 350;

function emptyMedia() {
  return {
    muted: false,
    cam: false,
    sharing: false,
    micStreamId: null,
    camStreamId: null,
    screenStreamId: null,
    screenHasAudio: false,
  };
}

/**
 * Motor de voz/vídeo/tela em malha (cada um conecta direto com todos).
 *
 * Áudio sem eco, por construção:
 *  - Microfone, câmera e transmissão de tela são faixas SEPARADAS, cada uma no
 *    seu próprio MediaStream (o id do stream diz o que é cada faixa).
 *  - O som da transmissão NÃO vem do "som do sistema": vem do capturador
 *    nativo, que pega só o programa da janela transmitida (ou, na tela inteira,
 *    tudo menos o Concorde). A voz dos colegas toca dentro do Concorde, então nunca
 *    entra na transmissão.
 *  - Do lado de quem assiste, a voz e a transmissão de cada pessoa tocam em
 *    saídas separadas, cada uma com seu volume.
 */
export class VoiceEngine {
  constructor(socket, selfId, onChange, onError) {
    this.socket = socket;
    this.selfId = selfId;
    this.onChange = onChange || (() => {});
    this.onError = onError || (() => {});

    this.peers = new Map(); // peerId -> peer
    this.channelId = null;

    this.mic = null; // { track, stream, meter }
    this.cam = null; // { track, stream }
    this.screen = null; // { stream, videoTrack, appAudio, qualityKey }

    this.media = emptyMedia();
    this.lastLoud = new Map(); // id -> timestamp da última vez que falou
    this.speakingSet = new Set();
    this.timer = null;
    this.handlers = [];

    // Preferências de áudio (dispositivos + volumes) salvas no computador.
    this.audio = getAudioPrefs();
    setMasterVolume(this.audio.outputVol);
    setOutputDevice(this.audio.outputId);

    this._bind();
  }

  // ---------------------------------------------------------------- socket
  _on(event, fn) {
    this.socket.on(event, fn);
    this.handlers.push([event, fn]);
  }

  destroy() {
    this.leaveVoice();
    this.handlers.forEach(([e, fn]) => this.socket.off(e, fn));
    this.handlers = [];
  }

  _bind() {
    this._on('voice:roster', ({ channelId, peers }) => {
      if (channelId !== this.channelId) return;
      // Eu sou o recém-chegado: preparo a conexão com cada um que já estava.
      peers.forEach((p) => {
        if (p.id === this.selfId) return;
        const peer = this._getOrCreatePeer(p.id, p.nick, p);
        peer.media = p.media || peer.media;
        this._routeAudio(peer);
        this._addLocalTracks(peer);
      });
      this._emit();
    });

    this._on('voice:peer-joined', ({ channelId, peer: p }) => {
      if (channelId !== this.channelId || p.id === this.selfId) return;
      const peer = this._getOrCreatePeer(p.id, p.nick, p);
      peer.media = p.media || peer.media;
      this._routeAudio(peer);
      // NÃO adiciono minhas faixas aqui: quem chegou é quem inicia a conexão.
      // Eu adiciono quando a oferta dele chegar (ver 'signal'). Se os dois
      // lados ofertassem ao mesmo tempo, o Chromium às vezes travava a
      // conexão depois de desfazer uma das ofertas.
      this._emit();
    });

    this._on('voice:peer-left', ({ id }) => this._removePeer(id));

    this._on('voice:peer-media', ({ id, media }) => {
      const peer = this.peers.get(id);
      if (!peer) return;
      peer.media = media || emptyMedia();
      this._routeAudio(peer);
      this._emit();
    });

    this._on('voice:force-leave', () => {
      if (!this.channelId) return;
      this._teardown();
      this.onError('O canal de voz foi excluído.');
      this._emit();
    });

    this._on('signal', async ({ from, data }) => {
      if (!this.channelId || !data) return;
      let peer = this.peers.get(from);
      if (!peer) {
        if (!data.description || data.description.type !== 'offer') return;
        peer = this._getOrCreatePeer(from, 'Conectando…');
      }
      const pc = peer.pc;
      try {
        if (data.description) {
          const desc = data.description;
          const collision = desc.type === 'offer' && (peer.makingOffer || pc.signalingState !== 'stable');
          peer.ignoreOffer = !peer.polite && collision;
          if (peer.ignoreOffer) return;
          await pc.setRemoteDescription(desc);
          if (desc.type === 'offer') {
            // Primeira oferta deste peer: agora sim adiciono minhas faixas
            // (elas reaproveitam as linhas de mídia da oferta; o que sobrar é
            // negociado logo depois, sem conflito).
            if (!peer.localAdded) this._addLocalTracks(peer);
            await pc.setLocalDescription();
            this._signal(from, { description: pc.localDescription });
          }
        } else if (data.candidate) {
          try {
            await pc.addIceCandidate(data.candidate);
          } catch (e) {
            if (!peer.ignoreOffer) console.warn('ice', e);
          }
        }
      } catch (err) {
        console.error('signal error', err);
      }
    });
  }

  _signal(to, data) {
    this.socket.emit('signal', { to, data });
  }

  // ----------------------------------------------------------------- peers
  _getOrCreatePeer(id, nick, extra) {
    let peer = this.peers.get(id);
    if (peer) {
      if (nick && nick !== 'Conectando…' && peer.nick !== nick) {
        peer.nick = nick;
        this._loadVolumes(peer);
      }
      if (extra) { if (extra.userId) peer.userId = extra.userId; if ('avatar' in extra) peer.avatar = extra.avatar; }
      return peer;
    }

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    peer = {
      id,
      userId: extra && extra.userId ? extra.userId : null,
      avatar: extra ? extra.avatar || null : null,
      nick: nick || 'Conectando…',
      pc,
      polite: this.selfId > id, // decisão determinística para resolver conflitos
      makingOffer: false,
      ignoreOffer: false,
      localAdded: false,
      media: emptyMedia(),
      sinks: { voice: createAudioSink(), stream: createAudioSink() },
      voiceVolume: 1,
      streamVolume: 1,
      streamMuted: false,
      audioTracks: new Map(), // trackId -> { track, streamId, route }
      videoStreams: new Map(), // streamId -> MediaStream
      senders: new Map(), // trackId -> RTCRtpSender
    };
    this._loadVolumes(peer);
    this.peers.set(id, peer);

    pc.onnegotiationneeded = async () => {
      try {
        peer.makingOffer = true;
        await pc.setLocalDescription();
        this._signal(id, { description: pc.localDescription });
      } catch (err) {
        console.error('negotiation error', err);
      } finally {
        peer.makingOffer = false;
      }
    };

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) this._signal(id, { candidate });
    };

    pc.onsignalingstatechange = () => {
      // Depois de cada negociação, reaplica a qualidade escolhida da transmissão.
      if (pc.signalingState === 'stable' && this.screen) {
        const s = peer.senders.get(this.screen.videoTrack.id);
        if (s) this._applyEncoding(s);
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' && !peer.polite) {
        try { pc.restartIce(); } catch (_) {}
      }
      this._emit();
    };

    // Cão de guarda: se a conexão não fechar em alguns segundos, reinicia o
    // ICE (só um dos lados, para não haver conflito).
    peer.watchdog = setInterval(() => {
      if (!this.peers.has(id) || pc.connectionState === 'closed') {
        clearInterval(peer.watchdog);
        return;
      }
      if (pc.connectionState === 'connected') {
        peer.stuckTicks = 0;
        return;
      }
      peer.stuckTicks = (peer.stuckTicks || 0) + 1;
      if (peer.stuckTicks >= 2 && !peer.polite && peer.localAdded && pc.signalingState === 'stable') {
        peer.stuckTicks = 0;
        try { pc.restartIce(); } catch (_) {}
      }
    }, 4000);

    pc.ontrack = (event) => {
      const track = event.track;
      const stream = event.streams[0];
      const sid = stream ? stream.id : 'x_' + track.id;
      if (track.kind === 'audio') {
        const prev = peer.audioTracks.get(track.id);
        if (prev) prev.streamId = sid;
        else peer.audioTracks.set(track.id, { track, streamId: sid, route: null });
        this._routeAudio(peer);
      } else {
        peer.videoStreams.set(sid, new MediaStream([track]));
      }
      this._emit();
    };

    return peer;
  }

  _loadVolumes(peer) {
    peer.voiceVolume = getSavedVolume(peer.nick, 'voice');
    peer.streamVolume = getSavedVolume(peer.nick, 'stream');
    peer.sinks.voice.setVolume(peer.voiceVolume);
    peer.sinks.stream.setVolume(peer.streamVolume);
  }

  /** Manda cada faixa de áudio que chega para a saída certa: voz ou transmissão. */
  _routeAudio(peer) {
    const m = peer.media || emptyMedia();
    peer.audioTracks.forEach((e) => {
      let want;
      if (m.screenStreamId && e.streamId === m.screenStreamId) want = 'stream';
      else if (m.micStreamId) want = e.streamId === m.micStreamId ? 'voice' : null;
      else want = 'voice';
      if (e.route === want) return;
      if (e.route) peer.sinks[e.route].removeTrack(e.track);
      if (want) peer.sinks[want].addTrack(e.track);
      e.route = want;
    });
  }

  _removePeer(id) {
    const peer = this.peers.get(id);
    if (!peer) return;
    clearInterval(peer.watchdog);
    try { peer.pc.close(); } catch (_) {}
    try { peer.sinks.voice.destroy(); } catch (_) {}
    try { peer.sinks.stream.destroy(); } catch (_) {}
    this.peers.delete(id);
    this.lastLoud.delete(id);
    this._emit();
  }

  _addSender(peer, track, stream) {
    if (peer.senders.has(track.id)) return peer.senders.get(track.id);
    const sender = peer.pc.addTrack(track, stream);
    peer.senders.set(track.id, sender);
    return sender;
  }

  _removeSender(peer, track) {
    const s = peer.senders.get(track.id);
    if (!s) return;
    try { peer.pc.removeTrack(s); } catch (_) {}
    peer.senders.delete(track.id);
  }

  _addLocalTracks(peer) {
    if (peer.localAdded) return; // evita adicionar duas vezes numa corrida
    peer.localAdded = true;
    if (this.mic) this._addSender(peer, this.mic.track, this.mic.stream);
    if (this.cam) this._addSender(peer, this.cam.track, this.cam.stream);
    if (this.screen) this._addScreenTracks(peer);
  }

  _addScreenTracks(peer) {
    const s = this.screen;
    const vs = this._addSender(peer, s.videoTrack, s.stream);
    this._applyEncoding(vs);
    if (s.appAudio) this._addSender(peer, s.appAudio.track, s.stream);
  }

  _preset() {
    return QUALITY_PRESETS[this.screen?.qualityKey] || QUALITY_PRESETS.media;
  }

  async _applyEncoding(sender) {
    const preset = this._preset();
    try {
      const params = sender.getParameters();
      if (!params.encodings || params.encodings.length === 0) return; // ainda não negociado
      params.encodings[0].maxBitrate = preset.bitrate;
      params.encodings[0].maxFramerate = preset.fps;
      await sender.setParameters(params);
    } catch (_) {}
    try {
      const params = sender.getParameters();
      params.degradationPreference = preset.fps >= 60 ? 'maintain-framerate' : 'maintain-resolution';
      await sender.setParameters(params);
    } catch (_) {}
  }

  // -------------------------------------------------------- ações públicas
  async joinVoice(channelId) {
    if (this.channelId) this.leaveVoice();
    this.channelId = channelId;
    try {
      const raw = await navigator.mediaDevices.getUserMedia({
        audio: this._micConstraints(),
        video: false,
      });
      const pipe = createMicPipeline(raw, this.audio.inputVol);
      this.mic = { pipe, track: pipe.track, stream: pipe.stream };
    } catch (err) {
      this.channelId = null;
      this.onError('Não foi possível acessar o microfone.');
      this._emit();
      throw err;
    }
    this.media = { ...emptyMedia(), micStreamId: this.mic.stream.id };
    this._broadcastMedia(); // antes de entrar: os outros já sabem qual faixa é a voz
    this.socket.emit('voice:join', { channelId });
    this._startSpeakingLoop();
    this._emit();
  }

  leaveVoice() {
    if (!this.channelId) return;
    this.socket.emit('voice:leave');
    this._teardown();
    this._emit();
  }

  _teardown() {
    this.channelId = null;
    this.peers.forEach((p) => {
      clearInterval(p.watchdog);
      try { p.pc.close(); } catch (_) {}
      try { p.sinks.voice.destroy(); } catch (_) {}
      try { p.sinks.stream.destroy(); } catch (_) {}
    });
    this.peers.clear();
    if (this.mic) this.mic.pipe.destroy();
    if (this.cam) this.cam.track.stop();
    this.mic = null;
    this.cam = null;
    this._stopScreenTracks();
    this.media = emptyMedia();
    this.lastLoud.clear();
    this.speakingSet = new Set();
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  toggleMute() {
    if (!this.mic) return;
    this.media.muted = !this.media.muted;
    this.mic.pipe.setMuted(this.media.muted);
    this._broadcastMedia();
    this._emit();
  }

  // ---- Dispositivos e volumes de áudio ----
  _micConstraints() {
    const c = { echoCancellation: true, noiseSuppression: true, autoGainControl: true };
    if (this.audio.inputId && this.audio.inputId !== 'default') c.deviceId = { exact: this.audio.inputId };
    return c;
  }

  async setInputDevice(deviceId) {
    this.audio.inputId = deviceId;
    setAudioPref('inputId', deviceId);
    if (!this.mic) return;
    try {
      const raw = await navigator.mediaDevices.getUserMedia({ audio: this._micConstraints(), video: false });
      const pipe = createMicPipeline(raw, this.audio.inputVol);
      pipe.setMuted(this.media.muted);
      const oldTrack = this.mic.track;
      const old = this.mic.pipe;
      this.mic = { pipe, track: pipe.track, stream: pipe.stream };
      this.peers.forEach((p) => {
        const s = p.senders.get(oldTrack.id);
        if (s) { s.replaceTrack(pipe.track).catch(() => {}); p.senders.delete(oldTrack.id); p.senders.set(pipe.track.id, s); }
      });
      old.destroy();
    } catch (_) {
      this.onError('Não foi possível trocar o microfone.');
    }
  }

  setInputVolume(v) {
    this.audio.inputVol = v;
    setAudioPref('inputVol', v);
    if (this.mic) this.mic.pipe.setInputVolume(v);
  }

  async setOutputDevice(deviceId) {
    this.audio.outputId = deviceId;
    setAudioPref('outputId', deviceId);
    await setOutputDevice(deviceId);
  }

  setOutputVolume(v) {
    this.audio.outputVol = v;
    setAudioPref('outputVol', v);
    setMasterVolume(v);
  }

  getAudioPrefs() { return { ...this.audio }; }

  micLevel() { return this.mic ? this.mic.pipe.level() : 0; }

  async toggleCam() {
    if (!this.channelId) return;
    if (this.cam) {
      const { track } = this.cam;
      this.cam = null;
      this.media.cam = false;
      this.media.camStreamId = null;
      this._broadcastMedia();
      this.peers.forEach((p) => this._removeSender(p, track));
      track.stop();
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
          audio: false,
        });
        const track = stream.getVideoTracks()[0];
        this.cam = { track, stream };
        this.media.cam = true;
        this.media.camStreamId = stream.id;
        this._broadcastMedia();
        this.peers.forEach((p) => { if (p.localAdded) this._addSender(p, track, stream); });
        track.onended = () => {
          if (this.cam && this.cam.track === track) this.toggleCam();
        };
      } catch (err) {
        this.onError('Não foi possível ligar a câmera.');
        return;
      }
    }
    this._emit();
  }

  /**
   * Compartilha tela/janela.
   * opts: { qualityKey: 'baixa'|'media'|'alta', withAudio: boolean }
   */
  async startScreen(sourceId, opts = {}) {
    if (!this.channelId) return null;
    if (this.screen) this.stopScreen();
    const qualityKey = QUALITY_PRESETS[opts.qualityKey] ? opts.qualityKey : 'media';
    const preset = QUALITY_PRESETS[qualityKey];

    let videoTrack;
    try {
      const ok = await window.desktop.selectSource(sourceId);
      if (!ok) throw new Error('fonte inválida');
      const display = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: preset.width },
          height: { ideal: preset.height },
          frameRate: { ideal: preset.fps },
        },
        audio: false, // o som vem do capturador da janela, nunca do sistema
      });
      videoTrack = display.getVideoTracks()[0];
      display.getAudioTracks().forEach((t) => t.stop());
    } catch (err) {
      console.error(err);
      this.onError('Não foi possível compartilhar a tela.');
      return null;
    }
    videoTrack.contentHint = preset.fps >= 60 ? 'motion' : 'detail';

    let appAudio = null;
    if (opts.withAudio) {
      try {
        appAudio = await startAppAudio(sourceId, () => this._onAppAudioEnded());
      } catch (err) {
        this.onError('Transmitindo sem som: ' + err.message);
      }
    }

    const stream = new MediaStream([videoTrack]);
    if (appAudio) stream.addTrack(appAudio.track);

    this.screen = { stream, videoTrack, appAudio, qualityKey };
    this.media.sharing = true;
    this.media.screenStreamId = stream.id;
    this.media.screenHasAudio = !!appAudio;
    this._broadcastMedia(); // antes das faixas: quem recebe já sabe que é transmissão

    this.peers.forEach((p) => { if (p.localAdded) this._addScreenTracks(p); });
    videoTrack.onended = () => this.stopScreen(); // "parar" pela barra do Windows
    this._emit();
    return stream;
  }

  _onAppAudioEnded() {
    if (!this.screen || !this.screen.appAudio) return;
    this.onError('O som da janela parou de ser capturado (o programa foi fechado?).');
    this.media.screenHasAudio = false;
    this._broadcastMedia();
    this._emit();
  }

  stopScreen() {
    if (!this.screen) return;
    const { videoTrack, appAudio } = this.screen;
    this.peers.forEach((p) => {
      this._removeSender(p, videoTrack);
      if (appAudio) this._removeSender(p, appAudio.track);
    });
    this._stopScreenTracks();
    this.media.sharing = false;
    this.media.screenStreamId = null;
    this.media.screenHasAudio = false;
    this._broadcastMedia();
    this._emit();
  }

  _stopScreenTracks() {
    if (!this.screen) return;
    const s = this.screen;
    this.screen = null;
    try { s.videoTrack.onended = null; s.videoTrack.stop(); } catch (_) {}
    try { s.appAudio && s.appAudio.stop(); } catch (_) {}
  }

  /** Volume da VOZ de uma pessoa (só para mim). */
  setVoiceVolume(peerId, v) {
    const peer = this.peers.get(peerId);
    if (!peer) return;
    peer.voiceVolume = v;
    peer.sinks.voice.setVolume(v);
    saveVolume(peer.nick, 'voice', v);
    this._emit();
  }

  /** Volume da TRANSMISSÃO de uma pessoa (som do jogo/janela dela, só para mim). */
  setStreamVolume(peerId, v) {
    const peer = this.peers.get(peerId);
    if (!peer) return;
    peer.streamVolume = v;
    peer.streamMuted = false;
    peer.sinks.stream.setMuted(false);
    peer.sinks.stream.setVolume(v);
    saveVolume(peer.nick, 'stream', v);
    this._emit();
  }

  toggleStreamMute(peerId) {
    const peer = this.peers.get(peerId);
    if (!peer) return;
    peer.streamMuted = !peer.streamMuted;
    peer.sinks.stream.setMuted(peer.streamMuted);
    this._emit();
  }

  _broadcastMedia() {
    this.socket.emit('voice:media', { ...this.media });
  }

  // ------------------------------------------------- quem está falando
  _startSpeakingLoop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => this._tickSpeaking(), 120);
  }

  _tickSpeaking() {
    const now = performance.now();
    const set = new Set();
    const check = (id, level) => {
      if (level > SPEAK_THRESHOLD) this.lastLoud.set(id, now);
      const t = this.lastLoud.get(id);
      if (t && now - t < SPEAK_HOLD_MS) set.add(id);
    };
    if (this.mic && !this.media.muted) check(this.selfId, this.mic.pipe.level());
    this.peers.forEach((p) => {
      if (!p.media.muted) check(p.id, p.sinks.voice.level());
    });
    let changed = set.size !== this.speakingSet.size;
    if (!changed) set.forEach((id) => { if (!this.speakingSet.has(id)) changed = true; });
    if (changed) {
      this.speakingSet = set;
      this._emit();
    }
  }

  // --------------------------------------------------------- estado p/ UI
  _emit() {
    const peers = [];
    this.peers.forEach((p) => {
      const m = p.media || emptyMedia();
      peers.push({
        id: p.id,
        userId: p.userId,
        avatar: p.avatar,
        nick: p.nick,
        media: m,
        voiceVolume: p.voiceVolume,
        streamVolume: p.streamVolume,
        streamMuted: p.streamMuted,
        speaking: this.speakingSet.has(p.id),
        connected: p.pc.connectionState === 'connected',
        camStream: m.cam && m.camStreamId ? p.videoStreams.get(m.camStreamId) || null : null,
        screenStream: m.sharing && m.screenStreamId ? p.videoStreams.get(m.screenStreamId) || null : null,
      });
    });
    this.onChange({
      channelId: this.channelId,
      self: {
        id: this.selfId,
        ...this.media,
        speaking: this.speakingSet.has(this.selfId),
        camStream: this.cam ? this.cam.stream : null,
        screenStream: this.screen ? this.screen.stream : null,
        screenAudioLevel: this.screen && this.screen.appAudio ? this.screen.appAudio.level : null,
      },
      peers,
    });
  }
}
