import React, { useId } from 'react';

/** Logo do Concorde: jato supersônico subindo "do contra", com ondas de choque. */
export default function Logo({ size = 40, simple = false }) {
  const uid = useId().replace(/:/g, '');
  const bg = 'bg' + uid;
  if (simple) {
    return (
      <svg width={size} height={size} viewBox="0 0 512 512" aria-hidden="true">
        <defs>
          <linearGradient id={bg} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ff4d4d" /><stop offset="0.5" stopColor="#e01030" /><stop offset="1" stopColor="#6a0014" />
          </linearGradient>
        </defs>
        <rect width="512" height="512" rx="110" fill={`url(#${bg})`} />
        <path d="M256 70 L346 372 L256 326 L166 372 Z" fill="#fff" />
        <path d="M256 140 L256 300" stroke="#e01030" strokeWidth="22" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" aria-hidden="true">
      <defs>
        <linearGradient id={bg} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff4d4d" /><stop offset="0.5" stopColor="#e01030" /><stop offset="1" stopColor="#5c0010" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="116" fill={`url(#${bg})`} />
      <g fill="none" stroke="#fff" strokeLinecap="round">
        <path d="M150 300 A120 120 0 0 1 362 300" strokeWidth="16" opacity="0.35" />
        <path d="M185 326 A86 86 0 0 1 327 326" strokeWidth="16" opacity="0.55" />
      </g>
      <path d="M256 92 L330 360 L256 320 L182 360 Z" fill="#fff" />
      <path d="M256 150 L256 300" stroke="#e01030" strokeWidth="16" strokeLinecap="round" />
      <path d="M256 372 L256 430" stroke="#fff" strokeWidth="18" strokeLinecap="round" opacity="0.85" />
    </svg>
  );
}
