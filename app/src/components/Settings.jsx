import React, { useEffect, useRef, useState } from 'react';
import { X, Mic, Headphones, Camera, Trash2, User } from 'lucide-react';
import Avatar from './Avatar.jsx';
import { fileToSquareDataUrl } from '../lib/image.js';
import { setAudioPref, getAudioPrefs } from '../lib/prefs.js';
import { setMasterVolume, setOutputDevice } from '../lib/audio.js';

export default function Settings({ engine, nick, avatar, onSaveProfile, onClose }) {
  const [tab, setTab] = useState('audio');
  const [devices, setDevices] = useState({ inputs: [], outputs: [] });
  const [prefs, setPrefs] = useState(getAudioPrefs());
  const [micLevel, setMicLevel] = useState(0);

  const [name, setName] = useState(nick || '');
  const [pic, setPic] = useState(avatar || null);
  const [savingP, setSavingP] = useState(false);
  const [pErr, setPErr] = useState('');
  const fileRef = useRef(null);
  const hasSinkId = typeof AudioContext !== 'undefined' && 'setSinkId' in AudioContext.prototype;

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const list = await navigator.mediaDevices.enumerateDevices();
        if (!alive) return;
        setDevices({
          inputs: list.filter((d) => d.kind === 'audioinput'),
          outputs: list.filter((d) => d.kind === 'audiooutput'),
        });
      } catch (_) {}
    })();
    return () => { alive = false; };
  }, []);

  // Medidor do microfone ao vivo (quando numa chamada).
  useEffect(() => {
    if (!engine) return undefined;
    const t = setInterval(() => setMicLevel(engine.micLevel()), 90);
    return () => clearInterval(t);
  }, [engine]);

  function up(patch) { setPrefs((p) => ({ ...p, ...patch })); }

  function onInput(id) {
    up({ inputId: id });
    if (engine) engine.setInputDevice(id); else setAudioPref('inputId', id);
  }
  function onInputVol(v) {
    up({ inputVol: v });
    if (engine) engine.setInputVolume(v); else setAudioPref('inputVol', v);
  }
  function onOutput(id) {
    up({ outputId: id });
    if (engine) engine.setOutputDevice(id); else { setAudioPref('outputId', id); setOutputDevice(id); }
  }
  function onOutputVol(v) {
    up({ outputVol: v });
    if (engine) engine.setOutputVolume(v); else { setAudioPref('outputVol', v); setMasterVolume(v); }
  }

  async function pickAvatar(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try { setPic(await fileToSquareDataUrl(file, 256)); setPErr(''); }
    catch (err) { setPErr(err.message); }
  }

  async function saveProfile() {
    if (!name.trim()) return;
    setSavingP(true);
    setPErr('');
    const res = await onSaveProfile(name.trim(), pic);
    setSavingP(false);
    if (res && res.ok === false) setPErr(res.error || 'Não deu para salvar.');
  }

  const inName = (d, i) => d.label || ('Microfone ' + (i + 1));
  const outName = (d, i) => d.label || ('Saída ' + (i + 1));

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal settings" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Configurações</h2>
          <button className="icon-btn" onClick={onClose} title="Fechar"><X size={18} /></button>
        </div>

        <div className="settings-tabs">
          <button className={tab === 'audio' ? 'on' : ''} onClick={() => setTab('audio')}><Headphones size={15} /> Voz e áudio</button>
          <button className={tab === 'profile' ? 'on' : ''} onClick={() => setTab('profile')}><User size={15} /> Perfil</button>
        </div>

        {tab === 'audio' ? (
          <div className="settings-body">
            <label className="field-label"><Mic size={14} /> Dispositivo de entrada (microfone)</label>
            <select value={prefs.inputId} onChange={(e) => onInput(e.target.value)}>
              <option value="default">Padrão do sistema</option>
              {devices.inputs.map((d, i) => <option key={d.deviceId} value={d.deviceId}>{inName(d, i)}</option>)}
            </select>
            <div className="vol-line">
              <span>Volume de entrada</span>
              <input type="range" min="0" max="2" step="0.01" value={prefs.inputVol} onChange={(e) => onInputVol(parseFloat(e.target.value))} />
              <b>{Math.round(prefs.inputVol * 100)}%</b>
            </div>
            <div className="mic-meter" title="Nível do seu microfone">
              <i style={{ width: Math.min(100, Math.round(micLevel * 180)) + '%' }} />
            </div>
            {!engine && <p className="tiny">Entre numa chamada para testar o microfone ao vivo.</p>}

            <label className="field-label"><Headphones size={14} /> Dispositivo de saída (alto-falante/fone)</label>
            <select value={prefs.outputId} onChange={(e) => onOutput(e.target.value)} disabled={!hasSinkId}>
              <option value="default">Padrão do sistema</option>
              {devices.outputs.map((d, i) => <option key={d.deviceId} value={d.deviceId}>{outName(d, i)}</option>)}
            </select>
            {!hasSinkId && <p className="tiny">Seu sistema não permite trocar a saída de áudio por aqui — use o padrão do Windows.</p>}
            <div className="vol-line">
              <span>Volume de saída</span>
              <input type="range" min="0" max="1" step="0.01" value={prefs.outputVol} onChange={(e) => onOutputVol(parseFloat(e.target.value))} />
              <b>{Math.round(prefs.outputVol * 100)}%</b>
            </div>
          </div>
        ) : (
          <div className="settings-body">
            <label className="field-label">Foto de perfil</label>
            <div className="avatar-edit">
              <Avatar nick={name} src={pic} size={84} />
              <div className="avatar-edit-btns">
                <button className="btn-ghost sm" onClick={() => fileRef.current?.click()}><Camera size={15} /> Trocar foto</button>
                {pic && <button className="btn-ghost sm" onClick={() => setPic(null)}><Trash2 size={15} /> Remover</button>}
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickAvatar} />
              </div>
            </div>
            <label className="field-label">Apelido</label>
            <input className="text-field" value={name} maxLength={32} onChange={(e) => setName(e.target.value)} placeholder="Seu apelido" />
            {pErr && <div className="login-error">{pErr}</div>}
            <div className="modal-foot">
              <button className="btn-primary" onClick={saveProfile} disabled={savingP || !name.trim()}>{savingP ? 'Salvando…' : 'Salvar perfil'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
