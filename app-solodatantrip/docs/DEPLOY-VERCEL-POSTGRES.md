# PostgreSQL na Vercel (Neon ou Supabase)

O app usa **Prisma** com duas URLs:

| Variável | Uso |
|----------|-----|
| `DATABASE_URL` | Conexão **com pool** (runtime serverless — API routes, login, cadastro) |
| `DIRECT_URL` | Conexão **direta** (migrations no build e `prisma db` local) |

Sem essas variáveis, login e cadastro exibem aviso de banco não configurado.

---

## Opção A — Neon via integração Vercel (recomendado)

A Vercel oferece Postgres gerenciado por **Neon** com poucos cliques.

### 1. Conectar o banco

1. Vercel → seu projeto → **Storage** → **Create Database** → **Postgres** (Neon).
2. Escolha região próxima ao deploy (ex.: `gru1` ou `iad1`).
3. Vincule ao projeto. A Vercel injeta automaticamente:
   - `POSTGRES_URL` (pooler)
   - `POSTGRES_URL_NON_POOLING` (direta)

### 2. Mapear para o Prisma

O script `scripts/ensure-database-env.mjs` (executado no build) copia:

- `POSTGRES_URL` → `DATABASE_URL`
- `POSTGRES_URL_NON_POOLING` → `DIRECT_URL`

**Opcional:** defina também `DATABASE_URL` e `DIRECT_URL` manualmente com os mesmos valores (Production + Preview).

### 3. Demais variáveis obrigatórias

Em **Settings → Environment Variables** (Production):

```env
AUTH_SECRET=<openssl rand -base64 32>
ADMIN_PASSWORD=<senha forte do admin>
ADMIN_EMAIL=admin@datageo.com.br
ADMIN_NAME=Administrador Datageo
NEXT_PUBLIC_APP_URL=https://seu-dominio.vercel.app
```

### 4. Deploy

Cada push na `main` executa:

```text
node scripts/ensure-database-env.mjs → prisma migrate deploy → prisma generate → next build
```

As migrations em `prisma/migrations/` são aplicadas automaticamente na Vercel.

### 5. Seed (admin + planos) — uma vez

Rode **localmente** apontando para o banco de produção (nunca commite a URL):

```bash
cd app-solodatantrip
vercel env pull .env.production.local --environment=production

# Ou exporte manualmente DATABASE_URL e DIRECT_URL do painel Neon/Vercel

npm run db:seed
```

Confirme login com `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

### URLs Neon (referência manual)

Se copiar do painel Neon em vez da integração Vercel:

```env
# Pooler (runtime)
DATABASE_URL=postgresql://USER:PASSWORD@ep-xxx-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require

# Direct (migrations)
DIRECT_URL=postgresql://USER:PASSWORD@ep-xxx.sa-east-1.aws.neon.tech/neondb?sslmode=require
```

Use sempre o host **`-pooler`** em `DATABASE_URL` e o host **sem pooler** em `DIRECT_URL`.

---

## Opção B — Supabase (recomendado para este projeto)

### 1. Criar projeto

1. [supabase.com](https://supabase.com) → **New project** → região e senha do Postgres.
2. **Project Settings → Database → Connection string**.

### 2. Variáveis na Vercel

| Variável | Modo | Porta | Uso |
|----------|------|-------|-----|
| `DATABASE_URL` | Transaction pooler | **6543** | Runtime (API, login, cadastro) |
| `DIRECT_URL` | Session / direct | **5432** | `prisma migrate deploy` no build |

**Transaction mode (pooler)** — runtime:

```env
DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
```

**Session mode (direct)** — migrations:

```env
DIRECT_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:5432/postgres
```

Substitua região/host conforme o painel Supabase (**URI** e **Transaction pooler**).

Marque **Production**, **Preview** e **Development** se usar previews.

### 3. Validação local

```bash
npm run db:validate
```

O app valida portas Supabase e exibe erro amigável se `DIRECT_URL` usar 6543 ou se `DATABASE_URL` estiver ausente.

### 4. Deploy e seed

Igual ao Neon: push dispara migrations; seed manual com `npm run db:seed` e env de produção.

### IPv4 / Vercel

Se a conexão falhar, em Supabase → Database → **Network** use **IPv4 add-on** ou o **Supavisor pooler** (recomendado para serverless).

---

## Checklist pós-deploy

- [ ] Build Vercel concluiu sem erro em `prisma migrate deploy`
- [ ] `npm run db:seed` executado uma vez em produção
- [ ] `/cadastro` cria conta sem aviso de banco
- [ ] `/login` com admin funciona
- [ ] `AUTH_SECRET` definido (16+ caracteres)
- [ ] `NEXT_PUBLIC_APP_URL` aponta para o domínio real

---

## Desenvolvimento local

```bash
docker compose up db -d
cp .env.example .env.local
# Descomente DATABASE_URL e DIRECT_URL para localhost:5432 (docker-compose)
npm run db:migrate:deploy
npm run db:seed
npm run dev
```

Credenciais Docker padrão: `postgresql://datageo:datageo@localhost:5433/datageo` (porta **5433** evita conflito com Postgres local na 5432).

---

## Solução de problemas

| Sintoma | Causa provável | Ação |
|---------|----------------|------|
| Build falha em `migrate deploy` | `DIRECT_URL` ausente ou pooler na URL direta | Use host/porta **5432** (direct) em `DIRECT_URL` |
| Login 500 / timeout | Pool esgotado | `connection_limit=1` no Supabase; Neon pooler em `DATABASE_URL` |
| "Banco não configurado" | Env não definida no ambiente | Confira Production vs Preview na Vercel |
| Migrations desatualizadas | Build antigo | Redeploy; confira logs do `ensure-database-env` |
