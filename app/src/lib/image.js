/**
 * Lê um arquivo de imagem escolhido pelo usuário, corta no quadrado e
 * redimensiona para no máximo `size` px, devolvendo um dataURL JPEG leve
 * (para caber no limite do servidor ~300KB).
 */
export function fileToSquareDataUrl(file, size = 256, quality = 0.85) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('Escolha uma imagem.'));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Imagem inválida.'));
      img.onload = () => {
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
        let out = canvas.toDataURL('image/jpeg', quality);
        // Se ainda ficar grande, baixa a qualidade.
        let q = quality;
        while (out.length > 380 * 1024 && q > 0.4) {
          q -= 0.15;
          out = canvas.toDataURL('image/jpeg', q);
        }
        resolve(out);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
