import React, { useEffect, useState } from 'react';
import { Monitor, AppWindow, X, Volume2, VolumeX, ShieldCheck } from 'lucide-react';
import { QUALITY_PRESETS } from '../config.js';

export default function ScreenPicker({ onClose, onShare, appAudioAvailable }) {
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('window'); // 'window' | 'screen'
  const [selected, setSelected] = useState(null);
  const [qualityKey, setQualityKey] = useState(localStorage.getItem('concorde:quality') || 'media');
  const [withAudio, setWithAudio] = useState(appAudioAvailable);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const list = await window.desktop.listSources();
        if (alive) setSources(list || []);
      } catch (_) {
        if (alive) setSources([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => { setWithAudio(appAudioAvailable); }, [appAudioAvailable]);

  const list = sources.filter((s) => s.type === tab);
  const selectedSource = sources.find((s) => s.id === selected);

  function confirm() {
    if (!selectedSource) return;
    try { localStorage.setItem('concorde:quality', qualityKey); } catch (_) {}
    onShare({ sourceId: selectedSource.id, sourceType: selectedSource.type, qualityKey, withAudio: appAudioAvailable && withAudio });
  }

  const audioLabel = selectedSource?.type === 'screen' ? 'Som do PC (sem a voz da chamada)' : 'Som só desta janela';

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal picker" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Compartilhar tela</h2>
          <button className="icon-btn" onClick={onClose} title="Fechar"><X size={18} /></button>
        </div>

        <div className="picker-tabs">
          <button className={tab === 'window' ? 'on' : ''} onClick={() => setTab('window')}><AppWindow size={15} /> Aplicativos</button>
          <button className={tab === 'screen' ? 'on' : ''} onClick={() => setTab('screen')}><Monitor size={15} /> Telas inteiras</button>
        </div>

        {loading ? (
          <div className="picker-loading">Carregando…</div>
        ) : list.length === 0 ? (
          <div className="picker-loading">Nada para mostrar aqui.</div>
        ) : (
          <div className="picker-grid">
            {list.map((s) => (
              <button
                key={s.id}
                className={'src-card' + (selected === s.id ? ' on' : '')}
                onClick={() => setSelected(s.id)}
                onDoubleClick={() => {
                  try { localStorage.setItem('concorde:quality', qualityKey); } catch (_) {}
                  onShare({ sourceId: s.id, sourceType: s.type, qualityKey, withAudio: appAudioAvailable && withAudio });
                }}
              >
                <div className="src-thumb">
                  {s.thumbnail ? <img src={s.thumbnail} alt="" /> : <div className="src-noimg">{s.type === 'screen' ? <Monitor size={22} /> : <AppWindow size={22} />}</div>}
                </div>
                <div className="src-name">
                  {s.appIcon ? <img className="src-appicon" src={s.appIcon} alt="" /> : s.type === 'screen' ? <Monitor size={14} /> : <AppWindow size={14} />}
                  <span title={s.name}>{s.name}</span>
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="picker-opts">
          <div className="opt">
            <label>Qualidade</label>
            <select value={qualityKey} onChange={(e) => setQualityKey(e.target.value)}>
              {Object.entries(QUALITY_PRESETS).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          <div className="opt">
            <label>Áudio da transmissão</label>
            <button
              type="button"
              className={'audio-toggle' + (withAudio && appAudioAvailable ? ' on' : '')}
              disabled={!appAudioAvailable}
              onClick={() => setWithAudio((v) => !v)}
            >
              {withAudio && appAudioAvailable ? <Volume2 size={16} /> : <VolumeX size={16} />}
              <span>{appAudioAvailable ? (withAudio ? audioLabel : 'Sem som') : 'Indisponível neste Windows'}</span>
              <span className="switch"><span /></span>
            </button>
          </div>
        </div>

        {appAudioAvailable && withAudio && (
          <div className="ok">
            <ShieldCheck size={15} />
            {selectedSource?.type === 'screen'
              ? 'Vai o som do computador, MENOS o Concorde: a voz da chamada nunca entra na transmissão.'
              : 'Vai só o som do programa desta janela. Voz da chamada, música de fundo e outros apps ficam de fora.'}
          </div>
        )}
        {!appAudioAvailable && (
          <div className="warn">Capturar o som de um programa precisa do Windows 10 (versão 2004) ou mais novo. A transmissão vai sem som.</div>
        )}

        <div className="modal-foot">
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" disabled={!selectedSource} onClick={confirm}>Transmitir</button>
        </div>
      </div>
    </div>
  );
}
