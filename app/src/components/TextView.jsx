import React, { useEffect, useRef, useState } from 'react';
import { Hash, Send, ImagePlus, X } from 'lucide-react';
import Avatar from './Avatar.jsx';
import GifPicker from './GifPicker.jsx';

const GROUP_MS = 5 * 60 * 1000;

function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export default function TextView({ channel, messages, onSend, onError }) {
  const [text, setText] = useState('');
  const [preview, setPreview] = useState(null); // { dataUrl, isVideo }
  const [gifOpen, setGifOpen] = useState(false);
  const fileRef = useRef(null);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [messages.length, channel?.id]);

  function pickFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const isImg = /^image\/(png|jpeg|gif|webp)$/.test(file.type);
    const isVid = file.type.startsWith('video/');
    if (!isImg && !isVid) { onError('Formato não suportado (PNG, JPG, GIF, WEBP ou vídeo).'); return; }
    if (file.size > 3 * 1024 * 1024) { onError('O arquivo passa de 3 MB.'); return; }
    const reader = new FileReader();
    reader.onload = () => setPreview({ dataUrl: reader.result, isVideo: isVid });
    reader.readAsDataURL(file);
  }

  function submit(e) {
    e.preventDefault();
    const t = text.trim();
    if (!t && !preview) return;
    onSend(t, preview ? preview.dataUrl : null, null);
    setText('');
    setPreview(null);
  }

  if (!channel) return <div className="text-view" />;

  return (
    <div className="text-view">
      <div className="tv-head"><Hash size={20} /> <b>{channel.name}</b></div>

      <div className="tv-msgs">
        <div className="tv-welcome">
          <div className="tv-welcome-icon"><Hash size={34} /></div>
          <h2>Bem-vindo a #{channel.name}!</h2>
          <p>Este é o começo do canal #{channel.name}.</p>
        </div>
        {messages.map((m, i) => {
          const prev = messages[i - 1];
          const grouped = prev && prev.fromId === m.fromId && m.ts - prev.ts < GROUP_MS;
          return (
            <div key={m.id} className={'msg' + (grouped ? ' grouped' : '')}>
              <div className="msg-side">
                {grouped ? <span className="msg-time-side">{fmtTime(m.ts)}</span> : <Avatar nick={m.from} src={m.avatar} size={40} />}
              </div>
              <div className="msg-body">
                {!grouped && <div className="msg-head"><b>{m.from}</b><span>{fmtTime(m.ts)}</span></div>}
                {m.text && <div className="msg-text">{m.text}</div>}
                {m.gif && <img className="msg-media gif" src={m.gif} alt="gif" />}
                {m.image && (m.image.startsWith('data:video')
                  ? <video className="msg-media" src={m.image} controls />
                  : <img className="msg-media" src={m.image} alt="imagem enviada" />)}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <form className="tv-input" onSubmit={submit}>
        {preview && (
          <div className="attach-preview">
            {preview.isVideo ? <video src={preview.dataUrl} /> : <img src={preview.dataUrl} alt="" />}
            <button type="button" className="attach-x" onClick={() => setPreview(null)} title="Remover anexo"><X size={14} /></button>
          </div>
        )}
        <div className="tv-input-row">
          <button type="button" className="icon-btn" title="Anexar imagem ou vídeo (até 3 MB)" onClick={() => fileRef.current?.click()}>
            <ImagePlus size={20} />
          </button>
          <div className="gif-anchor">
            <button type="button" className={'gif-btn' + (gifOpen ? ' on' : '')} title="Enviar um GIF" onClick={() => setGifOpen((v) => !v)}>GIF</button>
            {gifOpen && (
              <GifPicker
                onClose={() => setGifOpen(false)}
                onPick={(url) => onSend('', null, url)}
              />
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp,video/*" hidden onChange={pickFile} />
          <input className="tv-text" value={text} onChange={(e) => setText(e.target.value)} placeholder={'Conversar em #' + channel.name} maxLength={4000} />
          <button type="submit" className="icon-btn send" title="Enviar"><Send size={18} /></button>
        </div>
      </form>
    </div>
  );
}
