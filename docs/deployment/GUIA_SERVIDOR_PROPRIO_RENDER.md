# Criar o seu servidor Concorde de graça (Render + Neon) — guia completo

Este guia leva você do zero até um servidor Concorde próprio, com **persistência
de dados** num banco **PostgreSQL** gratuito no **Neon** e o servidor hospedado no
**Render**. É para iniciantes: cada etapa explica o porquê.

> O servidor faz a **sinalização** das chamadas e cuida do **chat de texto**, e
> **lê/grava o estado** (servidores, canais, mensagens, cadastro de membros) no
> banco. Voz, vídeo e tela vão **direto entre os participantes** (P2P) e **não**
> passam pelo servidor nem pelo banco. Algumas redes exigem **TURN** para a
> chamada funcionar (ver o fim do guia).

**Diagramas:** [arquitetura geral](../images/arquitetura-concorde.png) ·
[fluxo de persistência](../images/fluxo-persistencia.png) ·
[configuração e deploy](../images/deploy-render-neon.png).

---

## ⚠️ Leia antes: o que já foi feito e o que você precisa validar

Para ser transparente (e não afirmar nada sem evidência):

- **Documentado a partir do código (evidência):** a persistência PostgreSQL está
  implementada na branch **`feature/postgres-persistence`** — o servidor cria as
  tabelas, grava a cada alteração e restaura tudo no boot. Veja `server/index.js`
  e `server/persistence.js` **nessa branch**.
- **Ainda não mesclado:** na última verificação, essa branch **não estava mesclada
  em `main`**. A `main` roda **apenas em memória** (sem `pg`). Para ter
  persistência no Render, faça o deploy **a partir da branch de persistência** (ou
  mescle-a antes) e configure a `DATABASE_URL`.
- **Precisa da sua validação:** se **você** já criou o banco no Neon, conectou o
  Render e confirmou a recuperação após reinício, esses passos estão **feitos no
  seu ambiente** — mas **não foram verificados por este guia**. Onde um passo
  depende de você confirmar, está marcado com **[validar você]**.
- **Comportamento a conhecer:** na branch de persistência, o servidor **exige**
  `DATABASE_URL`. Se ela faltar ou estiver errada, o servidor **encerra no boot**
  (não há, por ora, modo de memória como alternativa automática nessa branch).

> Todos os valores de banco/credenciais neste guia são **exemplos fictícios**.
> Nunca use ou publique credenciais reais no código ou no GitHub.

---

## Etapa A — Pré-requisitos

- **Conta no GitHub** (grátis): https://github.com — guarda o projeto e conecta ao
  Render. Para enviar pastas inteiras sem subir arquivo por arquivo, recomendamos o
  **GitHub Desktop**: https://desktop.github.com/.
- **Conta no Render** (grátis): https://render.com — **hospeda** o servidor.
- **Conta no Neon** (grátis): https://neon.tech — fornece o **banco PostgreSQL**.
- **Git e Node.js não são obrigatórios** para hospedar pelo Render (o GitHub
  Desktop resolve o envio). Para **testar localmente**, instale o **Node.js 20 ou
  mais recente, abaixo da 25** (https://nodejs.org); o instalador inclui o `npm`.

**Requisitos verificados no projeto (evidência):**
- O servidor declara Node.js **20 até 24** em `server/package.json`.
- Dependências do servidor: **`socket.io`** e, na branch de persistência, **`pg`**.
- Variáveis de ambiente: **`PORT`** (sempre) e **`DATABASE_URL`** (na branch de
  persistência).

---

## Etapa B — Criar a conta e o projeto no Neon

1. Acesse https://neon.tech e crie uma conta grátis (pode usar login do GitHub ou
   Google).
2. Crie um **projeto** (ex.: nome `concorde`). O Neon já cria, junto, um banco
   PostgreSQL inicial.
3. Escolha a **região** mais próxima dos seus amigos (ex.: um data center nos EUA
   ou na Europa). Dica: para reduzir latência, use a mesma região (ou próxima) da
   que você escolher no Render.

> O plano gratuito do Neon é suficiente para uso casual. Ele pode **pausar** o
> banco (autosuspend) após inatividade e tem limites de armazenamento/uso —
> consulte o site do Neon, pois as condições mudam.

---

## Etapa C — Identificar o banco e obter a string de conexão

1. No painel do projeto, abra **Dashboard** → procure o botão **Connect** (ou
   "Connection Details").
2. Você verá uma **connection string** parecida com (exemplo **fictício**):

   ```
   postgresql://concorde_user:SENHA_EXEMPLO_NAO_REAL@ep-exemplo-123456.us-east-2.aws.neon.tech/concorde?sslmode=require
   ```

3. **Prefira a connection string "Pooled"** (com `-pooler` no host), quando o Neon
   oferecer essa opção. Ela usa um *pooler* de conexões, mais adequado para um
   serviço web que abre/fecha conexões com frequência. O código do servidor já
   limita o pool a poucas conexões.
4. **Copie essa string inteira.** Ela é a sua **`DATABASE_URL`** (próxima etapa).

> O usuário/senha fazem parte da string. Trate-a como **segredo**: nunca a coloque
> no código, em prints, em issues ou no GitHub. Se vazar, **gere uma nova** (reset
> de senha / nova role no Neon).

---

## Etapa D — Entender a `DATABASE_URL` e o SSL

- **`DATABASE_URL`** é uma única variável de ambiente que contém tudo que o
  servidor precisa para falar com o banco: usuário, senha, host, nome do banco e
  opções. O código lê `process.env.DATABASE_URL`.
- **SSL é obrigatório no Neon.** A string costuma trazer `?sslmode=require`, e o
  servidor já conecta com SSL habilitado. Mantenha o `sslmode=require` na string.
- Estrutura (para entender, **valores fictícios**):

  ```
  postgresql:// usuario : senha @ host-do-neon / nome_do_banco ?sslmode=require
  ```

- O que o servidor faz com ela (evidência, branch de persistência):
  - No **boot**, cria as tabelas `concorde_guilds` e `concorde_roster` se não
    existirem e **carrega** o estado salvo (`restoreGuilds()`).
  - A cada alteração, **grava** (UPSERT em JSONB) via `persistGuild()`.

---

## Etapa E — Publicar o projeto no GitHub

Para o Render acessar o código, ele precisa estar no GitHub.

1. Extraia o projeto (ex.: o ZIP `Concorde-Open-Source-1.2.0-...zip`) numa pasta
   **permanente**.
2. Abra o **GitHub Desktop** e entre na sua conta.
3. **File → Add local repository** e aponte para a pasta do projeto; se ela ainda
   não for um repositório Git, escolha **criar um repositório novo**.
4. Confirme que a pasta contém `app/`, `server/`, `docs/` e `render.yaml` na raiz.
5. **Publish repository** (pode deixar **público** para a comunidade baixar).
6. O `.gitignore` já exclui `.env` e `node_modules`. **Não** adicione a
   `DATABASE_URL` nem nenhuma senha ao repositório.

> **Importante (branch):** a persistência está na branch
> **`feature/postgres-persistence`**. Garanta que essa branch exista no seu
> repositório no GitHub — é ela que você vai selecionar no Render. Se preferir usar
> a `main`, mescle a branch de persistência nela **antes** (decisão sua; veja a
> nota de status no topo).

---

## Etapa F — Criar o serviço no Render conectado ao repositório

1. Entre no **Render** (https://render.com) — pode usar login do GitHub.
2. **New + → Web Service** (recomendado quando há banco, para você controlar a
   branch e as variáveis). Conecte o GitHub e **selecione o repositório** do
   Concorde.
3. Configure:
   - **Branch:** `feature/postgres-persistence` (ou `main`, se você já mesclou).
   - **Root Directory:** `server`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** **Free**
4. **Ainda não finalize** — antes, configure a variável de ambiente (próxima etapa).

> **Sobre o Blueprint (`render.yaml`):** o `render.yaml` da raiz facilita a
> primeira criação, mas **não** define a `DATABASE_URL` (ela é um segredo e não
> fica no repositório). Mesmo usando o Blueprint, você precisará **adicionar a
> `DATABASE_URL` manualmente** nas variáveis do serviço. Por isso, para um servidor
> com banco, o **Web Service manual** costuma ser mais direto.

---

## Etapa G — Configurar a `DATABASE_URL` no Render (sem expor credenciais)

1. Na criação do Web Service (ou depois, em **Settings → Environment**), encontre
   **Environment Variables**.
2. Clique em **Add Environment Variable**:
   - **Key:** `DATABASE_URL`
   - **Value:** cole a connection string do Neon (a da Etapa C).
3. **Não** defina `PORT` — o Render injeta essa variável automaticamente.
4. Salve. A `DATABASE_URL` fica **apenas** no Render, **nunca** no GitHub nem no
   código. ✅

> Boa prática: no Neon, se possível, crie uma **role/usuário dedicada** para o
> Concorde, com acesso só a esse banco. Assim você pode revogar/rotacionar essa
> credencial sem afetar o resto.

---

## Etapa H — Primeiro deploy e leitura dos logs

1. Finalize a criação do serviço (ou clique em **Manual Deploy → Deploy latest
   commit**).
2. Acompanhe a aba **Logs**. Em um deploy bem-sucedido **com banco**, você verá
   algo como:

   ```
   Servidores restaurados do PostgreSQL: 0
   Concorde server ouvindo na porta 10000
   ```

   (o número da porta é definido pelo Render; "0" é normal no primeiro deploy,
   quando o banco ainda está vazio).
3. Espere o status ficar **Live** (verde).
4. **Teste o endereço público:** abra a URL do serviço (ex.:
   `https://meu-concorde.onrender.com`). Deve aparecer **"Concorde server online.
   Servidores ativos: N"**.

---

## Etapa I — Validar inicialização, conexão ao banco e recuperação

**[validar você]** — estes passos confirmam que a persistência está mesmo
funcionando no seu ambiente:

1. **Conexão ao banco:** nos logs do deploy, a linha `Servidores restaurados do
   PostgreSQL: N` indica que o servidor **conectou e leu** o banco. Se em vez disso
   aparecer `Falha ao restaurar servidores do PostgreSQL: ...`, veja a Etapa J.
2. **Gravação:** abra o app, aponte para a URL do Render, **crie um servidor**,
   crie um canal e **envie algumas mensagens**.
3. **Recuperação após reinício:** no Render, faça **Manual Deploy → Restart
   service** (ou aguarde uma hibernação/novo deploy). Quando voltar:
   - os logs devem mostrar `Servidores restaurados do PostgreSQL: 1` (ou mais);
   - no app, **reentre com o mesmo código de convite** — seus canais e mensagens
     devem estar lá.
4. **(Opcional) Conferir no Neon:** no painel do Neon, abra o **SQL Editor** e rode
   `SELECT code, name FROM concorde_guilds;` — você deve ver o servidor que criou.

> Se a recuperação funcionar, a persistência está ativa. Se os dados **sumirem**
> após o restart, provavelmente o deploy está rodando a branch **sem** persistência
> (confira a **Branch** em Settings) ou a `DATABASE_URL` não está configurada.

---

## Etapa J — Diagnóstico de falhas

| Sintoma (nos logs ou no app) | Causa provável / o que verificar |
|---|---|
| `Falha ao restaurar servidores do PostgreSQL: ...` e o serviço **encerra** | `DATABASE_URL` ausente, errada ou o banco inacessível. Confira a variável em **Settings → Environment** e teste a string. Lembre: nessa branch, sem banco o servidor **não sobe**. |
| `password authentication failed for user "..."` | Usuário/senha errados na `DATABASE_URL`. Copie a string de novo no Neon (ou gere nova senha) e atualize a variável no Render. |
| `no pg_hba.conf entry` / `SSL required` / `connection ... SSL` | Falta o SSL. Garanta `?sslmode=require` na string (o Neon exige SSL). |
| `getaddrinfo ENOTFOUND` / `timeout` ao conectar | Host do Neon errado na string, ou o banco do Neon está **pausado/suspenso** — abra o painel do Neon para reativar e confirme o host. |
| `too many connections` | Use a string **"Pooled"** (com `-pooler`) do Neon; o pool do servidor já é pequeno (máx. 5). |
| Deploy `Failed` no build/start | `Root Directory` deve ser `server`; comandos `npm install` / `npm start`. Veja os Logs. |
| App preso em **"Conectando ao servidor"** | Serviço **hibernando** (espere ~1 min) ou **endereço errado**. Abra a URL no navegador: deve dizer "Concorde server online". |
| **Falha ao entrar por código de convite** | Com persistência, o servidor deveria voltar após reinício. Se o código sumiu, o deploy pode estar na branch **sem** banco, ou a gravação falhou — veja as duas primeiras linhas desta tabela. Códigos têm o formato `CORDE-XXXXX`. |
| **`401` / `403`** ao acessar um serviço externo | Não vêm do PostgreSQL. Costumam ser **autorização** em serviço de terceiro (ex.: chave do **Giphy** inválida/sem permissão → GIFs não carregam; credenciais de **TURN** erradas → chamada não conecta em certas redes). Verifique a chave/credencial do serviço correspondente. |
| Servidor **demora a acordar** | Normal no plano Free (Render e/ou Neon hibernam). A 1ª requisição após a suspensão pode levar ~1 min. Não recomendamos "pings" para burlar os limites do plano. |

### Comandos de diagnóstico seguros

```bash
# O servidor está no ar? (troque pela sua URL) — deve responder "Concorde server online"
curl https://SEU-SERVICO.onrender.com

# Testar localmente (precisa de Node 20+). Defina a DATABASE_URL só no seu terminal,
# NUNCA commitada. Exemplo (valor fictício):
cd server
npm install
# Linux/macOS:
DATABASE_URL="postgresql://usuario:senha@host.neon.tech/concorde?sslmode=require" npm start
# Windows (PowerShell):
#   $env:DATABASE_URL="postgresql://usuario:senha@host.neon.tech/concorde?sslmode=require"; npm start
# Em outro terminal:
curl http://localhost:3001
```

Resultado esperado: **"Concorde server online. Servidores ativos: N"**. Nos logs,
`Servidores restaurados do PostgreSQL: N` confirma a conexão ao banco.

---

## Etapa K — Limitações do plano gratuito e confiabilidade

- **As condições dos planos gratuitos (Render e Neon) podem mudar** — confira os
  sites oficiais.
- **Render Free:** o serviço **suspende** após ~15 min sem tráfego de entrada e
  pode levar cerca de **1 minuto** para voltar na próxima requisição. Sem garantia
  de disponibilidade contínua; há limites de horas/banda.
- **Neon Free:** o banco pode **pausar (autosuspend)** após inatividade e tem
  limites de armazenamento/uso. A primeira consulta após a pausa pode demorar um
  pouco.
- **1 instância:** mantenha **uma única instância** do servidor. Parte do estado de
  tempo real (presença, ocupação de canais de voz) vive em memória do processo; com
  várias instâncias esse estado não seria compartilhado.
- **O que a persistência garante:** servidores, canais, mensagens e cadastro de
  membros **voltam** após reinício/hibernação (restaurados do banco). **O que ela
  não cobre:** quem está online agora, quem está em cada canal de voz e as conexões
  WebRTC — isso é efêmero e se refaz quando as pessoas reconectam.

**Para algo mais confiável** (menos hibernação, mais garantias), considere planos
pagos no Render e/ou Neon, ou outro provedor equivalente. Isso é uma
**recomendação** — não é necessário para uso casual entre amigos.

---

## TURN (opcional) — quando alguém não consegue conectar na chamada

Algumas redes (internet móvel, CGNAT, redes corporativas) bloqueiam a conexão P2P
direta. A solução é um servidor **TURN**:

1. Crie uma conta grátis num serviço de TURN (ex.: **Metered Open Relay** — há cota
   gratuita mensal) e pegue o endereço, usuário e senha.
2. Em `app/src/config.js`, adicione na lista `ICE_SERVERS` (valores **fictícios**):
   ```js
   { urls: 'turn:ENDERECO:443', username: 'USUARIO', credential: 'SENHA' },
   ```
3. Recompile o `.exe`.

> Credenciais de TURN colocadas no app são credenciais de **cliente** (ficam
> embutidas no executável). Use credenciais limitadas/curtas quando possível. Erros
> **`401`/`403`** do serviço de TURN indicam credencial inválida.
