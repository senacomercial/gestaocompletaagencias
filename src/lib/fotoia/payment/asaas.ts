export interface CreateChargeInput {
  customerName: string
  customerEmail: string
  customerCpfCnpj?: string
  value: number
  description: string
  dueDate: string // yyyy-MM-dd
}

export interface ChargeResult {
  chargeId: string
  paymentLink: string
  pixQrCode?: string
  status: string
}

function getAsaasBaseUrl(): string {
  return process.env.ASAAS_SANDBOX === 'true'
    ? 'https://sandbox.asaas.com/api/v3'
    : 'https://api.asaas.com/v3'
}

async function getOrCreateCustomer(customerName: string, customerEmail: string, cpfCnpj?: string): Promise<string> {
  const apiKey = process.env.ASAAS_API_KEY!
  const baseUrl = getAsaasBaseUrl()

  // Buscar cliente existente pelo email
  const searchRes = await fetch(`${baseUrl}/customers?email=${encodeURIComponent(customerEmail)}&limit=1`, {
    headers: { access_token: apiKey },
  })
  if (searchRes.ok) {
    const data = await searchRes.json()
    if (data.data?.length > 0) return data.data[0].id
  }

  // Criar novo cliente
  const createRes = await fetch(`${baseUrl}/customers`, {
    method: 'POST',
    headers: { access_token: apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: customerName,
      email: customerEmail,
      ...(cpfCnpj && { cpfCnpj }),
    }),
  })

  if (!createRes.ok) {
    const err = await createRes.text()
    throw new Error(`Erro ao criar cliente no Asaas: ${err}`)
  }

  const customer = await createRes.json()
  return customer.id
}

export async function createCharge(input: CreateChargeInput): Promise<ChargeResult> {
  const apiKey = process.env.ASAAS_API_KEY
  if (!apiKey) throw new Error('ASAAS_API_KEY não configurado')

  const baseUrl = getAsaasBaseUrl()
  const customerId = await getOrCreateCustomer(input.customerName, input.customerEmail, input.customerCpfCnpj)

  const response = await fetch(`${baseUrl}/payments`, {
    method: 'POST',
    headers: { access_token: apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customer: customerId,
      billingType: 'PIX',
      value: input.value,
      dueDate: input.dueDate,
      description: input.description,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Erro ao criar cobrança no Asaas: ${err}`)
  }

  const charge = await response.json()

  // Buscar QR Code PIX
  let pixQrCode: string | undefined
  try {
    const pixRes = await fetch(`${baseUrl}/payments/${charge.id}/pixQrCode`, {
      headers: { access_token: apiKey },
    })
    if (pixRes.ok) {
      const pixData = await pixRes.json()
      pixQrCode = pixData.payload
    }
  } catch {
    // PIX QR Code é opcional
  }

  return {
    chargeId: charge.id,
    paymentLink: charge.invoiceUrl ?? `${baseUrl}/payments/${charge.id}`,
    pixQrCode,
    status: charge.status,
  }
}

export async function validateWebhookSignature(body: string, signature: string): Promise<boolean> {
  const secret = process.env.ASAAS_WEBHOOK_SECRET
  if (!secret) return true // sem secret configurado, aceita

  const { createHmac } = await import('node:crypto')
  const expected = createHmac('sha256', secret).update(body).digest('hex')
  return expected === signature
}
