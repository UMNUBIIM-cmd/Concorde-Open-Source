import React from 'react';
import { Users } from 'lucide-react';
import Avatar from './Avatar.jsx';

/** Barra direita: membros online e offline (cadastro de quem já entrou). */
export default function Members({ members, selfUserId }) {
  const online = members.filter((m) => m.online);
  const offline = members.filter((m) => !m.online);

  const Row = (m) => (
    <div key={m.userId} className={'member' + (m.online ? '' : ' off')}>
      <span className="member-av">
        <Avatar nick={m.nick} src={m.avatar} size={32} />
        <i className={'presence ' + (m.online ? 'on' : 'off')} />
      </span>
      <span className="member-nick">{m.nick}{m.userId === selfUserId ? ' (você)' : ''}</span>
    </div>
  );

  return (
    <aside className="members">
      <div className="chan-group"><span><Users size={13} /> Online — {online.length}</span></div>
      {online.map(Row)}
      {offline.length > 0 && (
        <>
          <div className="chan-group"><span>Offline — {offline.length}</span></div>
          {offline.map(Row)}
        </>
      )}
    </aside>
  );
}
