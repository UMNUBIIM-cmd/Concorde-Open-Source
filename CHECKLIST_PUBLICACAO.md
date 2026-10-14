# Checklist de publicação

Use esta lista **antes** de tornar o repositório público e antes de cada release. Os itens de build local e deploy real ainda precisam ser executados em um computador Windows/conta Render; revisar arquivos não substitui esses testes.

## 1. Segredos e dados pessoais

- [ ] Nenhum `.env` real versionado (só `.env.example`).
- [ ] `app/src/config.js` **não** contém endereço de servidor privado
      (o padrão público é `http://localhost:3001`). Rode:
      `node scripts/validar-config.mjs`
- [ ] `GIPHY_API_KEY` vazio **ou** uma chave **pública** de cliente que você
      aceite publicar (não é segredo, mas confirme).
- [ ] Sem senhas, tokens ou chaves privadas em código, comentários, logs, documentação ou JSON. O e-mail público de segurança foi incluído intencionalmente em `SECURITY.md`.
      Busca sugerida (na raiz):
      `grep -rniE "password|secret|token|api[_-]?key|BEGIN (RSA|PRIVATE)|ghp_|sk_live" . --exclude-dir=node_modules`
- [ ] Sem caminhos absolutos da sua máquina (ex.: `C:\Users\...`, `E:\...`).
- [ ] Capturas de tela **sem** apelidos reais de terceiros, códigos de convite
      ativos, endereços de servidores privados ou dados de usuários.
- [ ] Credenciais de **TURN** (se houver) são de cliente e você aceita que fiquem
      no app distribuído — de preferência limitadas/curtas.

## 2. Licença e créditos

- [x] `LICENSE` presente e o titular do copyright definido como Eduardo Christian Matias, conforme informado pelo mantenedor.
- [ ] Licenças das dependências conferidas (MIT/ISC/BSD — permissivas).
- [ ] Créditos a Electron, React, Vite, Socket.IO, lucide-react e GIPHY mantidos.

## 3. Estrutura e integridade

- [ ] `app/` e `server/` presentes e independentes.
- [ ] `node scripts/validar-config.mjs` sem avisos inesperados.
- [ ] `app`: `npm install`, `npm run dev` e build do executável testados no Windows.
- [ ] `server`: `npm install` e `npm start` iniciam e `curl http://localhost:3001` responde "Concorde server online".
- [x] Guia do Render alinhado com `render.yaml` na raiz e serviço em `server/`.
- [ ] Deploy real no Render testado, incluindo abertura da URL pública e handshake Socket.IO.
- [ ] `README.md` com imagens, arquitetura, recursos e limitações corretos.

## 4. Release do executável

- [ ] `.exe` **não** versionado no git (ver `.gitignore`).
- [ ] Executável compilado **a partir deste código** (não um binário avulso).
- [ ] `app/release/Concorde-<versão>-portable.exe` anexado a uma **GitHub
      Release**, com nota sobre SmartScreen (app sem assinatura).

## 5. Divulgação

- [ ] Rascunhos em `docs/divulgacao/` revisados; placeholders
      (`SEU_USUARIO/SEU_REPOSITORIO`) corrigidos antes de publicar os textos; o link de apoio não deve ser anunciado até existir.
- [ ] Sem links privados ou dados pessoais nos textos.

## 6. Pendências que dependem de decisão humana

- [x] Canal de segurança definido em `SECURITY.md` (`umnubim@gmail.com`).
- [x] Apoio financeiro descrito como opcional, sem placeholder de link quebrado.
- [ ] Adicionar link de apoio apenas se/quando a conta estiver configurada (opcional).
- [ ] Decidir se vai oferecer um **instalador** além do portátil (mudança de
      build não incluída).
