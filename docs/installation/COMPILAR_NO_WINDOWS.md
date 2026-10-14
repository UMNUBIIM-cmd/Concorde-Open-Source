# Compilar o Concorde no Windows

Este guia mostra como baixar o código, rodar em modo de desenvolvimento e gerar
o **executável portátil** do Concorde. É voltado para iniciantes.

> O build do executável do Windows **precisa ser feito no Windows**.

---

## 1. Pré-requisitos

- **Node.js 18 ou mais novo** (recomendado: 20 LTS) — https://nodejs.org
  - O Node vem com o `npm`, que instala as dependências.
- **Git** (opcional, para clonar) — https://git-scm.com
- **Go** (opcional) — só se você quiser **recompilar** o capturador de áudio
  nativo. O pacote já inclui o `.exe` dele compilado, então normalmente não é
  necessário. Veja `app/electron/native/README.md`.

Confira as versões instaladas:

```bat
node -v
npm -v
```

## 2. Baixar o código

**Opção A — clonar com Git:**
```bat
git clone https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
cd SEU_REPOSITORIO
```

**Opção B — baixar ZIP:** no GitHub, botão **Code → Download ZIP**, e extraia.

> O aplicativo fica na pasta **`app/`** e o servidor na pasta **`server/`**.

## 3. Instalar as dependências do app

```bat
cd app
npm install
```

## 4. (Opcional) Apontar para o seu servidor

Abra **`app/src/config.js`** e ajuste:

```js
export const DEFAULT_SERVER_URL = 'http://localhost:3001';
// troque pelo endereço do SEU servidor, ex.:
// export const DEFAULT_SERVER_URL = 'https://meu-concorde.onrender.com';
```

Para habilitar GIFs, coloque sua chave pública do Giphy em `GIPHY_API_KEY`
(crie grátis em https://developers.giphy.com). É opcional.

> Dica: rode `node scripts/validar-config.mjs` (a partir da raiz do projeto) para
> conferir a configuração antes de compilar.

## 5. Rodar em modo de desenvolvimento

```bat
npm run dev
```

Isso abre o Concorde com recarregamento automático. Para a conversa funcionar,
você precisa de um servidor rodando — suba um local em outro terminal:

```bat
cd ..\server
npm install
npm start
```

E no app use o endereço `http://localhost:3001`.

## 6. Gerar o executável portátil

Na pasta **`app/`**:

```bat
npm install
npm run dist
```

O arquivo final será gerado em:

```
app\release\Concorde-1.2.0-portable.exe
```

- É **portátil**: não instala nada, é só dar dois cliques.
- O nome/versão vêm de `app/package.json` (`productName` e `version`).

## 7. Verificar se usa a configuração correta

- O endereço que você colocou em `DEFAULT_SERVER_URL` aparece **preenchido** na
  tela de entrada do app. Também dá para digitar outro ali na hora.
- Para testar em **outro computador**: copie o `.exe` para a outra máquina,
  abra, use o **mesmo endereço de servidor** e entre com o **código de convite**.

## Portátil x instalador x assinatura

- **Executável portátil (o que este projeto gera):** um único `.exe` que roda sem
  instalação. É o alvo configurado em `app/package.json` (`win.target: portable`).
- **Instalador tradicional (setup.exe):** **não** está configurado neste projeto.
  Se você quiser um instalador (ex.: NSIS), isso exige adicionar o alvo `nsis` na
  configuração do `electron-builder` — proposta de mudança, não feita aqui para
  não alterar o comportamento atual.
- **Assinatura digital:** o executável **não é assinado**. Por isso o Windows
  pode exibir um aviso do SmartScreen ("Windows protegeu o seu PC") ao abrir pela
  primeira vez. Assinar exige um certificado de *code signing* pago. Sem
  assinatura, o usuário pode clicar em **Mais informações → Executar assim mesmo**.

## Avisos de segurança do Windows

- **SmartScreen**: por ser um app novo e sem assinatura, pode aparecer o aviso
  acima. É esperado; o código é aberto e auditável.
- **Windows Defender / antivírus**: o capturador de som
  (`concorde-audio.exe`) é um executável novo sem assinatura e pode ser sinalizado.
  Você pode auditar e recompilar o fonte (`app/electron/native/`).

## Problemas comuns ao compilar

- **`npm install` falha**: confira a versão do Node (18+), sua internet, e tente
  `npm cache clean --force` e repita.
- **Erro de symlink/winCodeSign no build**: o projeto já usa
  `signAndEditExecutable: false` para evitar isso. Se persistir, ative o **Modo de
  Desenvolvedor** do Windows ou rode o terminal como Administrador.
- **O `.exe` não aparece**: confirme que o comando terminou sem erro e veja a
  pasta `app\release\`.
