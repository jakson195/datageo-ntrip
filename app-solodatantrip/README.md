# Datageo Ntrip

Landing NTRIP/RTK, mapa de cobertura e **área do cliente** (cadastro, login, credenciais RTK).

## Scripts

```bash
npm run dev    # http://localhost:3000
npm run build
npm run start
```

## Área do cliente

- `/cadastro` — criar conta (PostgreSQL + senha bcrypt)
- `/login` — autenticação real (sessão assinada, cookie httpOnly)
- `/area-cliente/credenciais` — dados RTK após login

### Banco local

```bash
docker compose up db -d
cp .env.example .env.local
# Descomente DATABASE_URL e DIRECT_URL (localhost:5432)
npm run db:migrate:deploy
npm run db:seed
```

Admin padrão (altere `ADMIN_PASSWORD` antes do seed):

- E-mail: `admin@datageo.com.br` (ou `ADMIN_EMAIL`)
- Senha: definida em `ADMIN_PASSWORD`

Variáveis: veja `.env.example`.

## Deploy (Vercel + PostgreSQL)

**Root Directory** na importação: `app-solodatantrip`.

Guia passo a passo (Neon ou Supabase): **[docs/DEPLOY-VERCEL-POSTGRES.md](docs/DEPLOY-VERCEL-POSTGRES.md)**

Resumo:

1. Vercel → **Storage** → Postgres (Neon) **ou** Supabase com URLs pool + direct.
2. Configure `AUTH_SECRET`, `ADMIN_PASSWORD`, `NEXT_PUBLIC_APP_URL`.
3. Deploy aplica migrations automaticamente (`scripts/ensure-database-env.mjs`).
4. Rode `npm run db:seed` uma vez com env de produção.
