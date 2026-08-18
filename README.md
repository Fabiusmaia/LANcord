# LANcord

Clone minimalista do Discord para jogar com os amigos na mesma LAN (via [Radmin VPN](https://www.radmin-vpn.com/)): chat de voz + compartilhamento de tela + chat de texto, sem contas, sem servidor na nuvem.

## Estrutura

- `server/` — servidor de sinalização (Node + Socket.io). Um dos amigos deixa rodando.
- `app/` — cliente desktop (Electron + React + TypeScript). Cada pessoa instala o seu.

## Rodando o servidor (host)

```
cd server
npm install
npm run dev
```

O servidor sobe em `0.0.0.0:3001`. Compartilhe o seu IP da Radmin VPN (ex: `26.x.x.x`) e a porta `3001` com quem for entrar.

## Rodando o cliente em desenvolvimento

```
cd app
npm install
npm run dev
```

## Gerando o instalador Windows

```
cd app
npm run build:win
```

O instalador (`DiscordLAN Setup <versão>.exe`) é gerado em `app/release/`. É esse arquivo que deve ser enviado para os amigos — eles só precisam executá-lo e instalar, sem precisar de Node.js.

## Como conectar

1. O host inicia o servidor de sinalização (`npm run dev` em `server/`) e compartilha seu IP Radmin + porta.
2. Cada amigo abre o app, digita um nome e o IP:porta do host, e clica em Conectar.
3. Mic entra automaticamente (mutável), compartilhamento de tela é opcional pelo botão na barra inferior.

Suporta até ~6 pessoas simultâneas (conexão P2P em malha via WebRTC).
