/**
 * Socket.io Server — Gestão de Agências
 * =========================================
 * Processo separado do Next.js para suportar Baileys (WhatsApp).
 * Inicie com: npm run socket
 *
 * Responsabilidades:
 * - Socket.io WebSocket para eventos em tempo real (CRM, tarefas, etc.)
 * - WhatsApp connection via Baileys (QR Code + phone code)
 * - Bridge de mensagens WhatsApp → banco de dados (via API interna)
 */

'use strict'

const { createServer } = require('http')
const { Server } = require('socket.io')
const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, Browsers, fetchLatestBaileysVersion, downloadMediaMessage } = require('@whiskeysockets/baileys')
const { Boom } = require('@hapi/boom')
const pino = require('pino')
const path = require('path')
const fs = require('fs')
const { usePostgresAuthState } = require('./baileys-db-auth')

// =============================================================================
// Config
// =============================================================================

const PORT = parseInt(process.env.PORT || process.env.SOCKET_PORT || '3001', 10)
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const AUTH_DIR = path.join(process.cwd(), '.baileys-auth')
const MAX_RECONNECT_ATTEMPTS = 3
const USE_DB_AUTH = !!process.env.DATABASE_URL // Usa banco se DATABASE_URL disponível

if (!USE_DB_AUTH && !fs.existsSync(AUTH_DIR)) {
  fs.mkdirSync(AUTH_DIR, { recursive: true })
}

const logger = pino({ level: 'info' })

// =============================================================================
// Helpers
// =============================================================================

/**
 * Lê o body de uma requisição HTTP como JSON.
 * @param {import('http').IncomingMessage} req
 * @returns {Promise<any>}
 */
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', chunk => { data += chunk })
    req.on('end', () => {
      try { resolve(JSON.parse(data || '{}')) } catch (e) { reject(e) }
    })
    req.on('error', reject)
  })
}

// =============================================================================
// HTTP + Socket.io
// =============================================================================

const httpServer = createServer(async (req, res) => {
  // Health check
  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }))
    return
  }

  // Página de QR Code para visualização direta no browser
  if (req.url?.startsWith('/qr') && req.method === 'GET') {
    const orgId = [...lastQrCodes.keys()][0] // pega primeiro org com QR
    const qr = orgId ? lastQrCodes.get(orgId) : null
    if (qr) {
      const encoded = encodeURIComponent(qr)
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(`<!DOCTYPE html>
<html>
<head><title>WhatsApp QR Code</title>
<meta http-equiv="refresh" content="20">
<style>body{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;background:#111;color:#fff;font-family:sans-serif;}img{border:8px solid white;border-radius:12px;}</style>
</head>
<body>
<h2>Escaneie com o WhatsApp</h2>
<img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encoded}" width="300" height="300" />
<p style="opacity:.5;font-size:12px">Atualiza automaticamente a cada 20s</p>
</body></html>`)
    } else {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(`<!DOCTYPE html><html><body style="background:#111;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;"><p>QR Code não disponível. Clique em "Conectar WhatsApp" no app primeiro.</p></body></html>`)
    }
    return
  }

  // POST /wa-send — envia texto via WhatsApp (usado por wa-sender.ts)
  if (req.url === '/wa-send' && req.method === 'POST') {
    try {
      const body = await readBody(req)
      const { organizacaoId, telefone, corpo } = body
      const sock = waConnections.get(organizacaoId)
      if (!sock) {
        res.writeHead(503, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'WhatsApp não conectado' }))
        return
      }
      const jid = `${telefone}@s.whatsapp.net`
      await sock.sendMessage(jid, { text: corpo })
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: true }))
    } catch (err) {
      logger.error({ err }, 'Erro em POST /wa-send')
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: String(err) }))
    }
    return
  }

  // POST /wa-send-image — envia imagem via WhatsApp (usado por wa-sender.ts)
  if (req.url === '/wa-send-image' && req.method === 'POST') {
    try {
      const body = await readBody(req)
      const { organizacaoId, telefone, imagemUrl, caption } = body
      const sock = waConnections.get(organizacaoId)
      if (!sock) {
        res.writeHead(503, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'WhatsApp não conectado' }))
        return
      }
      const jid = `${telefone}@s.whatsapp.net`
      await sock.sendMessage(jid, { image: { url: imagemUrl }, caption: caption || '' })
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: true }))
    } catch (err) {
      logger.error({ err }, 'Erro em POST /wa-send-image')
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: String(err) }))
    }
    return
  }

  // POST /emit — emite evento Socket.io para uma org (uso interno por API routes Next.js)
  if (req.url === '/emit' && req.method === 'POST') {
    try {
      const body = await readBody(req)
      const { organizacaoId, event, data } = body
      if (organizacaoId && event) {
        io.to(`org:${organizacaoId}`).emit(event, data)
      }
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: true }))
    } catch (err) {
      logger.error({ err }, 'Erro em POST /emit')
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: String(err) }))
    }
    return
  }

  res.writeHead(404)
  res.end()
})

const io = new Server(httpServer, {
  cors: {
    origin: APP_URL,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})

// =============================================================================
// Estado global WhatsApp por organização
// =============================================================================

/** @type {Map<string, import('@whiskeysockets/baileys').WASocket>} */
const waConnections = new Map()

/** @type {Map<string, number>} tentativas de reconexão por org */
const reconnectAttempts = new Map()

/** @type {Map<string, string>} último QR Code gerado por org (para re-envio) */
const lastQrCodes = new Map()

/** @type {Map<string, string>} estado atual da conexão WA por org */
const waStates = new Map() // 'qr' | 'connected' | 'disconnected'

/** @type {Map<string, string>} telefone conectado por org */
const connectedPhones = new Map()

/** @type {Map<string, { clearAll: () => Promise<void>, close: () => Promise<void> }>} auth handles por org */
const authHandles = new Map()

// Status codes que PODEM ser reconectados automaticamente (sessão provavelmente válida)
const RECONECTABLE_CODES = new Set([
  DisconnectReason.connectionLost,   // 408
  DisconnectReason.timedOut,         // 408
  DisconnectReason.connectionClosed, // 428
  DisconnectReason.restartRequired,  // 515
])

// =============================================================================
// Baileys — conectar WhatsApp
// =============================================================================

/**
 * Limpa estado de uma organização (socket + tentativas).
 * @param {string} organizacaoId
 */
function clearOrgState(organizacaoId) {
  waConnections.delete(organizacaoId)
  reconnectAttempts.delete(organizacaoId)
  lastQrCodes.delete(organizacaoId)
  waStates.delete(organizacaoId)
  connectedPhones.delete(organizacaoId)
}

/**
 * Inicia conexão WhatsApp para uma organização.
 * @param {string} organizacaoId
 */
async function connectWhatsApp(organizacaoId) {
  let state, saveCreds, authHandle

  if (USE_DB_AUTH) {
    // Persistência via PostgreSQL (Railway-safe)
    authHandle = await usePostgresAuthState(organizacaoId)
    state = authHandle.state
    saveCreds = authHandle.saveCreds
    authHandles.set(organizacaoId, authHandle)
  } else {
    // Fallback: filesystem (desenvolvimento local)
    const authPath = path.join(AUTH_DIR, organizacaoId)
    if (!fs.existsSync(authPath)) {
      fs.mkdirSync(authPath, { recursive: true })
    }
    const fileAuth = await useMultiFileAuthState(authPath)
    state = fileAuth.state
    saveCreds = fileAuth.saveCreds
  }

  // Busca versão mais recente com fallback (evita travar se não tiver internet/timeout)
  let version
  try {
    const result = await Promise.race([
      fetchLatestBaileysVersion(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000)),
    ])
    version = result.version
  } catch {
    version = [2, 3000, 1015534] // versão estável conhecida como fallback
    logger.warn({ organizacaoId }, 'fetchLatestBaileysVersion timeout — usando versão fallback')
  }

  logger.info({ organizacaoId, version }, 'Iniciando conexão WhatsApp')

  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    browser: Browsers.appropriate('Chrome'),
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 30000,
    keepAliveIntervalMs: 25000,
    retryRequestDelayMs: 2000,
  })

  waConnections.set(organizacaoId, sock)

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update

    if (qr) {
      logger.info({ organizacaoId }, 'QR Code gerado')
      reconnectAttempts.delete(organizacaoId) // QR gerado: resetar tentativas
      lastQrCodes.set(organizacaoId, qr)
      waStates.set(organizacaoId, 'qr')
      io.to(`org:${organizacaoId}`).emit('wa:qr', { qr })
    }

    if (connection === 'open') {
      logger.info({ organizacaoId }, 'WhatsApp conectado')
      reconnectAttempts.delete(organizacaoId)
      lastQrCodes.delete(organizacaoId) // QR escaneado: limpar
      waStates.set(organizacaoId, 'connected')
      const telefone = sock.user?.id?.split(':')[0] || 'desconhecido'
      connectedPhones.set(organizacaoId, telefone)
      io.to(`org:${organizacaoId}`).emit('wa:connected', { telefone })
    }

    if (connection === 'close') {
      const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode

      logger.warn({ organizacaoId, statusCode }, 'WhatsApp desconectado')
      waConnections.delete(organizacaoId)

      // Status codes que NÃO permitem reconexão automática (exigem novo QR)
      const precisaNovoQr = !RECONECTABLE_CODES.has(statusCode)

      if (precisaNovoQr) {
        logger.info({ organizacaoId, statusCode }, 'Sessão inválida — aguardando reconexão manual')
        reconnectAttempts.delete(organizacaoId)
        io.to(`org:${organizacaoId}`).emit('wa:disconnected')

        // Se for sessão corrompida/banida, apaga credenciais automaticamente
        if (statusCode === DisconnectReason.loggedOut ||
            statusCode === DisconnectReason.badSession ||
            statusCode === 405 || // protocolo rejeitado
            statusCode === 403) { // banido
          // Limpar do banco
          const handle = authHandles.get(organizacaoId)
          if (handle) {
            try { await handle.clearAll() } catch (_) {}
            try { await handle.close() } catch (_) {}
            authHandles.delete(organizacaoId)
          }
          // Limpar do filesystem
          const authPath = path.join(AUTH_DIR, organizacaoId)
          if (fs.existsSync(authPath)) {
            fs.rmSync(authPath, { recursive: true, force: true })
            logger.info({ organizacaoId }, 'Credenciais inválidas removidas automaticamente')
          }
        }
        return
      }

      // Reconexão automática com limite de tentativas
      const tentativas = (reconnectAttempts.get(organizacaoId) || 0) + 1
      reconnectAttempts.set(organizacaoId, tentativas)

      if (tentativas > MAX_RECONNECT_ATTEMPTS) {
        logger.warn({ organizacaoId, tentativas }, 'Máximo de reconexões atingido — aguardando reconexão manual')
        reconnectAttempts.delete(organizacaoId)
        io.to(`org:${organizacaoId}`).emit('wa:disconnected')
        io.to(`org:${organizacaoId}`).emit('wa:error', {
          message: 'Conexão perdida. Clique em "Conectar WhatsApp" para tentar novamente.',
        })
        return
      }

      logger.info({ organizacaoId, tentativa: tentativas }, `Reconectando em 5s... (${tentativas}/${MAX_RECONNECT_ATTEMPTS})`)
      io.to(`org:${organizacaoId}`).emit('wa:disconnected')
      setTimeout(() => connectWhatsApp(organizacaoId), 5000)
    }
  })

  // Salvar credenciais
  sock.ev.on('creds.update', saveCreds)

  // Mensagens recebidas
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return

    for (const msg of messages) {
      if (!msg.message) continue
      if (msg.key.fromMe) continue // Ignorar mensagens enviadas por nós

      const telefone = msg.key.remoteJid?.replace('@s.whatsapp.net', '') || ''
      const corpo = extractMessageText(msg)
      const isImagem = !!(msg.message.imageMessage)

      if (!corpo && !isImagem) continue
      if (!telefone) continue

      logger.info({ organizacaoId, telefone, isImagem }, 'Mensagem recebida')

      // Persistir via API interna (somente mensagens de texto)
      if (corpo) {
        try {
          await fetch(`${APP_URL}/api/mensagens`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-internal-token': process.env.AIOS_API_KEY || '',
            },
            body: JSON.stringify({
              organizacaoId,
              telefoneContato: telefone,
              corpo,
              fromMe: false,
              whatsappId: msg.key.id,
              timestamp: new Date(Number(msg.messageTimestamp) * 1000),
            }),
          })
        } catch (err) {
          logger.error({ err, organizacaoId }, 'Erro ao persistir mensagem')
        }
      }

      // Emite evento para frontend
      io.to(`org:${organizacaoId}`).emit('wa:message', {
        telefoneContato: telefone,
        corpo: corpo || '[imagem]',
        fromMe: false,
        timestamp: new Date(Number(msg.messageTimestamp) * 1000),
        whatsappId: msg.key.id,
        organizacaoId,
      })

      // FotoIA Bot — rotear mensagens para o bot handler
      try {
        let imagemBase64 = null
        let mimeType = null

        if (isImagem) {
          const buffer = await downloadMediaMessage(msg, 'buffer', {})
          imagemBase64 = buffer.toString('base64')
          mimeType = msg.message.imageMessage.mimetype || 'image/jpeg'
        }

        await fetch(`${APP_URL}/api/foto-ia/bot`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-internal-token': process.env.AIOS_API_KEY || '',
          },
          body: JSON.stringify({
            organizacaoId,
            telefone,
            corpo: corpo || null,
            imagemBase64,
            mimeType,
          }),
        })
      } catch (err) {
        logger.error({ err, organizacaoId }, 'Erro ao chamar bot FotoIA')
      }
    }
  })
}

/**
 * Extrai texto de uma mensagem Baileys.
 */
function extractMessageText(msg) {
  return (
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    msg.message?.videoMessage?.caption ||
    ''
  )
}

// =============================================================================
// Socket.io — eventos
// =============================================================================

io.on('connection', (socket) => {
  logger.info({ socketId: socket.id }, 'Cliente conectado')

  // Autenticação da sala por organização
  socket.on('join:org', ({ organizacaoId }) => {
    if (!organizacaoId) return
    socket.join(`org:${organizacaoId}`)
    logger.info({ socketId: socket.id, organizacaoId }, 'Socket entrou na sala da organização')

    // Re-emitir estado atual para o socket recém-conectado
    const state = waStates.get(organizacaoId)
    if (state === 'connected' && connectedPhones.has(organizacaoId)) {
      socket.emit('wa:connected', { telefone: connectedPhones.get(organizacaoId) })
    } else if (state === 'qr' && lastQrCodes.has(organizacaoId)) {
      socket.emit('wa:qr', { qr: lastQrCodes.get(organizacaoId) })
    }
  })

  // Iniciar conexão WhatsApp
  socket.on('wa:connect', async ({ organizacaoId }) => {
    if (!organizacaoId) return

    // Se já existe conexão ativa aguardando QR, re-emitir o QR para este socket
    if (waConnections.has(organizacaoId)) {
      const state = waStates.get(organizacaoId)
      if (state === 'qr' && lastQrCodes.has(organizacaoId)) {
        logger.info({ organizacaoId }, 'Re-emitindo QR Code para cliente reconectado')
        socket.emit('wa:qr', { qr: lastQrCodes.get(organizacaoId) })
      } else if (state === 'connected') {
        logger.info({ organizacaoId }, 'WhatsApp já conectado')
      }
      return
    }

    await connectWhatsApp(organizacaoId)
  })

  // Resetar sessão (apaga credenciais e gera novo QR)
  socket.on('wa:reset', async ({ organizacaoId }) => {
    if (!organizacaoId) return

    // Encerrar conexão ativa
    if (waConnections.has(organizacaoId)) {
      try { waConnections.get(organizacaoId)?.end() } catch (_) {}
    }

    // Limpar credenciais do banco (se usando DB auth)
    const handle = authHandles.get(organizacaoId)
    if (handle) {
      try { await handle.clearAll() } catch (_) {}
      try { await handle.close() } catch (_) {}
      authHandles.delete(organizacaoId)
    }

    clearOrgState(organizacaoId)

    // Apagar credenciais locais (fallback)
    const authPath = path.join(AUTH_DIR, organizacaoId)
    if (fs.existsSync(authPath)) {
      fs.rmSync(authPath, { recursive: true, force: true })
      logger.info({ organizacaoId }, 'Credenciais Baileys removidas')
    }

    // Aguardar um momento para o socket fechar
    await new Promise(r => setTimeout(r, 1000))

    // Reconectar do zero (vai gerar novo QR)
    await connectWhatsApp(organizacaoId)
  })

  // Desconectar WhatsApp
  socket.on('wa:disconnect', async ({ organizacaoId }) => {
    const sock = waConnections.get(organizacaoId)
    if (sock) {
      try { await sock.logout() } catch (_) {}
      clearOrgState(organizacaoId)
      io.to(`org:${organizacaoId}`).emit('wa:disconnected')
      logger.info({ organizacaoId }, 'WhatsApp desconectado manualmente')
    }
  })

  // Enviar mensagem WhatsApp
  socket.on('wa:send', async ({ organizacaoId, telefone, corpo }) => {
    const sock = waConnections.get(organizacaoId)
    if (!sock) {
      socket.emit('wa:error', { message: 'WhatsApp não conectado para esta organização' })
      return
    }

    const jid = `${telefone}@s.whatsapp.net`
    try {
      await sock.sendMessage(jid, { text: corpo })
      logger.info({ organizacaoId, telefone }, 'Mensagem enviada')
    } catch (err) {
      logger.error({ err, organizacaoId }, 'Erro ao enviar mensagem')
      socket.emit('wa:error', { message: 'Erro ao enviar mensagem' })
    }
  })

  socket.on('disconnect', () => {
    logger.info({ socketId: socket.id }, 'Cliente desconectado')
  })
})

// =============================================================================
// Start
// =============================================================================

httpServer.listen(PORT, () => {
  logger.info(`Socket.io server rodando na porta ${PORT}`)
  logger.info(`CORS habilitado para: ${APP_URL}`)

  // Auto-reconectar orgs que têm credenciais salvas
  if (USE_DB_AUTH) {
    // Buscar orgs com sessões salvas no banco
    const { Client } = require('pg')
    const pgClient = new Client({ connectionString: process.env.DATABASE_URL })
    pgClient.connect()
      .then(() => pgClient.query(`SELECT DISTINCT "organizacaoId" FROM baileys_auth_state`))
      .then(result => {
        const orgs = result.rows.map(r => r.organizacaoId)
        if (orgs.length > 0) {
          logger.info({ orgs }, `Auto-reconectando ${orgs.length} sessão(ões) WhatsApp do banco...`)
          for (const orgId of orgs) {
            connectWhatsApp(orgId).catch(err =>
              logger.warn({ orgId, err: err.message }, 'Falha no auto-reconect')
            )
          }
        }
        return pgClient.end()
      })
      .catch(err => {
        logger.warn({ err: err.message }, 'Não foi possível buscar sessões do banco')
        pgClient.end().catch(() => {})
      })
  } else if (fs.existsSync(AUTH_DIR)) {
    const orgs = fs.readdirSync(AUTH_DIR).filter(d =>
      fs.statSync(path.join(AUTH_DIR, d)).isDirectory()
    )
    if (orgs.length > 0) {
      logger.info({ orgs }, `Auto-reconectando ${orgs.length} sessão(ões) WhatsApp salva(s)...`)
      for (const orgId of orgs) {
        connectWhatsApp(orgId).catch(err =>
          logger.warn({ orgId, err: err.message }, 'Falha no auto-reconect')
        )
      }
    }
  }
})

// =============================================================================
// Cron interno — substitui Vercel Cron no Railway
// =============================================================================

const CRON_INTERVAL = parseInt(process.env.CRON_INTERVAL_MS || '3600000', 10) // 1h padrão
let cronTimer = null

function startCronJobs() {
  if (!process.env.CRON_SECRET) {
    logger.warn('CRON_SECRET não definido — cron jobs desabilitados')
    return
  }

  async function runCron() {
    try {
      const res = await fetch(`${APP_URL}/api/cron/fotoia`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${process.env.CRON_SECRET}` },
      })
      const data = await res.json()
      logger.info({ status: res.status, ...data }, '[Cron] FotoIA executado')
    } catch (err) {
      logger.error({ err: err.message }, '[Cron] Erro ao executar FotoIA cron')
    }
  }

  // Primeira execução após 60s (dar tempo do app iniciar)
  setTimeout(() => {
    runCron()
    cronTimer = setInterval(runCron, CRON_INTERVAL)
    logger.info({ intervalMs: CRON_INTERVAL }, '[Cron] Jobs agendados')
  }, 60000)
}

startCronJobs()

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM recebido, desligando...')

  // Parar cron
  if (cronTimer) clearInterval(cronTimer)

  // Fechar conexões WhatsApp
  for (const [orgId, sock] of waConnections) {
    try {
      sock.end()
      logger.info({ orgId }, 'WhatsApp desconectado')
    } catch (_) {}
  }

  // Fechar conexões de auth DB
  for (const [, handle] of authHandles) {
    try { await handle.close() } catch (_) {}
  }

  httpServer.close(() => process.exit(0))
})
