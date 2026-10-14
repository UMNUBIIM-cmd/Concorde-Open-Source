# Contribuindo com o Concorde

Obrigado por querer ajudar! O Concorde é um projeto comunitário e toda ajuda é
bem-vinda: código, documentação, tradução, testes e ideias.

## Como relatar um bug

Abra uma *issue* no repositório com:

1. O que você esperava que acontecesse e o que aconteceu.
2. Passos para reproduzir (o mais detalhado possível).
3. Seu sistema (versão do Windows) e se está usando o `.exe` portátil ou o modo
   de desenvolvimento.
4. Logs ou mensagens de erro, se houver.
5. **Não inclua dados pessoais** (apelidos reais de terceiros, códigos de convite
   ativos, endereços de servidores privados, prints com informações sensíveis).

## Como sugerir uma melhoria

Abra uma *issue* descrevendo a ideia e o problema que ela resolve. Discussão
antes de um *pull request* grande evita retrabalho.

## Ambiente de desenvolvimento

Pré-requisitos: **Node.js 18+** (recomendado 20 LTS) e **Git**. Para recompilar o
capturador de áudio nativo (opcional), também o **Go** (https://go.dev).

```bash
# App desktop
cd app
npm install
npm run dev          # abre o app em modo desenvolvimento

# Servidor (em outro terminal)
cd server
npm install
npm start            # sobe o servidor em http://localhost:3001
```

Detalhes de compilação no Windows: `docs/installation/COMPILAR_NO_WINDOWS.md`.

## Estilo e escopo

- Mantenha mudanças focadas: um *pull request* por assunto.
- Siga o estilo do código existente (sem adicionar ferramentas de formatação
  novas sem combinar antes).
- Teste manualmente o fluxo afetado (entrar, criar canal, voz, transmissão…).
- Descreva no PR **o que** mudou e **por quê**, e como testar.

## Segredos e privacidade

- **Nunca** faça commit de `.env`, chaves privadas, tokens, senhas, endereços de
  servidores privados ou dados de usuários.
- A configuração pública fica em `app/src/config.js` (apenas chaves **públicas**
  de cliente) e nas variáveis de ambiente do servidor (`PORT`).
- Antes de abrir um PR, rode `node scripts/validar-config.mjs` e confira que não
  está incluindo configuração pessoal.

## Divulgação responsável de vulnerabilidades

Problemas de segurança **não** devem ir para issues públicas. Veja
[SECURITY.md](SECURITY.md).

## Licença das contribuições

Ao contribuir, você concorda que sua contribuição será licenciada sob a mesma
licença do projeto (proposta: MIT — ver [LICENSE](LICENSE)).
