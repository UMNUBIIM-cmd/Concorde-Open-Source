# Criar o seu servidor Concorde de graça (Render) — guia completo

Este guia leva você do zero até um servidor Concorde próprio no **Render**. O plano Free pode servir para testes e uso casual, mas tem limitações e não garante disponibilidade contínua.

É para iniciantes: cada etapa explica o porquê.

> O servidor faz a **sinalização** das chamadas e mantém texto/estado em memória.
> Voz, vídeo e tela tentam ir diretamente entre participantes (P2P). Isso reduz o
> tráfego no servidor, mas algumas redes exigem TURN para chamadas funcionarem.

---

## Etapa A — Pré-requisitos

- **Conta no GitHub** (grátis): https://github.com — guarda o projeto e permite conectar o Render. Para enviar pastas inteiras sem precisar subir dezenas de arquivos manualmente, recomendamos o aplicativo GitHub Desktop: https://desktop.github.com/.
- **Conta no Render** (grátis): https://render.com — é quem vai **hospedar** o
  servidor na internet.
- **Git e Node.js não são necessários para hospedar pelo Render.** Para publicar
  a pasta completa sem enviar arquivo por arquivo, recomendamos o GitHub Desktop:
  https://desktop.github.com/.
  - Para testar localmente, instale o **Node.js 20 ou mais recente, abaixo da
    versão 25** (https://nodejs.org). O instalador inclui o `npm`.

**Requisitos verificados no projeto:**
- O servidor declara Node.js **20 até 24** em `server/package.json`.
- Dependência do servidor: **`socket.io`** (instalada pelo `npm install`).
- O servidor usa apenas a variável de ambiente **`PORT`**
  (`process.env.PORT || 3001`).

---

## Etapa B — Publicar o projeto no GitHub

Para usar a configuração automática, o repositório precisa conter o projeto
completo. O arquivo `render.yaml` fica na raiz e aponta para `server/`.

1. Extraia o ZIP `Concorde-Open-Source-1.2.0-pronto-para-revisao.zip` em uma
   pasta permanente no computador.
2. Crie uma conta em https://github.com, se ainda não tiver uma.
3. Instale e abra o GitHub Desktop: https://desktop.github.com/ e entre na sua
   conta.
4. No GitHub Desktop, escolha **File → Add local repository**. Se a pasta ainda
   não for um repositório Git, escolha a opção para **criar um repositório novo**
   e use a pasta extraída `Concorde-Open-Source` como caminho local.
5. Confira que a pasta selecionada contém `app/`, `server/`, `docs/` e
   `render.yaml` na raiz. Dê um nome ao repositório e crie-o.
6. Clique em **Publish repository**. Para permitir que a comunidade baixe o
   código, deixe o repositório **público**. Revise a lista de arquivos antes de
   publicar.
7. O `.gitignore` exclui `.env` reais e pastas `node_modules`. Não adicione
   senhas, tokens ou credenciais privadas manualmente.

**Importante:** não envie somente o conteúdo de `server/` se pretende usar o
**Blueprint**, porque o `render.yaml` da raiz espera encontrar essa pasta. Se
quiser publicar apenas o servidor, use a configuração manual de **Web Service**
no Render, com **Root Directory** vazio e os comandos `npm install` e `npm start`.

**App x servidor:** o app desktop (pasta `app/`) é o que as pessoas abrem no
Windows; o servidor (pasta `server/`) é o que roda na nuvem. O Render executará
apenas a pasta `server/`, indicada no `render.yaml`. O servidor não exige chaves
secretas.

---

## Etapa C — Entender o servidor (estrutura mínima)

O repositório completo tem esta estrutura relevante:

```
Concorde-Open-Source/
├─ render.yaml     # configuração Blueprint, na raiz do repositório
├─ app/            # aplicativo desktop
└─ server/
   ├─ index.js     # servidor Socket.IO
   └─ package.json # dependências e script "start"
```

Comandos reais (iguais ao que o Render vai rodar):

```bash
npm install     # instala as dependências
npm start       # inicia o servidor (node index.js)
```

**Testar no seu PC (opcional):**
```bash
cd server
npm install
npm start
# Deve aparecer: "Concorde server ouvindo na porta 3001"
# Abra http://localhost:3001 no navegador -> "Concorde server online"
```

**Variáveis de ambiente:** o único valor usado é `PORT`. Localmente ele cai em
`3001`. No Render, a plataforma define `PORT` automaticamente — você **não**
precisa configurar nada. Não há segredos a preencher.

---

## Etapa D — Publicar no Render

1. Entre no **Render** (https://render.com) e crie sua conta. Você pode usar o login do GitHub.
2. No painel, clique em **New + → Blueprint**.
3. Conecte o GitHub se solicitado e autorize o acesso ao repositório que você publicou.
4. Selecione o repositório completo do Concorde. O Render deve detectar `render.yaml` na raiz.
5. Confira os valores definidos pelo Blueprint: **Root Directory** `server`, **Build Command** `npm install`, **Start Command** `npm start` e plano **Free**.
6. Confirme a criação e aguarde o deploy terminar com status **Live**.

**Se o Blueprint não for detectado:** clique em **New + → Web Service**, conecte o mesmo repositório e configure manualmente: **Root Directory** `server`, **Build Command** `npm install`, **Start Command** `npm start` e plano **Free**. Não configure `PORT` manualmente; o Render fornece essa variável.

7. Abra a aba **Logs** e confirme que aparece `Concorde server ouvindo na porta ...`.
8. Abra a URL pública gerada pelo Render (por exemplo, `https://meu-concorde.onrender.com`). A resposta deve conter `Concorde server online`.
9. Abra o Concorde e, na tela de entrada, cole essa URL em **Endereço do servidor**. Use `https://` e não acrescente `/` no final. Não é necessário recompilar o app se a tela permitir informar o endereço.
10. Para validar a conexão, abra o app em dois computadores, configure a mesma URL, crie um servidor em um deles e entre pelo código de convite no outro. Teste texto e depois uma chamada de voz. O teste de voz depende também da conectividade P2P da rede; se falhar em determinadas redes, veja a seção TURN.

**Sobre Socket.IO / WebSockets no Render:** o plano web do Render suporta
WebSockets automaticamente; não é preciso configuração extra. O servidor escuta
em `process.env.PORT` (já tratado). Como o estado é **em memória**, se houver
mais de uma instância os dados não seriam compartilhados — mantenha **1 instância**
(o plano Free já é 1 instância).

---

## Etapa E — Limitações do plano gratuito (honesto)

- As **condições do plano gratuito podem mudar** a qualquer momento (consulte o
  site do Render).
- O serviço Free entra em suspensão após 15 minutos sem tráfego de entrada e pode levar cerca de um minuto para voltar após uma nova requisição. Consulte a documentação atual do Render, pois limites e condições podem mudar.
- **Não há garantia de disponibilidade contínua.** Hospedagem gratuita tem
  limites (horas de execução, largura de banda, etc.).
- **Estado em memória:** servidores, canais, mensagens e o cadastro de membros
  ficam **na memória** do processo. Quando o servidor **reinicia ou hiberna**,
  esses dados são **recriados conforme as pessoas voltam** (não há banco de dados
  persistente por padrão). Para persistência, seria preciso adicionar um
  armazenamento — não incluído nesta versão.

Não prometemos disponibilidade permanente nem hospedagem ilimitada.

---

## Etapa F — Solução de problemas

| Problema | O que verificar |
|---|---|
| **Deploy `Failed`** | Veja os Logs no Render. Erros comuns: `Root Directory` errado (deve apontar para onde está o `package.json` do servidor), ou `Build/Start Command` diferentes de `npm install` / `npm start`. |
| **App preso em "Conectando ao servidor"** | O servidor pode estar **hibernando** (espere ~1 min e tente de novo) ou o **endereço está errado**. Abra a URL no navegador: deve mostrar "Concorde server online". |
| **Endereço do servidor incorreto** | Use `https://...onrender.com` **sem** barra no final. Confirme que é o endereço do **seu** serviço no Render. |
| **Erros de conexão Socket.IO** | Confirme que abriu a URL certa e que o serviço está **Live**. Em redes muito restritas, pode ser necessário um **TURN** (veja abaixo). |
| **Falha ao entrar por código de convite** | O código existe só enquanto o servidor estiver no ar com aquele servidor criado. Se o Render **reiniciou**, o código antigo some — crie de novo e redistribua. Códigos têm o formato `CORDE-XXXXX`. |
| **Problemas de variáveis de ambiente** | O servidor **não** exige variáveis. Se você definiu `PORT` manualmente, remova — o Render define sozinho. |
| **Servidor demora para acordar** | Comportamento normal do plano Free. A primeira requisição após a suspensão pode demorar cerca de um minuto. Não recomendamos serviços de ping como forma de contornar os limites do plano. |
| **Difere entre `dev` e `portátil`** | No `dev` você aponta para `http://localhost:3001`; no `.exe` distribuído, o app deve apontar para o endereço **público** do Render (em `config.js` ou digitado na tela de entrada). |

### Comandos de diagnóstico seguros

```bash
# O servidor está no ar? (troque pela sua URL) — deve responder "Concorde server online"
curl https://SEU-SERVICO.onrender.com

# Testar localmente a porta padrão
cd server && npm install && npm start
# em outro terminal:
curl http://localhost:3001
```

Resultado esperado: a página de texto **"Concorde server online. Servidores ativos: N"**. Se não responder, confira os logs e se o serviço está Live; se estiver no Free, aguarde o despertar do serviço e tente novamente.

---

## TURN (opcional) — quando alguém não consegue conectar na chamada

Algumas redes (internet móvel, CGNAT, redes corporativas) bloqueiam a conexão
P2P direta. A solução é um servidor **TURN**:

1. Crie uma conta grátis num serviço de TURN (ex.: Metered Open Relay — há cota
   gratuita mensal) e pegue o endereço, usuário e senha.
2. Em `app/src/config.js`, adicione na lista `ICE_SERVERS`:
   ```js
   { urls: 'turn:ENDERECO:443', username: 'USUARIO', credential: 'SENHA' },
   ```
3. Recompile o `.exe`.

> Lembre: credenciais de TURN colocadas no app são credenciais de **cliente**
> (ficam embutidas no executável). Use credenciais limitadas quando possível.
