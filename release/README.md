# release/

Esta pasta é onde o **executável portátil** do Windows é gerado quando você roda
`npm run dist` dentro de `app/`.

- O arquivo final sai como `app/release/Concorde-<versão>-portable.exe`.
- **Não versione** o executável neste repositório (ele é grande e é um artefato
  de build). O `.gitignore` já ignora o conteúdo de `release/`, exceto este
  README.
- Para distribuir, anexe o `.exe` a uma **GitHub Release** do seu repositório.

> Este pacote NÃO inclui um executável pré-compilado: compile a partir do código
> (veja `docs/installation/COMPILAR_NO_WINDOWS.md`). Assim você garante que o
> binário corresponde ao código publicado.
