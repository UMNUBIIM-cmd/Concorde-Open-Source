# Concorde — Modo de uso

O **Concorde** é um chat estilo Discord (voz, vídeo, texto, GIFs, transmissão de
tela e "tocar junto") para usar com os amigos. Ele tem duas partes:

- **O app (`Concorde-1.2.0-portable.exe`)** — o programa que todo mundo abre no
  Windows. Não precisa instalar: é só dar dois cliques.
- **O servidor** — fica na internet, de graça (Render). Ele só apresenta as
  pessoas umas às outras e guarda o texto; **áudio e vídeo vão direto de PC para
  PC**. Como montar: `COMO_HOSPEDAR_SEU_SERVIDOR.md`.

---

## 1. Entrar

1. Abra o **Concorde**.
2. **Apelido**: como vão te chamar.
3. **Endereço do servidor**: já vem preenchido. Se for o servidor de outra
   pessoa, cole o link que ela te passou.
4. Escolha:
   - **Criar servidor** (dê um nome e receba um código tipo `CORDE-7KQ2X`), ou
   - **Entrar com código** (cole o código de um amigo).

> O servidor grátis "dorme" quando ninguém usa. A primeira entrada pode levar
> até ~1 minuto. Se der erro, espere um pouco e tente de novo.

---

## 2. Vários servidores

A **coluna da esquerda** (o "rail") mostra os servidores que você adicionou,
como no Discord:

- Clique num ícone para **trocar** de servidor (o app reconecta nele).
- Clique no **+** para **adicionar outro** servidor — por código de convite
  (Entrar com código) ou criando um novo.
- A **engrenagem** embaixo do rail abre as **Configurações** (áudio e perfil).

> O app fica conectado a **um servidor por vez**. Ao trocar, ele desconecta do
> anterior e conecta no escolhido.

---

## 3. A tela principal

- **Cabeçalho do servidor** (topo da 2ª coluna): clique nele para abrir as
  **Configurações do servidor** (trocar nome, ícone, copiar o convite ou sair).
- **Código de convite**: logo abaixo; clique para copiar e mandar aos amigos.
- **Canais de texto** (`#`) e **de voz** (alto-falante). Embaixo de cada sala de
  voz aparece quem está nela, quem está **AO VIVO**, com câmera ou mutado.
- **Mini player "Tocar junto"**: no fim da lista de canais (ver seção 8).
- **Barra do usuário** (canto inferior esquerdo): sua foto, seu apelido, o
  **ping** (latência), o botão de **Configurações** e, em chamada, o mutar.
- **Barra da direita**: **membros online e offline** (ver seção 4).

### Criar, renomear e excluir canais
- Clique no **+** ao lado de "CANAIS DE TEXTO" ou "CANAIS DE VOZ" → escolha o
  tipo, dê um nome → **Criar canal**.
- Passe o mouse num canal e clique na **engrenagem** para **renomear** ou
  **excluir** (clique duas vezes no botão vermelho para confirmar).
- Canais de texto viram `minusculas-com-hifen` (ex.: "Jogos Online" → `#jogos-online`).
- Excluir uma sala de voz com gente dentro desconecta todo mundo dela.
- O servidor sempre mantém pelo menos um canal de texto.

---

## 4. Membros online e offline

A barra da direita (visível fora da sala de voz) mostra:

- **Online** — quem está conectado agora (bolinha verde).
- **Offline** — quem já entrou no servidor e não está conectado no momento.

> Esse cadastro fica na memória do servidor. Se o servidor reiniciar (ou o plano
> grátis dormir), a lista é recriada conforme as pessoas voltam.

---

## 5. Perfil (apelido e foto)

Abra **Configurações** (engrenagem no rail à esquerda ou na barra do usuário) →
aba **Perfil**:

- **Trocar foto**: escolha uma imagem (ela é cortada em quadrado e reduzida
  automaticamente). **Remover** volta para a inicial colorida.
- **Apelido**: edite e clique em **Salvar perfil**.

A foto e o apelido aparecem para todos, no chat e nas chamadas.

---

## 6. Áudio: microfone, alto-falante e volumes

Em **Configurações → Voz e áudio**:

- **Dispositivo de entrada (microfone)**: escolha qual microfone usar.
- **Volume de entrada**: ajusta o quanto seu microfone é enviado (até 200%). Há
  um **medidor ao vivo** para você testar enquanto fala (quando está numa
  chamada).
- **Dispositivo de saída (alto-falante/fone)**: escolha por onde ouvir. Depende
  de um Windows/Chromium recente; se não estiver disponível, use o padrão do
  Windows.
- **Volume de saída**: volume geral do que você ouve (0–100%).

Tudo isso fica salvo para a próxima vez.

### Volume de cada pessoa — só para você
Cada participante tem **dois volumes separados**:

| Volume | O que controla |
|---|---|
| **Voz** | o microfone dela |
| **Transmissão** | o som do jogo/janela que ela está transmitindo |

Onde mexer: **passe o mouse no bloco** da pessoa/transmissão (na sala de voz) e
use o controle no canto, ou **clique no nome dela** na lista da sala. Vai de 0%
a 200%, e o alto-falante silencia. Só afeta o que **você** ouve; o Concorde
lembra o volume de cada amigo.

---

## 7. Na chamada

Clique numa sala de voz para entrar. A área do meio vira a **sala**:

- Cada pessoa aparece num bloco — a câmera, se estiver ligada, ou a foto/inicial.
- **Borda verde** = a pessoa está falando.
- **Clique num bloco** para colocá-lo em **foco** (grande, com os outros numa
  faixa embaixo). Clique de novo para voltar à grade.
- Quando alguém começa a transmitir, a transmissão entra em foco sozinha.
- Botão de **tela cheia** no canto do bloco (passe o mouse).
- O **ping** (latência em ms) aparece no painel "Voz conectada", com cor:
  verde (bom), amarelo (ok) e vermelho (alto).

Barra de baixo: 🎙️ mutar · 🎥 câmera · 🖥️ transmitir · ☎️ sair.

Para ver o chat de texto durante a chamada, clique num canal `#` — você continua
na chamada. Para voltar à sala, clique em "Voz conectada".

### Transmitir (tela ou janela)
1. Clique em **🖥️ Transmitir**.
2. Aba **Aplicativos** (uma janela — ex.: o jogo) ou **Telas inteiras**.
3. **Qualidade**: Baixa (720p 30fps), Média (1080p 30fps) ou Alta (1080p 60fps).
4. **Áudio da transmissão** (liga/desliga):
   - Transmitindo uma **janela** → vai **só o som daquele programa**. Música de
     fundo, outros apps e **a voz da chamada ficam de fora**.
   - Transmitindo a **tela inteira** → vai o som do PC **menos o Concorde**, ou
     seja, a voz da chamada também nunca entra.
5. **Transmitir** (ou dê dois cliques na janela).

Na sua própria transmissão aparece uma **barrinha verde** mostrando que o som
está sendo capturado.

### Por que não tem eco
Capturar o "som do computador inteiro" levaria junto a voz dos seus amigos que
toca no seu PC — e ela voltaria para eles (eco). O Concorde usa um capturador
próprio que pega o som **de um programa só** (recurso do Windows 10 versão 2004
ou mais novo, o mesmo que o OBS usa). A voz da chamada toca dentro do Concorde,
e o Concorde nunca é capturado. Ninguém se ouve de volta.

> Se o seu Windows for mais antigo, a opção de som aparece como "Indisponível" e
> a transmissão vai sem som.

---

## 8. GIFs e "tocar junto"

### GIFs
No campo de mensagem, clique em **GIF** → busque no Giphy → clique no GIF para
enviar. (A busca usa uma chave pública do Giphy; se ela estiver no limite, quem
cuida do projeto pode trocar por uma chave própria em `src/config.js`.)

### Mini player (tocar junto)
No fim da lista de canais, **Tocar junto**:

1. Cole um **link do YouTube** e dê **+** (ou Enter).
2. O vídeo toca **sincronizado para todos do servidor**. Quem mexe em
   **tocar/pausar/parar** controla para todos; o **volume** é só seu.

> É "assistir/ouvir junto" sincronizado — o áudio do YouTube **não** entra na
> chamada; cada pessoa ouve no próprio player. Precisa de internet para carregar
> o YouTube.

---

## 9. Problemas comuns

- **"Não foi possível conectar"** → endereço errado ou servidor acordando.
  Espere ~1 minuto e tente de novo.
- **Aviso de "servidor desatualizado"** → quem cuida do servidor precisa subir o
  `server/index.js` novo (veja o guia de hospedagem, "Atualizar o servidor").
- **Fica "conectando…" no bloco de alguém** → a rede de um dos dois bloqueia a
  conexão direta. Veja "TURN" no guia de hospedagem.
- **Ninguém me ouve** → veja se não está mutado, se escolheu o microfone certo
  em Configurações, e se o Windows deu permissão de microfone (Configurações →
  Privacidade → Microfone).
- **Não consigo trocar o alto-falante** → depende do Windows/versão; use o
  dispositivo padrão do Windows.
- **Transmissão travando** → baixe a qualidade para 720p.
- **Transmiti a janela mas foi sem som** → alguns programas tocam o som por
  outro processo (ex.: jogos com launcher). Transmita a **tela inteira** — o som
  do PC vai, sem a voz da chamada.
- **GIF não carrega** → a chave pública do Giphy pode estar no limite; troque por
  uma chave própria em `src/config.js`.
- **Antivírus reclamou do capturador de som** → é o `concorde-audio.exe` (captura o
  som da janela); libere-o.
