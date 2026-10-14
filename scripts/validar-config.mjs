#!/usr/bin/env node
// Verifica, antes de compilar/distribuir, se app/src/config.js não contém
// um endereço de servidor de outra pessoa e avisa sobre a chave do Giphy.
// Uso: node scripts/validar-config.mjs
import { readFileSync } from 'node:fs';

const path = new URL('../app/src/config.js', import.meta.url);
let src;
try { src = readFileSync(path, 'utf8'); }
catch { console.error('Não encontrei app/src/config.js'); process.exit(1); }

const url = (src.match(/DEFAULT_SERVER_URL\s*=\s*['"]([^'"]*)['"]/) || [])[1] ?? '';
const giphy = (src.match(/GIPHY_API_KEY\s*=\s*['"]([^'"]*)['"]/) || [])[1] ?? '';

let warn = 0;
console.log('Servidor padrão (DEFAULT_SERVER_URL):', url || '(vazio)');
if (/onrender\.com/.test(url) && !/SEU|meu-concorde|exemplo/i.test(url)) {
  console.warn('  ⚠  Parece um endereço de servidor específico. Confirme que é O SEU antes de distribuir.');
  warn++;
}
if (url.includes('localhost')) {
  console.log('  ℹ  Padrão localhost — bom para testar; troque pelo seu servidor para distribuir aos amigos.');
}
console.log('Chave do Giphy:', giphy ? '(definida)' : '(vazia — busca de GIFs desativada)');
if (!giphy) console.log('  ℹ  Para habilitar GIFs, coloque sua chave pública do Giphy.');

console.log(warn ? `\nConcluído com ${warn} aviso(s).` : '\nConfiguração OK.');
