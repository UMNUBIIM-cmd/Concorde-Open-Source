import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Mic, MicOff, Video, VideoOff, MonitorUp, MonitorX, PhoneOff,
  Maximize2, Minimize2, Volume2, VolumeX, Volume1, Users,
} from 'lucide-react';
import Avatar from './Avatar.jsx';

const GAP = 10;
const RATIO = 16 / 9;
const STRIP_H = 118;

/** Maior tamanho de bloco 16:9 que cabe n blocos em W x H. */
function fitGrid(n, W, H) {
  let best = { w: 0, h: 0 };
  if (n === 0 || W <= 0 || H <= 0) return best;
  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols);
    let w = (W - GAP * (cols - 1)) / cols;
    let h = w / RATIO;
    if (h * rows + GAP * (rows - 1) > H) {
      h = (H - GAP * (rows - 1)) / rows;
      w = h * RATIO;
    }
    if (w > best.w) best = { w: Math.floor(w), h: Math.floor(h) };
  }
  return best;
}

export function Vid({ stream, mirror, fit = 'cover' }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (el && el.srcObject !== stream) el.srcObject = stream || null;
  }, [stream]);
  // Sempre mudo: o som vai pelas saídas com volume (voz / transmissão).
  return <video ref={ref} autoPlay playsInline muted className={'vid ' + fit + (mirror ? ' mirror' : '')} />;
}

function LevelBar({ level }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!level) return undefined;
    const t = setInterval(() => setV(level()), 100);
    return () => clearInterval(t);
  }, [level]);
  return (
    <span className="lvl" title="Nível do som da transmissão">
      <i style={{ width: Math.min(100, Math.round(v * 160)) + '%' }} />
    </span>
  );
}

export function VolumeSlider({ value, onChange, muted, onToggleMute, label }) {
  const Icon = muted || value === 0 ? VolumeX : value < 0.5 ? Volume1 : Volume2;
  return (
    <div className="vslider" onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
      <button type="button" className="vs-btn" title={muted ? 'Ativar som' : 'Silenciar'} onClick={onToggleMute}>
        <Icon size={16} />
      </button>
      {label && <span className="vs-label">{label}</span>}
      <input
        type="range" min="0" max="2" step="0.01"
        value={muted ? 0 : value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
      <span className="vs-pct">{muted ? 0 : Math.round(value * 100)}%</span>
    </div>
  );
}

function Tile({ t, width, height, focused, onFocus, engine, small }) {
  const ref = useRef(null);
  const [full, setFull] = useState(false);

  useEffect(() => {
    const on = () => setFull(document.fullscreenElement === ref.current);
    document.addEventListener('fullscreenchange', on);
    return () => document.removeEventListener('fullscreenchange', on);
  }, []);

  function toggleFull(e) {
    e.stopPropagation();
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else ref.current?.requestFullscreen().catch(() => {});
  }

  const avatarSize = Math.max(34, Math.min(110, Math.round(Math.min(width, height) * 0.34)));
  const cls = ['tile', t.kind, t.speaking ? 'speaking' : '', focused ? 'focused' : '', small ? 'small' : ''].join(' ');

  return (
    <div ref={ref} className={cls} style={{ width, height }} onClick={onFocus} title={focused ? 'Clique para sair do foco' : 'Clique para focar'}>
      {t.kind === 'user' ? (
        t.cam ? <Vid stream={t.cam} mirror={t.self} fit="cover" /> : <div className="tile-avatar"><Avatar nick={t.nick} src={t.avatarSrc} size={avatarSize} speaking={t.speaking} /></div>
      ) : t.stream ? (
        <Vid stream={t.stream} fit="contain" />
      ) : (
        <div className="tile-wait">Carregando a transmissão de {t.nick}…</div>
      )}

      {t.kind === 'screen' && <span className="live-badge">AO VIVO</span>}
      {t.kind === 'user' && !t.self && !t.connected && <span className="conn-badge">conectando…</span>}

      <div className="tile-name">
        {t.kind === 'user' && t.muted && <MicOff size={14} className="red" />}
        {t.kind === 'screen' && <MonitorUp size={14} />}
        <span>{t.label}</span>
        {t.kind === 'screen' && t.self && (t.hasAudio ? <LevelBar level={t.level} /> : <em>sem som</em>)}
      </div>

      {!small && (
        <div className="tile-tools">
          {t.kind === 'screen' && !t.self && t.hasAudio && (
            <VolumeSlider
              value={t.streamVolume}
              muted={t.streamMuted}
              onChange={(v) => engine.setStreamVolume(t.peerId, v)}
              onToggleMute={() => engine.toggleStreamMute(t.peerId)}
            />
          )}
          {t.kind === 'user' && !t.self && (
            <VolumeSlider
              value={t.voiceVolume}
              muted={t.voiceVolume === 0}
              onChange={(v) => engine.setVoiceVolume(t.peerId, v)}
              onToggleMute={() => engine.setVoiceVolume(t.peerId, t.voiceVolume === 0 ? 1 : 0)}
            />
          )}
          {(t.kind === 'screen' || t.cam) && (
            <button className="tool-btn" title={full ? 'Sair da tela cheia' : 'Tela cheia'} onClick={toggleFull}>
              {full ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function VoiceView({ voiceState, channel, selfNick, selfAvatar, avatarByUser = {}, engine, onOpenPicker, onLeave, onJoin }) {
  const av = (userId, fallback) => (userId && avatarByUser[userId] !== undefined ? avatarByUser[userId] : fallback);
  const stageRef = useRef(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [focus, setFocus] = useState(null);
  const knownScreens = useRef(new Set());
  const connectedHere = !!voiceState && voiceState.channelId === channel.id;

  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([entry]) => {
      const r = entry.contentRect;
      setSize({ w: Math.floor(r.width), h: Math.floor(r.height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [channel.id, connectedHere]);

  const tiles = useMemo(() => {
    if (!connectedHere) return [];
    const s = voiceState.self;
    const list = [];
    // Transmissões primeiro (é o que a galera quer ver).
    voiceState.peers.forEach((p) => {
      if (p.media.sharing) {
        list.push({
          key: 's:' + p.id, kind: 'screen', peerId: p.id, nick: p.nick, label: p.nick,
          stream: p.screenStream, hasAudio: p.media.screenHasAudio,
          streamVolume: p.streamVolume, streamMuted: p.streamMuted,
        });
      }
    });
    if (s.sharing) {
      list.push({ key: 's:self', kind: 'screen', self: true, nick: selfNick, label: 'Sua transmissão', stream: s.screenStream, hasAudio: s.screenHasAudio, level: s.screenAudioLevel });
    }
    list.push({ key: 'u:self', kind: 'user', self: true, nick: selfNick, label: selfNick, avatarSrc: selfAvatar, cam: s.camStream, muted: s.muted, speaking: s.speaking, connected: true });
    voiceState.peers.forEach((p) => {
      list.push({
        key: 'u:' + p.id, kind: 'user', peerId: p.id, nick: p.nick, label: p.nick,
        avatarSrc: av(p.userId, p.avatar),
        cam: p.camStream, muted: p.media.muted, speaking: p.speaking, connected: p.connected,
        voiceVolume: p.voiceVolume,
      });
    });
    return list;
  }, [connectedHere, voiceState, selfNick, selfAvatar, avatarByUser]);

  // Foco: some se o bloco sumir; foca automaticamente uma transmissão nova de outra pessoa.
  useEffect(() => {
    const keys = new Set(tiles.map((t) => t.key));
    if (focus && !keys.has(focus)) setFocus(null);
    const remoteScreens = tiles.filter((t) => t.kind === 'screen' && !t.self).map((t) => t.key);
    const fresh = remoteScreens.find((k) => !knownScreens.current.has(k));
    knownScreens.current = new Set(remoteScreens);
    if (fresh && (!focus || !keys.has(focus))) setFocus(fresh);
  }, [tiles]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!connectedHere) {
    return (
      <div className="voice-view">
        <div className="vv-head"><Volume2 size={20} /> <b>{channel.name}</b></div>
        <div className="vv-empty">
          <Volume2 size={40} />
          <p>Você não está nesta sala.</p>
          <button className="btn-primary" onClick={onJoin}>Entrar na sala</button>
        </div>
      </div>
    );
  }

  const s = voiceState.self;
  const focused = focus ? tiles.find((t) => t.key === focus) : null;
  const others = focused ? tiles.filter((t) => t.key !== focus) : tiles;

  let body;
  if (focused) {
    const mainH = Math.max(0, size.h - (others.length ? STRIP_H + GAP : 0));
    const fw = Math.min(size.w, mainH * RATIO);
    const fh = fw / RATIO;
    body = (
      <div className="stage-focus">
        <div className="focus-main" style={{ height: mainH }}>
          <Tile t={focused} width={Math.floor(fw)} height={Math.floor(fh)} focused onFocus={() => setFocus(null)} engine={engine} />
        </div>
        {others.length > 0 && (
          <div className="focus-strip" style={{ height: STRIP_H }}>
            {others.map((t) => (
              <Tile key={t.key} t={t} width={Math.floor(STRIP_H * RATIO)} height={STRIP_H} small onFocus={() => setFocus(t.key)} engine={engine} />
            ))}
          </div>
        )}
      </div>
    );
  } else {
    const { w, h } = fitGrid(tiles.length, size.w, size.h);
    body = (
      <div className="stage-grid">
        {tiles.map((t) => (
          <Tile key={t.key} t={t} width={w} height={h} onFocus={() => setFocus(t.key)} engine={engine} />
        ))}
      </div>
    );
  }

  return (
    <div className="voice-view">
      <div className="vv-head">
        <Volume2 size={20} /> <b>{channel.name}</b>
        <span className="vv-count"><Users size={14} /> {voiceState.peers.length + 1}</span>
        <span className="vv-hint">Clique em um bloco para focar • passe o mouse para ajustar o volume</span>
      </div>

      <div className="stage" ref={stageRef}>{size.w > 0 && body}</div>

      <div className="call-bar">
        <button className={'cb-btn' + (s.muted ? ' danger' : '')} title={s.muted ? 'Desmutar microfone' : 'Mutar microfone'} onClick={() => engine.toggleMute()}>
          {s.muted ? <MicOff size={22} /> : <Mic size={22} />}
        </button>
        <button className={'cb-btn' + (s.cam ? ' active' : '')} title={s.cam ? 'Desligar câmera' : 'Ligar câmera'} onClick={() => engine.toggleCam()}>
          {s.cam ? <Video size={22} /> : <VideoOff size={22} />}
        </button>
        {s.sharing ? (
          <button className="cb-btn active" title="Parar transmissão" onClick={() => engine.stopScreen()}>
            <MonitorX size={22} />
          </button>
        ) : (
          <button className="cb-btn" title="Transmitir tela ou janela" onClick={onOpenPicker}>
            <MonitorUp size={22} />
          </button>
        )}
        <button className="cb-btn hangup" title="Sair da chamada" onClick={onLeave}>
          <PhoneOff size={22} />
        </button>
      </div>
    </div>
  );
}
