import React, { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { GIPHY_API_KEY } from '../config.js';

const BASE = 'https://api.giphy.com/v1/gifs';

export default function GifPicker({ onClose, onPick }) {
  const [q, setQ] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const timer = useRef(null);

  async function load(query) {
    setLoading(true);
    setError('');
    try {
      const endpoint = query
        ? `${BASE}/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=24&rating=pg-13&bundle=messaging_non_clips`
        : `${BASE}/trending?api_key=${GIPHY_API_KEY}&limit=24&rating=pg-13&bundle=messaging_non_clips`;
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error('giphy ' + res.status);
      const json = await res.json();
      setItems((json.data || []).map((g) => ({
        id: g.id,
        preview: (g.images.fixed_width_small || g.images.fixed_width).url,
        full: (g.images.fixed_height || g.images.original).url,
        title: g.title || 'gif',
      })));
    } catch (_) {
      setError('Não foi possível buscar GIFs. Verifique sua internet ou a chave do Giphy em config.js.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(''); }, []);

  function onType(v) {
    setQ(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => load(v.trim()), 400);
  }

  return (
    <div className="gif-pop" onMouseDown={(e) => e.stopPropagation()}>
      <div className="gif-head">
        <div className="gif-search">
          <Search size={15} />
          <input autoFocus value={q} onChange={(e) => onType(e.target.value)} placeholder="Buscar GIFs no Giphy" />
        </div>
        <button className="icon-btn" onClick={onClose} title="Fechar"><X size={16} /></button>
      </div>
      {loading ? (
        <div className="gif-msg">Carregando…</div>
      ) : error ? (
        <div className="gif-msg err">{error}</div>
      ) : items.length === 0 ? (
        <div className="gif-msg">Nada encontrado.</div>
      ) : (
        <div className="gif-grid">
          {items.map((g) => (
            <button key={g.id} className="gif-cell" onClick={() => { onPick(g.full); onClose(); }} title={g.title}>
              <img src={g.preview} alt={g.title} loading="lazy" />
            </button>
          ))}
        </div>
      )}
      <div className="gif-foot">Powered by GIPHY</div>
    </div>
  );
}
