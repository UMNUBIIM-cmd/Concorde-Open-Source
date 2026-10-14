const { contextBridge, ipcRenderer } = require('electron');

// Único ponto de contato entre a interface (sandbox) e o processo principal.
// Nada de ipcRenderer cru é exposto: só estas funções.
contextBridge.exposeInMainWorld('desktop', {
  platform: process.platform,

  // Seleção de tela/janela para compartilhar (só o vídeo).
  listSources: () => ipcRenderer.invoke('capture:list-sources'),
  selectSource: (id) => ipcRenderer.invoke('capture:select', id),

  // Som só da janela transmitida (capturador nativo).
  appAudioAvailable: () => ipcRenderer.invoke('appaudio:available'),
  appAudioStart: (sourceId) => ipcRenderer.invoke('appaudio:start', sourceId),
  appAudioStop: () => ipcRenderer.invoke('appaudio:stop'),
  onAppAudioData: (cb) => {
    const fn = (_e, chunk) => cb(chunk);
    ipcRenderer.on('appaudio:data', fn);
    return () => ipcRenderer.removeListener('appaudio:data', fn);
  },
  onAppAudioEnded: (cb) => {
    const fn = (_e, info) => cb(info);
    ipcRenderer.on('appaudio:ended', fn);
    return () => ipcRenderer.removeListener('appaudio:ended', fn);
  },
});
