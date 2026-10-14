import React, { useState } from 'react';
import { LogIn, PlusCircle } from 'lucide-react';
import Logo from './Logo.jsx';
import { DEFAULT_SERVER_URL } from '../config.js';
import { getNick } from '../lib/prefs.js';

export default function Login({ onConnect }) {
  const [nick, setNick] = useState(getNick() || '');
  const [url, setUrl] = useState(localStorage.getItem('concorde:lastUrl') || DEFAULT_SERVER_URL);
  const [mode, setMode] = useState('join');
  const [code, setCode] = useState('');
  const [serverName, setServerName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    if (!nick.trim() || !url.trim()) return;
    if (mode === 'join' && !code.trim()) return;
    if (mode === 'create' && !serverName.trim()) return;
    const cleanUrl = url.trim().replace(/\/+$/, '');
    try { localStorage.setItem('concorde:lastUrl', cleanUrl); } catch (_) {}
    setBusy(true);
    setError('');
    const res = await onConnect({ url: cleanUrl, nick: nick.trim(), mode, code: code.trim().toUpperCase(), serverName: serverName.trim() });
    setBusy(false);
    if (res && res.ok === false) setError(res.error || 'Não foi possível conectar.');
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <div className="login-logo">
          <Logo size={64} />
          <div>
            <h1>Concorde</h1>
            <p className="login-tag">Na contramão, no ar.</p>
          </div>
        </div>

        <label>Apelido</label>
        <input value={nick} onChange={(e) => setNick(e.target.value)} placeholder="Como vão te chamar" maxLength={32} autoFocus />

        <label>Endereço do servidor</label>
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://...onrender.com" />

        <div className="login-tabs">
          <button type="button" className={mode === 'join' ? 'on' : ''} onClick={() => setMode('join')}><LogIn size={16} /> Entrar com código</button>
          <button type="button" className={mode === 'create' ? 'on' : ''} onClick={() => setMode('create')}><PlusCircle size={16} /> Criar servidor</button>
        </div>

        {mode === 'join' ? (
          <>
            <label>Código de convite</label>
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="CORDE-XXXXX" />
          </>
        ) : (
          <>
            <label>Nome do servidor</label>
            <input value={serverName} onChange={(e) => setServerName(e.target.value)} placeholder="Ex.: Galera do Concorde" maxLength={60} />
          </>
        )}

        {error && <div className="login-error">{error}</div>}

        <button className="login-go" type="submit" disabled={busy}>
          {busy ? 'Conectando… (servidor grátis pode levar até 1 min)' : mode === 'join' ? 'Entrar' : 'Criar e entrar'}
        </button>
      </form>
    </div>
  );
}
