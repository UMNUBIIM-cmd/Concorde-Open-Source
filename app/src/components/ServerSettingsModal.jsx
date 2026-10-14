import React, { useRef, useState } from 'react';
import { X, Camera, Trash2, LogOut, Copy } from 'lucide-react';
import { fileToSquareDataUrl } from '../lib/image.js';

/** Identidade visual do servidor (nome + ícone) + sair/remover. */
export default function ServerSettingsModal({ guild, onClose, onSave, onLeave, onToast }) {
  const [name, setName] = useState(guild.name || '');
  const [icon, setIcon] = useState(guild.icon || null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  async function pickIcon(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try { setIcon(await fileToSquareDataUrl(file, 256)); setError(''); }
    catch (err) { setError(err.message); }
  }

  async function save() {
    if (!name.trim()) return;
    setBusy(true);
    setError('');
    const res = await onSave(name.trim(), icon);
    setBusy(false);
    if (res && res.ok === false) setError(res.error || 'Não deu para salvar.');
    else onClose();
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal small" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Configurações do servidor</h2>
          <button className="icon-btn" onClick={onClose} title="Fechar"><X size={18} /></button>
        </div>

        <label className="field-label">Ícone do servidor</label>
        <div className="avatar-edit">
          {icon ? <img className="srv-icon-prev" src={icon} alt="" /> : <div className="srv-icon-prev ph">{(name || '?').trim().slice(0, 2).toUpperCase()}</div>}
          <div className="avatar-edit-btns">
            <button className="btn-ghost sm" onClick={() => fileRef.current?.click()}><Camera size={15} /> Trocar ícone</button>
            {icon && <button className="btn-ghost sm" onClick={() => setIcon(null)}><Trash2 size={15} /> Remover</button>}
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickIcon} />
          </div>
        </div>

        <label className="field-label">Nome do servidor</label>
        <input className="text-field" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />

        <label className="field-label">Código de convite</label>
        <button className="invite wide" onClick={() => { navigator.clipboard?.writeText(guild.code); onToast('Código copiado: ' + guild.code); }}>
          <span>{guild.code}</span><Copy size={14} />
        </button>

        {error && <div className="login-error">{error}</div>}

        <div className="modal-foot spread">
          <button className="btn-danger" onClick={onLeave}><LogOut size={15} /> Sair deste servidor</button>
          <div className="foot-right">
            <button className="btn-ghost" onClick={onClose}>Cancelar</button>
            <button className="btn-primary" onClick={save} disabled={busy || !name.trim()}>{busy ? 'Salvando…' : 'Salvar'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
