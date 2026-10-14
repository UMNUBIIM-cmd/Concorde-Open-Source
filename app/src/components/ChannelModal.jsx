import React, { useState } from 'react';
import { Hash, Volume2, X, Trash2 } from 'lucide-react';

/**
 * Criar canal  -> { mode: 'create', type }
 * Editar canal -> { mode: 'edit', channel }
 */
export default function ChannelModal({ state, onClose, onCreate, onRename, onDelete }) {
  const editing = state.mode === 'edit';
  const [type, setType] = useState(editing ? state.channel.type : state.type || 'text');
  const [name, setName] = useState(editing ? state.channel.name : '');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const preview = type === 'text'
    ? name.trim().toLowerCase().replace(/\s+/g, '-').replace(/-+/g, '-')
    : name.trim();

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError('');
    const res = editing ? await onRename(state.channel.id, name) : await onCreate(name, type);
    setBusy(false);
    if (res && res.ok) onClose();
    else setError((res && res.error) || 'Não deu certo. Tente de novo.');
  }

  async function doDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setBusy(true);
    const res = await onDelete(state.channel.id);
    setBusy(false);
    if (res && res.ok) onClose();
    else setError((res && res.error) || 'Não deu para excluir.');
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <form className="modal small" onMouseDown={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="modal-head">
          <h2>{editing ? 'Editar canal' : 'Criar canal'}</h2>
          <button type="button" className="icon-btn" onClick={onClose} title="Fechar"><X size={18} /></button>
        </div>

        {!editing && (
          <>
            <label className="field-label">Tipo de canal</label>
            <div className="type-pick">
              <button type="button" className={type === 'text' ? 'on' : ''} onClick={() => setType('text')}>
                <Hash size={20} />
                <div><b>Texto</b><span>Mensagens, imagens e vídeos curtos</span></div>
                <i className="radio" />
              </button>
              <button type="button" className={type === 'voice' ? 'on' : ''} onClick={() => setType('voice')}>
                <Volume2 size={20} />
                <div><b>Voz</b><span>Conversa, câmera e transmissão de tela</span></div>
                <i className="radio" />
              </button>
            </div>
          </>
        )}

        <label className="field-label">Nome do canal</label>
        <div className="name-input">
          {type === 'text' ? <Hash size={16} /> : <Volume2 size={16} />}
          <input
            autoFocus
            value={name}
            maxLength={32}
            onChange={(e) => setName(e.target.value)}
            placeholder={type === 'text' ? 'novo-canal' : 'Nova sala'}
          />
        </div>
        {type === 'text' && name && preview !== name && <div className="hint">Vai ficar: #{preview}</div>}

        {error && <div className="login-error">{error}</div>}

        <div className="modal-foot spread">
          {editing ? (
            <button type="button" className={'btn-danger' + (confirmDelete ? ' armed' : '')} onClick={doDelete} disabled={busy}>
              <Trash2 size={15} /> {confirmDelete ? 'Clique de novo para excluir' : 'Excluir canal'}
            </button>
          ) : <span />}
          <div className="foot-right">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={busy || !name.trim()}>
              {editing ? 'Salvar' : 'Criar canal'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
