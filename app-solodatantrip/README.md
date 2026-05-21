# Datageo Ntrip

Landing NTRIP/RTK, mapa de cobertura e **área do cliente** (cadastro, login, credenciais RTK).

## Scripts

```bash
npm run dev    # http://localhost:3001
npm run build
npm run start
```

## Área do cliente

- `/cadastro` — criar conta
- `/login` — entrar (demo: `cliente@datageo.com.br` / `demo123`)
- `/area-cliente/credenciais` — dados RTK após login

Variáveis: veja `.env.example`.

## Deploy (Vercel)

Na importação do repositório GitHub, defina **Root Directory** = `app-solodatantrip`.

Configure `AUTH_SECRET` e variáveis demo/NTRIP na Vercel. Detalhes no [README da raiz do repositório](../README.md).
