import React from 'react';

const COLORS = ['#e01030', '#eb459e', '#f2465f', '#ff8a3d', '#23a559', '#00a8fc', '#9b59b6', '#e67e22', '#1abc9c'];

export function colorFor(nick) {
  let h = 0;
  const s = nick || '?';
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length];
}

export default function Avatar({ nick, src, size = 32, speaking = false }) {
  const letter = (nick || '?').trim().charAt(0).toUpperCase() || '?';
  const cls = 'avatar' + (speaking ? ' speaking' : '');
  if (src) {
    return <img className={cls} src={src} alt={nick} style={{ width: size, height: size, objectFit: 'cover' }} />;
  }
  return (
    <span className={cls} style={{ width: size, height: size, background: colorFor(nick), fontSize: Math.round(size * 0.42) }}>
      {letter}
    </span>
  );
}
