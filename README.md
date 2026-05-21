# Datageo Ntrip

Site e área do cliente RTK/NTRIP (Next.js).

## Estrutura

| Pasta | Conteúdo |
|-------|----------|
| `app-solodatantrip/` | Aplicação Next.js (deploy na Vercel) |

## Desenvolvimento (Cursor)

```bash
cd app-solodatantrip
npm install
npm run dev
```

App local: http://localhost:3001

## GitHub

Repositório: https://github.com/jakson195/datageo-ntrip

Enviar alterações:

```bash
git add .
git commit -m "sua mensagem"
git push origin main
```

## Vercel

1. Acesse [vercel.com/new](https://vercel.com/new) e importe o repositório `jakson195/datageo-ntrip`.
2. **Root Directory:** `app-solodatantrip` (obrigatório — o `package.json` está nesta pasta).
3. Framework: **Next.js** (detectado automaticamente).
4. **Environment Variables** (Settings → Environment Variables), igual ao que você usa no localhost — veja `app-solodatantrip/.env.example`:

   | Variável | Obrigatório | Exemplo |
   |----------|-------------|---------|
   | `AUTH_SECRET` | Sim (produção) | string com 16+ caracteres |
   | `DEMO_LOGIN_EMAIL` | Recomendado | `cliente@datageo.com.br` |
   | `DEMO_LOGIN_PASSWORD` | Recomendado | `demo123` |
   | `NTRIP_SERVER`, `NTRIP_PORT`, `NTRIP_MOUNTPOINT` | Opcional | caster demo |
   | `NTRIP_USERNAME`, `NTRIP_PASSWORD` | Opcional | credenciais demo |

   O `vercel.json` na raiz já define `rootDirectory: app-solodatantrip` — não precisa configurar pasta manualmente se o projeto importar o repo completo.

5. Deploy. Cada `git push` na `main` gera um novo deploy (igual ao localhost após o push).

### Cadastro de clientes na Vercel

O cadastro grava em `data/users.json` no disco do servidor. Na Vercel (serverless) esse arquivo **não persiste** entre deploys nem entre instâncias. Para produção com cadastro real, use banco (Postgres, Supabase, Vercel KV, etc.). A conta **demo** via variáveis de ambiente funciona normalmente.

### Domínio

Em Vercel → Project → Settings → Domains, adicione seu domínio (ex.: `ntrip.datageo.com.br`).
