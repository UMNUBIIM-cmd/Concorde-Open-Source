import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, Square, Youtube, Plus, Volume2 } from 'lucide-react';

/** Extrai o ID de 11 chars de um link do YouTube (ou aceita o ID puro). */
export function parseYouTubeId(input) {
  if (!input) return null;
  const s = input.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  const m = s.match(/(?:youtu\.be\/|v=|\/embed\/|\/shorts\/|\/v\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

let apiLoading = null;
function loadYouTubeApi() {
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
  if (apiLoading) return apiLoading;
  apiLoading = new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { if (prev) try { prev(); } catch (_) {} resolve(window.YT); };
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
  });
  return apiLoading;
}

export default function MiniPlayer({ player, onSet, onControl }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [vol, setVol] = useState(() => parseInt(localStorage.getItem('concorde:ytvol') || '70', 10));
  const hostRef = useRef(null);
  const ytRef = useRef(null);
  const readyRef = useRef(false);
  const pendingRef = useRef(null);
  const lastVideo = useRef(null);

  const active = !!player;

  // Cria o player do YouTube quando aparece a primeira música.
  useEffect(() => {
    if (!active) return undefined;
    let cancelled = false;
    loadYouTubeApi().then((YT) => {
      if (cancelled || !hostRef.current || ytRef.current) { if (ytRef.current && pendingRef.current) sync(pendingRef.current); return; }
      ytRef.current = new YT.Player(hostRef.current, {
        height: '100%', width: '100%',
        playerVars: { autoplay: 1, controls: 1, rel: 0, modestbranding: 1, playsinline: 1 },
        events: {
          onReady: () => {
            readyRef.current = true;
            try { ytRef.current.setVolume(vol); } catch (_) {}
            if (pendingRef.current) sync(pendingRef.current);
          },
        },
      });
    });
    return () => { cancelled = true; };
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  // Aplica o estado vindo do servidor (tocar junto, sincronizado).
  function sync(p) {
    const yt = ytRef.current;
    if (!yt || !readyRef.current || !p) return;
    const target = p.playing ? p.time + (Date.now() - p.at) / 1000 : p.time;
    try {
      if (lastVideo.current !== p.videoId) {
        lastVideo.current = p.videoId;
        yt.loadVideoById({ videoId: p.videoId, startSeconds: Math.max(0, target) });
        if (!p.playing) setTimeout(() => { try { yt.pauseVideo(); } catch (_) {} }, 300);
        return;
      }
      const cur = yt.getCurrentTime ? yt.getCurrentTime() : 0;
      if (Math.abs(cur - target) > 1.5) yt.seekTo(Math.max(0, target), true);
      const state = yt.getPlayerState ? yt.getPlayerState() : -1;
      if (p.playing && state !== 1) yt.playVideo();
      if (!p.playing && state === 1) yt.pauseVideo();
    } catch (_) {}
  }

  useEffect(() => {
    pendingRef.current = player;
    if (player) sync(player);
    else { lastVideo.current = null; try { ytRef.current && ytRef.current.stopVideo(); } catch (_) {} }
  }); // roda a cada atualização do estado

  function setVolume(v) {
    setVol(v);
    localStorage.setItem('concorde:ytvol', String(v));
    try { ytRef.current && ytRef.current.setVolume(v); } catch (_) {}
  }

  function submitUrl(e) {
    e.preventDefault();
    const id = parseYouTubeId(url);
    if (!id) return;
    onSet(id, '');
    setUrl('');
    setOpen(true);
  }

  if (!active && !open) {
    return (
      <button className="mp-launch" onClick={() => setOpen(true)} title="Tocar música/vídeo do YouTube juntos">
        <Youtube size={16} /> Tocar junto
      </button>
    );
  }

  return (
    <div className="mini-player">
      <div className="mp-head">
        <Youtube size={15} />
        <span className="mp-title">{player ? (player.title || 'Tocando agora') : 'Tocar junto'}</span>
        {!active && <button className="mp-x" onClick={() => setOpen(false)} title="Fechar">×</button>}
      </div>

      <div className={'mp-video' + (active ? '' : ' hidden')}><div ref={hostRef} /></div>

      <form className="mp-add" onSubmit={submitUrl}>
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Cole um link do YouTube" />
        <button type="submit" title="Tocar para todos"><Plus size={16} /></button>
      </form>

      {active && (
        <>
          <div className="mp-controls">
            {player.playing
              ? <button onClick={() => onControl('pause')} title="Pausar (para todos)"><Pause size={16} /></button>
              : <button onClick={() => onControl('play')} title="Tocar (para todos)"><Play size={16} /></button>}
            <button onClick={() => onControl('stop')} title="Parar (para todos)"><Square size={15} /></button>
            <div className="mp-vol" title="Seu volume (só para você)">
              <Volume2 size={14} />
              <input type="range" min="0" max="100" value={vol} onChange={(e) => setVolume(parseInt(e.target.value, 10))} />
            </div>
          </div>
          <div className="mp-hint">Tocando junto — todos ouvem sincronizado</div>
        </>
      )}
    </div>
  );
}
