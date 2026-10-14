export const APP_NAME = 'Concorde';

// Endereço do servidor que já vem preenchido no app.
// Na distribuição pública NÃO há servidor padrão: cada pessoa aponta para o
// seu próprio servidor (hospede o seu — veja docs/deployment/).
//   - Para testar na própria máquina: deixe 'http://localhost:3001' e rode o
//     servidor local (pasta server/).
//   - Para distribuir aos amigos: troque pelo endereço público do SEU servidor
//     no Render, ex.: 'https://meu-concorde.onrender.com'.
// O endereço também pode ser digitado na tela de entrada do app.
export const DEFAULT_SERVER_URL = 'http://localhost:3001';

// Servidores STUN públicos (ajudam os computadores a se acharem na internet).
// Para redes mais fechadas, adicione também um servidor TURN (veja o guia).
export const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

// Presets de qualidade da transmissão de tela.
export const QUALITY_PRESETS = {
  baixa: { label: 'Baixa — 720p 30fps (leve)', width: 1280, height: 720, fps: 30, bitrate: 1_500_000 },
  media: { label: 'Média — 1080p 30fps', width: 1920, height: 1080, fps: 30, bitrate: 4_000_000 },
  alta: { label: 'Alta — 1080p 60fps (fluido)', width: 1920, height: 1080, fps: 60, bitrate: 8_000_000 },
};

// Busca de GIFs (Giphy). Deixe vazio para desativar, ou coloque a SUA chave
// pública de cliente, criada grátis em https://developers.giphy.com.
// NÃO é uma chave secreta — é uma chave pública de cliente, segura no app.
export const GIPHY_API_KEY = '';
