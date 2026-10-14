import React from 'react';
import { Plus, Settings } from 'lucide-react';

/** Coluna esquerda com os servidores adicionados (estilo Discord). */
export default function ServerRail({ servers, activeId, connecting, onSelect, onAdd, onOpenSettings }) {
  return (
    <nav className="server-bar">
      <div className="rail-scroll">
        {servers.map((s) => {
          const active = s.id === activeId;
          return (
            <button
              key={s.id}
              className={'server-pill' + (active ? ' on' : '') + (active && connecting ? ' loading' : '')}
              title={s.name || s.code}
              onClick={() => onSelect(s.id)}
            >
              {s.icon ? <img src={s.icon} alt="" /> : (s.name || '?').trim().slice(0, 2).toUpperCase()}
            </button>
          );
        })}
        <button className="server-pill add" title="Adicionar um servidor" onClick={onAdd}><Plus size={22} /></button>
      </div>
      <button className="server-pill cfg" title="Configurações (áudio e perfil)" onClick={onOpenSettings}><Settings size={20} /></button>
    </nav>
  );
}
