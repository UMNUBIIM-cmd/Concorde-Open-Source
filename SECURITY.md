# Política de Segurança

## Como relatar uma vulnerabilidade

Se você encontrar uma falha de segurança, **não abra uma issue pública**. Em vez
disso, use um canal privado:

- Abra um *Security Advisory* privado no GitHub (aba **Security → Report a
  vulnerability**), ou
- Entre em contato de forma privada com o mantenedor do repositório.

Contato privado de segurança: **umnubim@gmail.com**.

Este endereço ficará público no repositório. Use-o apenas para relatos de segurança;
para outros assuntos, prefira abrir uma issue comum.

Pedimos divulgação responsável: dê um prazo razoável para correção antes de
tornar a falha pública.

## O que esperar

- Confirmação de recebimento assim que possível.
- Avaliação do impacto e, se confirmado, uma correção ou mitigação.
- Crédito ao relator, se desejar.

## Modelo de segurança (resumo)

- O **app desktop** roda em Electron com `contextIsolation`, `sandbox`,
  `nodeIntegration: false`, `webSecurity` e uma **CSP restritiva**. O `preload`
  expõe apenas o mínimo (listar telas, escolher a fonte de captura e o capturador
  de som).
- **Áudio e vídeo são P2P (WebRTC)** e vão direto entre os participantes; o
  servidor não recebe mídia.
- O **servidor** apenas repassa a sinalização e guarda texto **em memória**. Não
  há autenticação por senha: quem tiver o **endereço + código de convite** entra.
  Trate o código de convite como um segredo de acesso ao seu servidor.

## Componentes e dados sensíveis

- **`app/src/config.js`** guarda apenas configurações **públicas** de cliente
  (endereço do servidor, chave pública do Giphy, STUN/TURN). **Nunca** coloque
  senhas, tokens ou chaves privadas aí.
- **Capturador de áudio nativo** (`app/electron/native/bin/concorde-audio.exe`):
  binário Windows compilado a partir do código em
  `app/electron/native/concorde-audio/main.go` (Go, sem dependências externas).
  Você pode auditá-lo e recompilá-lo — veja `app/electron/native/README.md`.
  Antivírus podem alertar sobre executáveis sem assinatura digital.
- **TURN**: se você adicionar um servidor TURN com usuário/senha em
  `ICE_SERVERS`, lembre-se de que essas credenciais ficam no app distribuído
  (são credenciais de cliente); use credenciais de curta duração/limitadas quando
  possível.

## Boas práticas ao hospedar

- Não compartilhe o código de convite publicamente se não quiser estranhos no seu
  servidor.
- Se expor um servidor próprio, mantenha o Node.js e as dependências atualizados
  (`npm audit`).
