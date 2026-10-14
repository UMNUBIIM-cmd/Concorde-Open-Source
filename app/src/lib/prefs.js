// Preferências e identidade salvas no computador (localStorage).

function read(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v == null ? fallback : v;
  } catch (_) {
    return fallback;
  }
}
function write(key, value) {
  try { localStorage.setItem(key, value); } catch (_) {}
}
function readJSON(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch (_) {
    return fallback;
  }
}
function writeJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
}

// ---- Identidade estável do usuário (sobrevive a reconexões) ----
export function getUserId() {
  let id = read('concorde:uid', null);
  if (!id) {
    id = 'u_' + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    write('concorde:uid', id);
  }
  return id;
}

export const getNick = () => read('concorde:nick', '');
export const setNick = (v) => write('concorde:nick', v);
export const getAvatar = () => read('concorde:avatar', '') || null;
export const setAvatar = (v) => (v ? write('concorde:avatar', v) : localStorage.removeItem('concorde:avatar'));

// ---- Lista de servidores adicionados ----
// [{ id, url, code, name, icon }]
export const getServers = () => readJSON('concorde:servers', []);
export function saveServers(list) { writeJSON('concorde:servers', list); }
export function upsertServer(srv) {
  const list = getServers();
  const i = list.findIndex((s) => s.url === srv.url && s.code === srv.code);
  if (i >= 0) list[i] = { ...list[i], ...srv };
  else list.push(srv);
  saveServers(list);
  return list;
}
export function removeServer(id) {
  const list = getServers().filter((s) => s.id !== id);
  saveServers(list);
  return list;
}
export const getActiveServerId = () => read('concorde:activeServer', null);
export const setActiveServerId = (id) => (id ? write('concorde:activeServer', id) : localStorage.removeItem('concorde:activeServer'));

// ---- Preferências de áudio ----
export function getAudioPrefs() {
  return {
    inputId: read('concorde:inputId', 'default'),
    outputId: read('concorde:outputId', 'default'),
    inputVol: parseFloat(read('concorde:inputVol', '1')) || 1,
    outputVol: parseFloat(read('concorde:outputVol', '1')) || 1,
  };
}
export function setAudioPref(key, value) {
  write('concorde:' + key, String(value));
}
