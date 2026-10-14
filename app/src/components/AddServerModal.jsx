import React, { useState } from 'react';
import { X, LogIn, PlusCircle } from 'lucide-react';
import { DEFAULT_SERVER_URL } from '../config.js';
import { getServers } from '../lib/prefs.js';

export default function AddServerModal({ onClose, onSubmit }) {
  const servers = getServers();
  const lastUrl = servers.length ? servers[servers.length - 1].url : DEFAULT_SERVER_URL;
  const [mode, setMode] = useState('join');
  const [url, setUrl] = useState(lastUrl);
  const [code, setCode] = useState('');
  const [serverName, setServerName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    if (!url.trim()) return;
    if (mode === 'join' && !code.trim()) return;
    if (mode === 'create' && !serverName.trim()) return;
    setBusy(true);
    setError('');
    const res = await onSubmit({
      mode,
      url: url.trim().replace(/\/+$/, ''),
      code: code.trim().toUpperCase(),
      serverName: serverName.trim(),
    });
    setBusy(false);
    if (res && res.ok === false) setError(res.error || 'Não foi possível conectar.');
    else onClose();
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <form className="modal small" onMouseDown={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="modal-head">
          <h2>Adicionar um servidor</h2>
          <button type="button" className="icon-btn" onClick={onClose} title="Fechar"><X size={18} /></button>
        </div>

        <div className="login-tabs">
          <button type="button" className={mode === 'join' ? 'on' : ''} onClick={() => setMode('join')}><LogIn size={16} /> Entrar com código</button>
          <button type="button" className={mode === 'create' ? 'on' : ''} onClick={() => setMode('create')}><PlusCircle size={16} /> Criar servidor</button>
        </div>

        <label className="field-label">Endereço do servidor</label>
        <input className="text-field" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://...onrender.com" />

        {mode === 'join' ? (
          <>
            <label className="field-label">Código de convite</label>
            <input className="text-field" value={code} onChange={(e) => setCode(e.target.value)} placeholder="CORDE-XXXXX" autoFocus />
          </>
        ) : (
          <>
            <label className="field-label">Nome do servidor</label>
            <input className="text-field" value={serverName} onChange={(e) => setServerName(e.target.value)} placeholder="Ex.: Galera do Concorde" maxLength={60} autoFocus />
          </>
        )}

        {error && <div className="login-error">{error}</div>}
        <div className="modal-foot">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn-primary" disabled={busy}>{busy ? 'Conectando…' : mode === 'join' ? 'Entrar' : 'Criar'}</button>
        </div>
      </form>
    </div>
  );
}
