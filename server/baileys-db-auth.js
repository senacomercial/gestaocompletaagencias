'use strict'

/**
 * Baileys Auth State — PostgreSQL Persistence
 * =============================================
 * Substitui useMultiFileAuthState (filesystem) por armazenamento no banco,
 * garantindo que sessões WhatsApp sobrevivam a redeploys no Railway.
 *
 * Usa DATABASE_URL do ambiente para conectar ao PostgreSQL via pg (sem Prisma no server).
 */

const { Client } = require('pg')
const { proto } = require('@whiskeysockets/baileys')
const { BufferJSON, initAuthCreds } = require('@whiskeysockets/baileys')

/**
 * @param {string} organizacaoId
 * @returns {Promise<{ state: import('@whiskeysockets/baileys').AuthenticationState, saveCreds: () => Promise<void> }>}
 */
async function usePostgresAuthState(organizacaoId) {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()

  // Ensure table exists (idempotent)
  await client.query(`
    CREATE TABLE IF NOT EXISTS baileys_auth_state (
      id TEXT NOT NULL,
      "organizacaoId" TEXT NOT NULL,
      data JSONB NOT NULL,
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (id)
    )
  `)
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_baileys_auth_org ON baileys_auth_state ("organizacaoId")
  `)

  const keyPrefix = `baileys:${organizacaoId}:`

  async function readData(key) {
    const fullKey = `${keyPrefix}${key}`
    const result = await client.query(
      'SELECT data FROM baileys_auth_state WHERE id = $1',
      [fullKey]
    )
    if (result.rows.length === 0) return null
    return JSON.parse(JSON.stringify(result.rows[0].data), BufferJSON.reviver)
  }

  async function writeData(key, value) {
    const fullKey = `${keyPrefix}${key}`
    const json = JSON.parse(JSON.stringify(value, BufferJSON.replacer))
    await client.query(
      `INSERT INTO baileys_auth_state (id, "organizacaoId", data, "updatedAt")
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (id) DO UPDATE SET data = $3, "updatedAt" = NOW()`,
      [fullKey, organizacaoId, json]
    )
  }

  async function removeData(key) {
    const fullKey = `${keyPrefix}${key}`
    await client.query('DELETE FROM baileys_auth_state WHERE id = $1', [fullKey])
  }

  async function clearAll() {
    await client.query(
      'DELETE FROM baileys_auth_state WHERE "organizacaoId" = $1',
      [organizacaoId]
    )
  }

  // Load or initialize creds
  let creds = await readData('creds')
  if (!creds) {
    creds = initAuthCreds()
    await writeData('creds', creds)
  }

  const state = {
    creds,
    keys: {
      get: async (type, ids) => {
        const result = {}
        for (const id of ids) {
          const value = await readData(`${type}-${id}`)
          if (value) {
            if (type === 'app-state-sync-key') {
              result[id] = proto.Message.AppStateSyncKeyData.fromObject(value)
            } else {
              result[id] = value
            }
          }
        }
        return result
      },
      set: async (data) => {
        for (const [category, entries] of Object.entries(data)) {
          for (const [id, value] of Object.entries(entries)) {
            if (value) {
              await writeData(`${category}-${id}`, value)
            } else {
              await removeData(`${category}-${id}`)
            }
          }
        }
      },
    },
  }

  return {
    state,
    saveCreds: () => writeData('creds', state.creds),
    clearAll,
    close: () => client.end(),
  }
}

module.exports = { usePostgresAuthState }
