// Coloca o ícone e o nome "Concorde" dentro do Concorde.exe (o programa de dentro do
// portátil). Usamos o rcedit direto porque o build roda com
// signAndEditExecutable: false (evita o erro de "symlink" do winCodeSign no
// Windows sem modo desenvolvedor).
const path = require('path');

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'win32') return;
  let rcedit;
  try {
    const mod = require('rcedit');
    rcedit = typeof mod === 'function' ? mod : mod.rcedit || mod.default;
  } catch (_) {
    console.warn('[concorde] rcedit não instalado (rode "npm install"); o Concorde.exe interno fica com o ícone padrão.');
    return;
  }
  const exe = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.exe`);
  const version = context.packager.appInfo.version;
  await rcedit(exe, {
    icon: path.join(__dirname, 'icon.ico'),
    'file-version': version,
    'product-version': version,
    'version-string': {
      ProductName: 'Concorde',
      FileDescription: 'Concorde',
      CompanyName: 'Concorde',
      OriginalFilename: 'Concorde.exe',
    },
  });
  console.log('[concorde] ícone aplicado em', exe);
};
