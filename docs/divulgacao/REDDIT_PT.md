# Rascunho de divulgação — Reddit (Português)

> Não publique automaticamente. Revise, ajuste o tom à comunidade e substitua os
> placeholders `SEU_USUARIO/SEU_REPOSITORIO` e `PAYPAL_SUPPORT_URL` antes de postar.
> Sugestões de comunidades: r/brdev, r/opensource (em inglês), r/selfhosted (em inglês),
> r/InternetBrasil. Leia as regras de cada sub antes de postar.

---

**Título:** Concorde — um "mini Discord" open source onde você hospeda o seu próprio servidor (grátis)

**Corpo:**

Fiz um projeto open source chamado **Concorde**: um app de desktop (Windows) para
conversar com amigos por **voz, vídeo, texto e compartilhamento de tela**, no
estilo servidores e canais. A ideia central é **auto-hospedagem**: cada pessoa
sobe o **próprio servidor** de graça e convida quem quiser — sem depender da
infraestrutura de ninguém, sem anúncios e com o código aberto para auditar.

**Alguns detalhes técnicos:**
- App em **Electron + React**; servidor em **Node.js + Socket.IO**.
- Voz/vídeo/tela são **P2P (WebRTC)** — o servidor só faz a sinalização e guarda
  o texto, então ele é leve e cabe no plano gratuito do Render.
- Transmissão de tela com **som só do aplicativo** (captura por processo no
  Windows), para não levar a voz da chamada junto (sem eco).
- Volume por pessoa (voz e transmissão separados), escolha de microfone/saída,
  GIFs, e um "tocar junto" sincronizado de vídeos do YouTube.

**Honestidade sobre limites:** é um projeto de comunidade, não um produto
comercial. O plano gratuito do Render **hiberna** quando ninguém usa (demora uns
segundos para acordar) e o estado do servidor é **em memória** (reiniciou,
recria conforme as pessoas voltam). O executável **não é assinado**, então o
Windows pode mostrar um aviso do SmartScreen.

**Não é afiliado ao Discord** nem a nenhum outro app — é só uma alternativa
comunitária.

Código, guia de "suba seu servidor em 10 minutos" e instruções de build:
👉 https://github.com/SEU_USUARIO/SEU_REPOSITORIO

Adoraria feedback, issues e PRs. Se alguém testar hospedando o próprio servidor e
contar como foi, ajuda muito. 🙌

*(Opcional) Se quiser apoiar o desenvolvimento, há um link de doação voluntária
no README — não destrava nada, é só carinho.*
