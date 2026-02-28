/**
 * wa-sender.ts — Envia mensagens e imagens via WhatsApp (Baileys socket-server)
 * Chama os endpoints HTTP do socket-server que tem acesso ao sock do Baileys.
 */

const SOCKET_URL = `http://localhost:${process.env.SOCKET_PORT ?? '3001'}`

/**
 * Envia mensagem de texto para um número de WhatsApp.
 */
export async function enviarTexto(
  organizacaoId: string,
  telefone: string,
  corpo: string,
): Promise<void> {
  const res = await fetch(`${SOCKET_URL}/wa-send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ organizacaoId, telefone, corpo }),
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`Falha ao enviar texto WA (${res.status}): ${txt}`)
  }
}

/**
 * Envia uma imagem por URL para um número de WhatsApp.
 */
export async function enviarImagem(
  organizacaoId: string,
  telefone: string,
  imagemUrl: string,
  caption?: string,
): Promise<void> {
  const res = await fetch(`${SOCKET_URL}/wa-send-image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ organizacaoId, telefone, imagemUrl, caption }),
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`Falha ao enviar imagem WA (${res.status}): ${txt}`)
  }
}

/**
 * Envia múltiplas imagens sequencialmente via WhatsApp.
 * Aguarda 800ms entre cada envio para não ser bloqueado.
 */
export async function enviarImagens(
  organizacaoId: string,
  telefone: string,
  imagemUrls: string[],
  caption?: string,
): Promise<void> {
  for (let i = 0; i < imagemUrls.length; i++) {
    const cap = i === 0 ? caption : undefined
    await enviarImagem(organizacaoId, telefone, imagemUrls[i], cap)
    if (i < imagemUrls.length - 1) {
      await new Promise(r => setTimeout(r, 800))
    }
  }
}
