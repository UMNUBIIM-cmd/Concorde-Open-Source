import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Hash, Volume2, Mic, MicOff, MonitorUp, MonitorX, PhoneOff, Plus, Settings,
  Copy, Users, Signal, Video, Wifi,
} from 'lucide-react';
import Login from './components/Login.jsx';
import Avatar from './components/Avatar.jsx';
import ServerRail from './components/ServerRail.jsx';
import ScreenPicker from './components/ScreenPicker.jsx';
import ChannelModal from './components/ChannelModal.jsx';
import AddServerModal from './components/AddServerModal.jsx';
import ServerSettingsModal from './components/ServerSettingsModal.jsx';
import SettingsModal from './components/Settings.jsx';
import MiniPlayer from './components/MiniPlayer.jsx';
import Members from './components/Members.jsx';
import VoiceView, { VolumeSlider } from './components/VoiceView.jsx';
import TextView from './components/TextView.jsx';
import { connectSocket } from './lib/socket.js';
import { VoiceEngine } from './lib/rtc.js';
import {
  getUserId, getNick, setNick as saveNick, getAvatar, setAvatar as saveAvatar,
  getServers, upsertServer, removeServer, getActiveServerId, setActiveServerId,
} from './lib/prefs.js';

function emitAck(socket, event, payload) {
  return new Promise((resolve) => {
    let done = false;
    const t = setTimeout(() => { if (!done) { done = true; resolve({ ok: false, error: 'Sem resposta do servidor.' }); } }, 12000);
    socket.emit(event, payload, (res) => { if (done) return; done = true; clearTimeout(t); resolve(res); });
  });
}
function waitInit(socket) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), 15000);
    socket.once('init', ({ id }) => { clearTimeout(t); resolve(id); });
    socket.once('connect_error', () => { clearTimeout(t); reject(new Error('connect_error')); });
  });
}

export default function App() {
  const userId = useMemo(getUserId, []);
  const [selfNick, setSelfNick] = useState(getNick());
  const [selfAvatar, setSelfAvatar] = useState(getAvatar());

  const [servers, setServers] = useState(getServers());
  const [activeId, setActiveId] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [phase, setPhase] = useState(getServers().length ? 'app' : 'login');

  const [guild, setGuild] = useState(null);
  const [selfId, setSelfId] = useState(null);
  const [members, setMembers] = useState([]);
  const [messages, setMessages] = useState({});
  const [voiceMap, setVoiceMap] = useState({});
  const [player, setPlayer] = useState(null);
  const [ping, setPing] = useState(null);

  const [view, setView] = useState(null);
  const [voiceState, setVoiceState] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [channelModal, setChannelModal] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [srvSettingsOpen, setSrvSettingsOpen] = useState(false);
  const [expandedUser, setExpandedUser] = useState(null);
  const [appAudioAvailable, setAppAudioAvailable] = useState(false);

  const socketRef = useRef(null);
  const engineRef = useRef(null);
  const toastTimer = useRef(null);
  const pingTimer = useRef(null);
  const activeCodeRef = useRef(null);
  const activeUrlRef = useRef(null);
  const [toast, setToast] = useState('');

  const showToast = useCallback((m) => {
    setToast(m);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 5000);
  }, []);

  const activeVoice = voiceState?.channelId || null;
  const avatarByUser = useMemo(() => {
    const map = {};
    members.forEach((m) => { map[m.userId] = m.avatar || null; });
    map[userId] = selfAvatar || null;
    return map;
  }, [members, selfAvatar, userId]);

  // --------------------------------------------------------- teardown
  const teardown = useCallback(() => {
    clearInterval(pingTimer.current);
    try { engineRef.current && engineRef.current.destroy(); } catch (_) {}
    try { socketRef.current && socketRef.current.removeAllListeners && socketRef.current.removeAllListeners(); } catch (_) {}
    try { socketRef.current && socketRef.current.close(); } catch (_) {}
    engineRef.current = null;
    socketRef.current = null;
    setVoiceState(null);
    setPing(null);
  }, []);

  // --------------------------------------------- aplica estado do servidor
  function applyJoin(socket, res, id) {
    setSelfId(id);
    setGuild(res.guild);
    setMessages(res.history || {});
    setVoiceMap(res.voiceState || {});
    setMembers(res.members || []);
    setPlayer(res.player || null);
    const firstText = res.guild.channels.find((c) => c.type === 'text');
    setView((v) => (v && res.guild.channels.some((c) => c.id === v.id) ? v : (firstText ? { type: 'text', id: firstText.id } : null)));
    engineRef.current = new VoiceEngine(socket, id, (st) => setVoiceState(st), (err) => showToast(err));
    if (window.desktop?.appAudioAvailable) window.desktop.appAudioAvailable().then(setAppAudioAvailable).catch(() => {});
  }

  function bindHandlers(socket, url) {
    socket.on('members', (list) => setMembers(list || []));
    socket.on('message:new', (msg) => setMessages((p) => ({ ...p, [msg.channelId]: [...(p[msg.channelId] || []), msg] })));
    socket.on('channels', (channels) => setGuild((g) => (g ? { ...g, channels } : g)));
    socket.on('voice:state', (map) => setVoiceMap(map || {}));
    socket.on('player:state', (p) => setPlayer(p || null));
    socket.on('guild:info', ({ code, name, icon }) => {
      setGuild((g) => (g && g.code === code ? { ...g, name, icon } : g));
      setServers(() => {
        const list = getServers().map((s) => (s.url === url && s.code === code ? { ...s, name, icon } : s));
        return list;
      });
    });
    socket.on('disconnect', (reason) => {
      if (reason !== 'io client disconnect') showToast('Conexão caiu. Tentando reconectar…');
    });
    // Reconexão: servidor dá id novo, reentra sozinho.
    socket.on('connect', async () => {
      if (!activeCodeRef.current) return;
      try { engineRef.current && engineRef.current.destroy(); } catch (_) {}
      engineRef.current = null;
      setVoiceState(null);
      const res = await emitAck(socket, 'guild:join', { code: activeCodeRef.current, userId, nick: selfNick, avatar: selfAvatar });
      if (res && res.ok) { applyJoin(socket, res, socket.id); showToast('Reconectado.'); }
    });
  }

  function startPing(socket) {
    clearInterval(pingTimer.current);
    const beat = () => {
      const t0 = performance.now();
      socket.timeout(5000).emit('net:ping', t0, (err) => {
        if (!err) setPing(Math.round(performance.now() - t0));
      });
    };
    beat();
    pingTimer.current = setInterval(beat, 4000);
  }

  // ------------------------------------------------------- abrir servidor
  async function openServer({ url, code, mode = 'join', serverName, select = true, nick, avatar }) {
    const theNick = nick != null ? nick : selfNick;
    const theAvatar = avatar !== undefined ? avatar : selfAvatar;
    teardown();
    setConnecting(true);
    activeCodeRef.current = null;
    activeUrlRef.current = url;
    const socket = connectSocket(url);
    socketRef.current = socket;
    let id;
    try { id = await waitInit(socket); } catch (_) {
      setConnecting(false);
      try { socket.close(); } catch (__) {}
      return { ok: false, error: 'Não foi possível conectar. Confira o endereço (servidor grátis pode estar acordando — tente de novo em 1 min).' };
    }
    const payload = { userId, nick: theNick, avatar: theAvatar };
    const res = await emitAck(socket, mode === 'create' ? 'guild:create' : 'guild:join',
      mode === 'create' ? { ...payload, name: serverName } : { ...payload, code });
    setConnecting(false);
    if (!res || !res.ok) { try { socket.close(); } catch (_) {} return res || { ok: false, error: 'Sem resposta.' }; }

    const entry = { id: 'srv_' + res.guild.code, url, code: res.guild.code, name: res.guild.name, icon: res.guild.icon };
    const list = upsertServer(entry);
    setServers(list);
    activeCodeRef.current = res.guild.code;
    if (select) { setActiveId(entry.id); setActiveServerId(entry.id); }
    setPhase('app');
    bindHandlers(socket, url);
    applyJoin(socket, res, id);
    startPing(socket);
    return { ok: true };
  }

  // Primeira conexão automática (já tem servidores salvos).
  useEffect(() => {
    const list = getServers();
    if (list.length === 0) { setPhase('login'); return; }
    const wantId = getActiveServerId();
    const srv = list.find((s) => s.id === wantId) || list[0];
    openServer({ url: srv.url, code: srv.code });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --------------------------------------------------------- ações
  function switchServer(id) {
    if (id === activeId) return;
    const srv = servers.find((s) => s.id === id);
    if (!srv) return;
    setActiveId(id);
    setActiveServerId(id);
    setGuild(null);
    setMembers([]);
    setMessages({});
    setVoiceMap({});
    setPlayer(null);
    openServer({ url: srv.url, code: srv.code });
  }

  async function onAddServer({ mode, url, code, serverName }) {
    return openServer({ url, code, mode, serverName });
  }

  function leaveServer() {
    const id = activeId;
    const list = removeServer(id);
    setServers(list);
    setSrvSettingsOpen(false);
    teardown();
    activeCodeRef.current = null;
    if (list.length === 0) {
      setActiveId(null); setActiveServerId(null); setGuild(null); setPhase('login');
    } else {
      const next = list[0];
      setActiveId(next.id); setActiveServerId(next.id);
      openServer({ url: next.url, code: next.code });
    }
  }

  async function saveProfile(nick, avatar) {
    setSelfNick(nick); saveNick(nick);
    setSelfAvatar(avatar); saveAvatar(avatar);
    if (socketRef.current) {
      const res = await emitAck(socketRef.current, 'profile:update', { nick, avatar });
      return res;
    }
    return { ok: true };
  }
  async function saveGuild(name, icon) {
    if (!socketRef.current) return { ok: false, error: 'Sem conexão.' };
    return emitAck(socketRef.current, 'guild:update', { name, icon });
  }

  async function openVoice(channelId) {
    setView({ type: 'voice', id: channelId });
    if (activeVoice === channelId || !engineRef.current) return;
    try { await engineRef.current.joinVoice(channelId); } catch (_) {}
  }
  const leaveVoice = () => engineRef.current && engineRef.current.leaveVoice();
  function onShare({ sourceId, qualityKey, withAudio }) {
    setPickerOpen(false);
    engineRef.current && engineRef.current.startScreen(sourceId, { qualityKey, withAudio });
  }
  const createChannel = (name, type) => emitAck(socketRef.current, 'channel:create', { name, type });
  const renameChannel = (channelId, name) => emitAck(socketRef.current, 'channel:rename', { channelId, name });
  const deleteChannel = (channelId) => emitAck(socketRef.current, 'channel:delete', { channelId });
  const playerSet = (videoId, title) => socketRef.current && socketRef.current.emit('player:set', { videoId, title });
  const playerControl = (action, time) => socketRef.current && socketRef.current.emit('player:control', { action, time });

  // Se o canal aberto some, volta pro primeiro de texto.
  useEffect(() => {
    if (!guild || !view) return;
    if (!guild.channels.some((c) => c.id === view.id)) {
      const first = guild.channels.find((c) => c.type === 'text');
      setView(first ? { type: 'text', id: first.id } : null);
    }
  }, [guild, view]);

  useEffect(() => () => teardown(), [teardown]);

  // ---------------------------------------------------------------- UI
  if (phase === 'login') {
    return (
      <>
        <Login
          busy={connecting}
          onConnect={async ({ url, nick, mode, code, serverName }) => {
            setSelfNick(nick); saveNick(nick);
            return openServer({ url, code, mode, serverName, nick });
          }}
        />
        {toast && <div className="toast">{toast}</div>}
      </>
    );
  }

  const rail = (
    <ServerRail
      servers={servers}
      activeId={activeId}
      connecting={connecting}
      onSelect={switchServer}
      onAdd={() => setAddOpen(true)}
      onOpenSettings={() => setSettingsOpen(true)}
    />
  );

  const modals = (
    <>
      {pickerOpen && <ScreenPicker onClose={() => setPickerOpen(false)} onShare={onShare} appAudioAvailable={appAudioAvailable} />}
      {channelModal && (
        <ChannelModal state={channelModal} onClose={() => setChannelModal(null)}
          onCreate={createChannel} onRename={renameChannel} onDelete={deleteChannel} />
      )}
      {addOpen && <AddServerModal onClose={() => setAddOpen(false)} onSubmit={onAddServer} />}
      {settingsOpen && (
        <SettingsModal engine={engineRef.current} nick={selfNick} avatar={selfAvatar}
          onSaveProfile={saveProfile} onClose={() => setSettingsOpen(false)} />
      )}
      {srvSettingsOpen && guild && (
        <ServerSettingsModal guild={guild} onClose={() => setSrvSettingsOpen(false)}
          onSave={saveGuild} onLeave={leaveServer} onToast={showToast} />
      )}
      {toast && <div className="toast">{toast}</div>}
    </>
  );

  if (!guild) {
    return (
      <div className="app">
        {rail}
        <div className="channel-col"><div className="guild-head">Concorde</div><div className="connecting">Conectando ao servidor…</div></div>
        <main className="main" />
        {modals}
      </div>
    );
  }

  const textChannels = guild.channels.filter((c) => c.type === 'text');
  const voiceChannels = guild.channels.filter((c) => c.type === 'voice');
  const viewChannel = view ? guild.channels.find((c) => c.id === view.id) : null;
  const activeVoiceChannel = activeVoice ? guild.channels.find((c) => c.id === activeVoice) : null;
  const self = voiceState?.self;
  const livePeers = new Map((voiceState?.peers || []).map((p) => [p.id, p]));
  const pingClass = ping == null ? '' : ping < 80 ? 'good' : ping < 180 ? 'ok' : 'bad';

  return (
    <div className={'app' + (view?.type === 'voice' ? ' in-voice-view' : '')}>
      {rail}

      <aside className="channel-col">
        <button className="guild-head btn" title="Configurações do servidor" onClick={() => setSrvSettingsOpen(true)}>
          {guild.icon && <img className="gh-icon" src={guild.icon} alt="" />}
          <span className="gh-name">{guild.name}</span>
          <Settings size={16} className="gh-gear" />
        </button>

        <div className="channel-scroll">
          <button className="invite" title="Copiar código de convite"
            onClick={() => { navigator.clipboard?.writeText(guild.code); showToast('Código copiado: ' + guild.code); }}>
            <span><small>Convite</small>{guild.code}</span><Copy size={14} />
          </button>

          <div className="chan-group">
            <span>Canais de texto</span>
            <button className="cat-add" title="Criar canal de texto" onClick={() => setChannelModal({ mode: 'create', type: 'text' })}><Plus size={16} /></button>
          </div>
          {textChannels.map((c) => (
            <div key={c.id} className={'chan' + (view?.type === 'text' && view.id === c.id ? ' on' : '')} onClick={() => setView({ type: 'text', id: c.id })}>
              <Hash size={18} className="chan-ic" />
              <span className="chan-name">{c.name}</span>
              <button className="chan-gear" title="Editar canal" onClick={(e) => { e.stopPropagation(); setChannelModal({ mode: 'edit', channel: c }); }}><Settings size={14} /></button>
            </div>
          ))}

          <div className="chan-group">
            <span>Canais de voz</span>
            <button className="cat-add" title="Criar canal de voz" onClick={() => setChannelModal({ mode: 'create', type: 'voice' })}><Plus size={16} /></button>
          </div>
          {voiceChannels.map((c) => {
            const inside = voiceMap[c.id] || [];
            const mine = activeVoice === c.id;
            return (
              <div key={c.id}>
                <div className={'chan' + (view?.type === 'voice' && view.id === c.id ? ' on' : '')} onClick={() => openVoice(c.id)}>
                  <Volume2 size={18} className="chan-ic" />
                  <span className="chan-name">{c.name}</span>
                  <button className="chan-gear" title="Editar canal" onClick={(e) => { e.stopPropagation(); setChannelModal({ mode: 'edit', channel: c }); }}><Settings size={14} /></button>
                </div>
                {inside.length > 0 && (
                  <div className="voice-users">
                    {inside.map((u) => {
                      const isMe = u.id === selfId;
                      const live = mine ? (isMe ? self : livePeers.get(u.id)) : null;
                      const speaking = !!live?.speaking;
                      const media = isMe && self ? self : u.media || {};
                      const canAdjust = mine && !isMe && !!livePeers.get(u.id);
                      const open = expandedUser === u.id && canAdjust;
                      return (
                        <div key={u.id}>
                          <div className={'voice-user' + (canAdjust ? ' clickable' : '') + (open ? ' open' : '')}
                            onClick={() => canAdjust && setExpandedUser(open ? null : u.id)}
                            title={canAdjust ? 'Ajustar volume' : undefined}>
                            <Avatar nick={u.nick} src={isMe ? selfAvatar : (avatarByUser[u.userId] ?? u.avatar)} size={22} speaking={speaking} />
                            <span className="vu-name">{u.nick}{isMe ? ' (você)' : ''}</span>
                            {media.sharing && <span className="vu-live">AO VIVO</span>}
                            {media.cam && <Video size={13} />}
                            {media.muted && <MicOff size={13} className="red" />}
                          </div>
                          {open && (() => {
                            const p = livePeers.get(u.id);
                            return (
                              <div className="vu-panel">
                                <VolumeSlider label="Voz" value={p.voiceVolume} muted={p.voiceVolume === 0}
                                  onChange={(v) => engineRef.current.setVoiceVolume(p.id, v)}
                                  onToggleMute={() => engineRef.current.setVoiceVolume(p.id, p.voiceVolume === 0 ? 1 : 0)} />
                                {p.media.sharing && p.media.screenHasAudio && (
                                  <VolumeSlider label="Transmissão" value={p.streamVolume} muted={p.streamMuted}
                                    onChange={(v) => engineRef.current.setStreamVolume(p.id, v)}
                                    onToggleMute={() => engineRef.current.toggleStreamMute(p.id)} />
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          <MiniPlayer player={player} onSet={playerSet} onControl={playerControl} />
        </div>

        {activeVoiceChannel && self && (
          <div className="voice-panel">
            <div className="vp-info" onClick={() => setView({ type: 'voice', id: activeVoiceChannel.id })} title="Abrir a sala">
              <span className="vp-status">
                <Wifi size={14} className={'ping ' + pingClass} />
                {ping == null ? 'Voz conectada' : ping + ' ms'}
              </span>
              <span className="vp-chan">{activeVoiceChannel.name}</span>
            </div>
            {self.sharing
              ? <button className="vp-btn active" title="Parar transmissão" onClick={() => engineRef.current.stopScreen()}><MonitorX size={18} /></button>
              : <button className="vp-btn" title="Transmitir tela" onClick={() => setPickerOpen(true)}><MonitorUp size={18} /></button>}
            <button className="vp-btn hang" title="Sair da chamada" onClick={leaveVoice}><PhoneOff size={18} /></button>
          </div>
        )}

        <div className="user-bar">
          <Avatar nick={selfNick} src={selfAvatar} size={32} speaking={!!self?.speaking} />
          <div className="ub-name">
            <b>{selfNick}</b>
            <span>
              {activeVoiceChannel
                ? 'em chamada'
                : (ping == null ? 'online' : <><Wifi size={11} className={'ping ' + pingClass} /> {ping} ms</>)}
            </span>
          </div>
          <button className="ub-btn" title="Configurações" onClick={() => setSettingsOpen(true)}><Settings size={18} /></button>
          {self && activeVoiceChannel && (
            <button className={'ub-btn' + (self.muted ? ' red' : '')} title={self.muted ? 'Desmutar' : 'Mutar'} onClick={() => engineRef.current.toggleMute()}>
              {self.muted ? <MicOff size={18} /> : <Mic size={18} />}
            </button>
          )}
        </div>
      </aside>

      <main className="main">
        {view?.type === 'voice' && viewChannel ? (
          <VoiceView voiceState={voiceState} channel={viewChannel} selfNick={selfNick} selfAvatar={selfAvatar}
            avatarByUser={avatarByUser} engine={engineRef.current}
            onOpenPicker={() => setPickerOpen(true)} onLeave={leaveVoice} onJoin={() => openVoice(viewChannel.id)} />
        ) : (
          <TextView channel={viewChannel} messages={(viewChannel && messages[viewChannel.id]) || []}
            onSend={(text, image, gif) => socketRef.current.emit('message:send', { channelId: viewChannel.id, text, image, gif })}
            onError={showToast} />
        )}
      </main>

      {view?.type !== 'voice' && <Members members={members} selfUserId={userId} />}

      {modals}
    </div>
  );
}
