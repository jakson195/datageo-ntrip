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

App local: http://localhost:3000

## GitHub

Repositório: https://github.com/jakson195/datageo-ntrip

```bash
git add .
git commit -m "sua mensagem"
git push origin main
```

## Deploy na Vercel

1. [vercel.com/new](https://vercel.com/new) → importe o repositório.
2. **Root Directory:** `app-solodatantrip` (obrigatório).
3. **PostgreSQL:** conecte **Neon** (Storage → Postgres) ou **Supabase** — guia completo em [`app-solodatantrip/docs/DEPLOY-VERCEL-POSTGRES.md`](app-solodatantrip/docs/DEPLOY-VERCEL-POSTGRES.md).
4. **Environment Variables** (Production):

   | Variável | Obrigatório | Notas |
   |----------|-------------|-------|
   | `AUTH_SECRET` | Sim | `openssl rand -base64 32` |
   | `DATABASE_URL` | Sim* | Pool (runtime); Neon: mapeado de `POSTGRES_URL` |
   | `DIRECT_URL` | Sim* | Direct (migrations); Neon: de `POSTGRES_URL_NON_POOLING` |
   | `ADMIN_PASSWORD` | Sim (seed) | Senha do admin inicial |
   | `ADMIN_EMAIL` | Recomendado | Padrão `admin@datageo.com.br` |
   | `NEXT_PUBLIC_APP_URL` | Sim (checkout) | URL pública do app |

   \* Com integração Neon na Vercel, `POSTGRES_URL` basta no build/runtime; o app mapeia automaticamente.

5. Após o primeiro deploy, rode o seed uma vez (local com env de produção):

   ```bash
   cd app-solodatantrip
   vercel env pull .env.production.local --environment=production
   npm run db:seed
   ```

6. Cada push na `main` aplica migrations e faz deploy.

### Domínio

Vercel → Project → Settings → Domains (ex.: `ntrip.datageo.com.br`).
