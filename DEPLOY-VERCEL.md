# Corrigir site diferente do localhost

## Diagnóstico

- **GitHub `main`:** commit `5a4fec0` (site novo + área do cliente).
- **Produção** (`datageontrip.com.br`): ainda mostra versão antiga (processamento de drone, FAQ sondagem, sem `/login`).

A Vercel **não publicou** o commit novo (deploy antigo ainda em Production).

## Passos na Vercel (5 min)

1. [vercel.com/dashboard](https://vercel.com/dashboard) → projeto ligado a `jakson195/datageo-ntrip`.
2. **Settings → Git:** repositório `datageo-ntrip`, branch **`main`**, deploy automático ativo.
3. **Settings → General → Root Directory:** `app-solodatantrip` (igual ao `vercel.json`).
4. **Settings → Environment Variables:** `AUTH_SECRET`, `DEMO_LOGIN_*`, `NTRIP_*` (ver `app-solodatantrip/.env.example`).
5. **Deployments** → último deploy da `main`:
   - Se **não existir** commit `5a4fec0` → **Deploy** → **Redeploy** ou faça um novo push.
   - Se existir com **Error** → abra os logs, corrija e redeploy.
6. No deploy correto → **⋯ → Promote to Production** (se não for o ativo).
7. **Redeploy** com **desmarcar** “Use existing Build Cache”.

## Como saber que ficou igual ao localhost

| Localhost | Produção (correto) |
|-----------|-------------------|
| Hero com vídeo de campo | Sim |
| “A rede NTRIP para drones…” | Sim |
| Link **Área do cliente** | Sim |
| `/login` abre | Sim |
| `/processamento` redireciona | Sim (não é página de upload) |
| Sem FAQ “app de sondagem” | Sim |

## Domínio

**Settings → Domains:** `www.datageontrip.com.br` deve apontar para **este** projeto (não outro projeto Vercel antigo).

## CLI (se `vercel login` funcionar)

```powershell
cd c:\VISION\APP-SOLODATANTRIP\app-solodatantrip
vercel link
vercel --prod
```
