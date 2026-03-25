# 🚀 DEPLOY RAILWAY — PASSO A PASSO DETALHADO

O Socket Server foi separado do Next.js para evitar vulnerabilidades!

---

## 📋 ARQUIVOS CRIADOS

| Arquivo | Localização | Descrição |
|---------|-------------|-----------|
| \`server/Dockerfile\` | \`server/\` | Dockerfile específico para Socket Server |
| \`server/package.json\` | \`server/\` | Dependências apenas do Socket Server (SEM Next.js) |
| \`server/Procfile\` | \`server/\` | Comando de start |
| \`.dockerignore\` | raiz | Ignora arquivos do Next.js |
| \`.railwayignore\` | raiz | Ignora Dockerfile do Next.js |

---

## ⚠️ ANTES DE COMEÇAR

**FAÇA COMMIT E PUSH:**

\`\`\`bash
git add server/Dockerfile server/package.json server/Procfile .dockerignore .railwayignore
git commit -m "feat: Socket Server separado com Dockerfile dedicado"
git push
\`\`\`

---

## PASSO 1: Configurar Contexto do Build no Railway

**IMPORTANTE:** O Railway precisa saber que o Dockerfile está na pasta \`server/\`.

### Opção 1: Usar Root Directory no Railway

1. Acesse: https://railway.app
2. Clique em **"+ New Project"**
3. Escolha **"Deploy from GitHub repo"**
4. Conecte o repositório: \`gestaocompletaagencias\`
5. No campo **"Root Directory"** ou **"Working Directory"**, digite: \`server\`
6. Clique em **"Deploy"**

### Opção 2: Se Root Directory não aparecer

Se não houver opção de Root Directory:

1. Crie o projeto normalmente
2. Vá em **Settings** → **General**
3. Configure o **Root Directory** como \`server\`
4. Clique em **Redeploy**

---

## PASSO 2: Adicionar Variáveis de Ambiente

No painel do projeto Railway:

1. Clique na aba **"Variables"**
2. Clique em **"+ New Variable"**
3. Adicione UMA POR UMA vez:

### Variáveis obrigatórias:

\`\`\`
DATABASE_URL=postgresql://postgres:EbjczPcJmuMPTTFo@db.sannahsoowuzllgmurzt.supabase.co:5432/postgres
\`\`\`

---

\`\`\`
SUPABASE_URL=https://sannahsoowuzllgmurzt.supabase.co
\`\`\`

---

\`\`\`
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbm5haHNvb3d1emxsZ211cnp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1OTAyNDYsImV4cCI6MjA4ODE2NjI0Nn0.1hXZr5ba0tLf2W1pj7PdRTgXkKCkwoojM8QbB43N6aw
\`\`\`

---

\`\`\`
NODE_ENV=production
\`\`\`

---

\`\`\`
SOCKET_PORT=3001
\`\`\`

---

\`\`\`
NEXT_PUBLIC_APP_URL=https://preeminent-pastelito-752715.netlify.app
\`\`\`

---

## PASSO 3: Iniciar Deploy

1. Clique em **"Deploy"**
2. **Aguarde 1-2 minutos** (agora é mais rápido porque não instala o Next.js!)

---

## PASSO 4: Verificar Deploy

Aguarde ver:
- ✅ \`Build succeeded\`
- ✅ \`Container is running\`

---

## PASSO 5: Obter a URL

1. Clique em **"Settings"**
2. Copie a **Public URL** (ex: \`https://xxx.up.railway.app\`)

---

## PASSO 6: Testar

Abra no navegador:
\`\`\`
https://sua-url-railway.up.railway.app/health
\`\`\`

Deve aparecer:
\`\`\`json
{"status":"ok","timestamp":"..."}
\`\`\`

---

## PASSO 7: Atualizar Netlify

1. Acesse: https://app.netlify.com/projects/preeminent-pastelito-752715/settings
2. Vá em **"Environment variables"**
3. Edite \`NEXT_PUBLIC_SOCKET_URL\` com a URL do Railway
4. Clique em **"Trigger deploy"**

---

## ✅ CONCLUSÃO

| Sistema | URL | Status |
|---------|-----|--------|
| Next.js | https://preeminent-pastelito-752715.netlify.app | ✅ ONLINE |
| Socket Server | (sua URL Railway) | ⏳ AGUARDANDO |
| Database | Supabase | ✅ OK |

---

## 🧪 TESTE FINAL

No console do navegador (F12):

\`\`\`javascript
const socket = io('https://sua-url-railway.up.railway.app');
socket.on('connect', () => console.log('✅ Socket conectado!'));
\`\`\`

---

## 🔧 PROBLEMAS E SOLUÇÕES

### Build ainda falha?
1. Verifique se você fez \`git push\`
2. Confirme que o **Root Directory** está configurado como \`server\`
3. Veja o log de erro em **"Deploy"** → **View logs**

### Variáveis não funcionam?
1. Após adicionar as variáveis, clique em **"Redeploy"**
2. Verifique se não há espaços extras nos nomes das variáveis

### Container crasha?
1. Veja o log em **"Logs"**
2. Geralmente é falta de variável de ambiente

---

**Links úteis:**
- Railway: https://railway.app
- Netlify: https://app.netlify.com/projects/preeminent-pastelito-752715
- Docs Railway: https://docs.railway.app
