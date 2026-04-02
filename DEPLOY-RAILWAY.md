# Deploy Railway — Socket Server + Cron

## Arquitetura de Deploy

```
┌─────────────────────────────────┐      ┌──────────────────────────────┐
│   Netlify (Next.js App)         │      │   Railway (Socket Server)    │
│   - Frontend React              │ ←──→ │   - Socket.io WebSocket      │
│   - API Routes (/api/*)         │      │   - WhatsApp (Baileys)       │
│   - NextAuth                    │      │   - Cron Jobs (interno)      │
└────────────┬────────────────────┘      └────────────┬─────────────────┘
             │                                        │
             └────────────┬───────────────────────────┘
                          ▼
              ┌───────────────────────┐
              │  PostgreSQL (Supabase) │
              │  + Baileys Auth State  │
              └───────────────────────┘
```

## Pré-requisitos

1. Conta no [Railway](https://railway.app)
2. Repositório no GitHub conectado
3. Banco PostgreSQL (Supabase) acessível
4. `RAILWAY_TOKEN` gerado em Railway > Settings > Tokens

---

## Passo 1: Criar Projeto no Railway

1. Acesse https://railway.app → **"+ New Project"**
2. Escolha **"Deploy from GitHub repo"**
3. Conecte o repositório `gestaocompletaagencias`
4. **Root Directory**: `server`
5. Deploy

---

## Passo 2: Variáveis de Ambiente (Railway)

No painel do projeto → **Variables**, adicione:

### Obrigatórias

| Variável | Valor | Descrição |
|----------|-------|-----------|
| `DATABASE_URL` | `postgresql://...` | String de conexão PostgreSQL |
| `NEXT_PUBLIC_APP_URL` | URL do Netlify | Para callbacks da API |
| `AIOS_API_KEY` | sua-chave | Token interno para API routes |
| `CRON_SECRET` | `openssl rand -hex 32` | Autenticação do cron interno |
| `NODE_ENV` | `production` | |

### Opcionais

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `CRON_INTERVAL_MS` | `3600000` | Intervalo do cron (1h) |

> **Nota:** `PORT` é atribuído automaticamente pelo Railway — não defina manualmente.

---

## Passo 3: Verificar Deploy

1. Aguarde build + deploy (1-2 min)
2. Acesse `https://<sua-url>.up.railway.app/health`
3. Deve retornar: `{"status":"ok","timestamp":"..."}`

---

## Passo 4: Atualizar Netlify

1. Acesse Netlify → Environment Variables
2. Atualize `NEXT_PUBLIC_SOCKET_URL` com a URL do Railway
3. Trigger redeploy

---

## Passo 5: Migrar Banco (se necessário)

```bash
# Aplicar migração da tabela baileys_auth_state
npx prisma migrate deploy
```

> A tabela também é criada automaticamente pelo socket-server na primeira conexão WhatsApp.

---

## Como Funciona

### WhatsApp (Baileys)
- Sessões persistem no PostgreSQL (tabela `baileys_auth_state`)
- Sem perda de sessão entre redeploys
- Auto-reconecta ao iniciar se há sessão salva no banco
- Fallback para filesystem em dev local (sem `DATABASE_URL`)

### Cron Jobs
- O socket-server executa `GET /api/cron/fotoia` a cada hora
- Autenticado via `CRON_SECRET`
- Primeira execução 60s após startup
- Configurável via `CRON_INTERVAL_MS`

### Storage de Imagens (FotoIA)
- **Produção**: use `STORAGE_PROVIDER=r2` com Cloudflare R2
- **Dev**: `STORAGE_PROVIDER=local` (filesystem)
- SDK `@aws-sdk/client-s3` já instalado

---

## GitHub Actions (Auto-deploy)

O workflow `.github/workflows/railway-deploy.yml` faz deploy automático ao push em `main` (somente se arquivos em `server/` mudarem).

**Requisito:** Adicione `RAILWAY_TOKEN` nos secrets do repositório GitHub.

---

## Troubleshooting

### Container crasha ao iniciar
- Verifique logs em Railway → Deployments → View logs
- Cause comum: `DATABASE_URL` ausente ou incorreta

### WhatsApp não reconecta após redeploy
- Verifique se `DATABASE_URL` está configurada no Railway
- O auto-reconnect busca sessões da tabela `baileys_auth_state`

### Cron não executa
- Verifique se `CRON_SECRET` e `NEXT_PUBLIC_APP_URL` estão configurados
- Logs mostram `[Cron] FotoIA executado` a cada hora

### Imagens perdidas após redeploy
- Use `STORAGE_PROVIDER=r2` em produção
- Storage local é efêmero no Railway

---

## Links

- Railway: https://railway.app
- Netlify: https://app.netlify.com/projects/preeminent-pastelito-752715
- Supabase: https://supabase.com/dashboard
