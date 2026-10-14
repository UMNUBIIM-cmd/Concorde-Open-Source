const { app, BrowserWindow, ipcMain, desktopCapturer, session, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');

const isDev = !!process.env.ELECTRON_DEV;
const DEV_URL = 'http://localhost:5173';

let win = null;

// Fonte de tela escolhida pelo usuário, consumida pelo próximo getDisplayMedia().
let pendingSourceId = null;

/** Só aceita IPC vindo da nossa própria página (nunca de iframes ou sites externos). */
function isTrusted(event) {
  const url = event.senderFrame?.url || '';
  return isDev ? url.startsWith(DEV_URL) : url.startsWith('file://');
}

function createWindow() {
  win = new BrowserWindow({
    width: 1320,
    height: 840,
    minWidth: 1000,
    minHeight: 640,
    backgroundColor: '#1e1f22',
    title: 'Concorde',
    icon: path.join(__dirname, 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      spellcheck: false,
      devTools: isDev,
      // Áudio dos colegas e das transmissões toca sem clique extra.
      autoplayPolicy: 'no-user-gesture-required',
      // Áudio não pode "dormir" quando a janela é minimizada durante a chamada.
      backgroundThrottling: false,
    },
  });

  Menu.setApplicationMenu(null);

  // Nenhuma janela nova dentro do app; links https abrem no navegador padrão.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  // Bloqueia navegação para fora do app.
  win.webContents.on('will-navigate', (event, url) => {
    const allowed = isDev ? url.startsWith(DEV_URL) : url.startsWith('file://');
    if (!allowed) event.preventDefault();
  });

  if (isDev) win.loadURL(DEV_URL);
  else win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));

  win.on('closed', () => {
    stopAppAudio();
    win = null;
  });
}

function setupSession() {
  const ses = session.defaultSession;
  const allowed = new Set(['media', 'display-capture', 'fullscreen']);

  // Só microfone, câmera, captura de tela e tela cheia; todo o resto é negado.
  ses.setPermissionRequestHandler((_wc, permission, callback) => callback(allowed.has(permission)));
  ses.setPermissionCheckHandler((_wc, permission) => allowed.has(permission));

  // getDisplayMedia() no renderer cai aqui; entregamos SÓ o vídeo da fonte
  // escolhida. O áudio nunca vem daqui (o "loopback" do Windows pegaria o som
  // do PC inteiro, inclusive a voz da chamada). O som da janela vem do
  // capturador nativo (concorde-audio.exe), separado.
  ses.setDisplayMediaRequestHandler(async (_request, callback) => {
    try {
      const id = pendingSourceId;
      pendingSourceId = null;
      if (!id) return callback({});
      const sources = await desktopCapturer.getSources({ types: ['screen', 'window'] });
      const source = sources.find((s) => s.id === id);
      if (!source) return callback({});
      callback({ video: source });
    } catch (err) {
      console.error('display media handler:', err);
      callback({});
    }
  });
}

// Lista de telas/janelas para o modal de seleção (sem a própria janela do Concorde).
ipcMain.handle('capture:list-sources', async (event) => {
  if (!isTrusted(event)) return [];
  const ownId = win ? win.getMediaSourceId() : null;
  const sources = await desktopCapturer.getSources({
    types: ['screen', 'window'],
    thumbnailSize: { width: 320, height: 180 },
    fetchWindowIcons: true,
  });
  return sources
    .filter((s) => s.id !== ownId)
    .map((s) => ({
      id: s.id,
      name: s.name,
      type: s.id.startsWith('screen:') ? 'screen' : 'window',
      thumbnail: s.thumbnail.toDataURL(),
      appIcon: s.appIcon && !s.appIcon.isEmpty() ? s.appIcon.toDataURL() : null,
    }));
});

// Registra a fonte escolhida para o próximo getDisplayMedia().
ipcMain.handle('capture:select', (event, id) => {
  if (!isTrusted(event)) return false;
  if (typeof id !== 'string' || id.length > 200) return false;
  pendingSourceId = id;
  return true;
});

// ----- Som só da janela transmitida (capturador nativo concorde-audio.exe) -------
//
// Janela  -> captura só o processo dono da janela (ex.: só o jogo).
// Tela    -> captura tudo MENOS o próprio Concorde (a voz da chamada fica de fora).
// O PCM (48 kHz, estéreo, 16 bits) chega pelo stdout e é repassado ao renderer,
// que o transforma numa faixa de áudio separada da voz.

let audioProc = null;

function helperPath() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'concorde-audio.exe')
    : path.join(__dirname, 'native', 'bin', 'concorde-audio.exe');
}

/** WASAPI process loopback existe a partir do Windows 10 2004 (build 19041). */
function appAudioSupported() {
  if (process.platform !== 'win32') return false;
  const build = parseInt((os.release().split('.')[2] || '0'), 10);
  return build >= 19041 && fs.existsSync(helperPath());
}

function stopAppAudio() {
  if (!audioProc) return;
  const p = audioProc;
  audioProc = null;
  try { p.stdin.end(); } catch (_) {}
  setTimeout(() => { try { p.kill(); } catch (_) {} }, 300);
}

ipcMain.handle('appaudio:available', (event) => {
  if (!isTrusted(event)) return false;
  return appAudioSupported();
});

ipcMain.handle('appaudio:start', (event, sourceId) => {
  if (!isTrusted(event)) return { ok: false, error: 'não autorizado' };
  if (!appAudioSupported()) return { ok: false, error: 'Seu Windows não suporta capturar o som de um programa (precisa do Windows 10 2004 ou mais novo).' };
  if (typeof sourceId !== 'string') return { ok: false, error: 'fonte inválida' };

  stopAppAudio();

  const m = /^window:(\d+):/.exec(sourceId);
  const args = m ? ['--hwnd', m[1]] : ['--exclude', String(process.pid)];
  const sender = event.sender;

  return new Promise((resolve) => {
    let settled = false;
    let errText = '';
    const done = (res) => {
      if (!settled) {
        settled = true;
        resolve(res);
      }
    };

    let proc;
    try {
      proc = spawn(helperPath(), args, { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    } catch (err) {
      done({ ok: false, error: 'Não foi possível iniciar o capturador de áudio.' });
      return;
    }
    audioProc = proc;

    proc.stdout.on('data', (chunk) => {
      if (audioProc !== proc || sender.isDestroyed()) return;
      sender.send('appaudio:data', chunk);
    });

    proc.stderr.on('data', (d) => {
      const s = d.toString();
      errText += s;
      if (s.includes('OK:')) done({ ok: true, mode: m ? 'window' : 'screen' });
      if (s.includes('ERRO:')) done({ ok: false, error: s.trim() });
    });

    proc.on('error', () => done({ ok: false, error: 'Não foi possível iniciar o capturador de áudio.' }));

    proc.on('exit', (code) => {
      done({ ok: false, error: errText.trim() || 'O capturador de áudio fechou (código ' + code + ').' });
      if (audioProc === proc) {
        audioProc = null;
        if (!sender.isDestroyed()) sender.send('appaudio:ended', { code, error: errText.trim() });
      }
    });

    // Se em 6s não confirmou, considera falha.
    setTimeout(() => done({ ok: false, error: 'O capturador de áudio não respondeu.' }), 6000);
  });
});

ipcMain.handle('appaudio:stop', (event) => {
  if (!isTrusted(event)) return false;
  stopAppAudio();
  return true;
});

app.whenReady().then(() => {
  setupSession();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', stopAppAudio);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
