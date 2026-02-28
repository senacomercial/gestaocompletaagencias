/**
 * Abstract Payment Service — Story 8.3
 *
 * IPaymentGateway defines the contract for all payment providers.
 * Use `getPaymentGateway()` to get the configured implementation.
 */

export interface ChargeInput {
  pedidoId: string
  leadNome: string
  leadEmail?: string
  valor: number
  descricao: string
  dueDate: string // YYYY-MM-DD
}

export interface ChargeResult {
  cobrancaId: string
  linkPagamento: string
  status: string
}

export interface WebhookValidationResult {
  valid: boolean
  pedidoId?: string
  event?: string
}

export interface IPaymentGateway {
  createCharge(input: ChargeInput): Promise<ChargeResult>
  validateWebhook(body: string, signature: string): WebhookValidationResult
  cancelCharge(cobrancaId: string): Promise<void>
}

// ── PIX Manual (default) ──────────────────────────────────────────────────

class PixManualGateway implements IPaymentGateway {
  async createCharge(_input: ChargeInput): Promise<ChargeResult> {
    const pixChave = process.env.PIX_CHAVE ?? ''
    return {
      cobrancaId: `pix_${Date.now()}`,
      linkPagamento: pixChave,
      status: 'pending',
    }
  }

  validateWebhook(_body: string, _signature: string): WebhookValidationResult {
    // PIX manual: não tem webhook automático, confirmação é manual via comprovante
    return { valid: true }
  }

  async cancelCharge(_cobrancaId: string): Promise<void> {
    // PIX manual: sem cancelamento automático
  }
}

// ── Asaas Gateway ──────────────────────────────────────────────────────────

class AsaasGateway implements IPaymentGateway {
  private baseUrl: string
  private apiKey: string

  constructor() {
    const isSandbox = process.env.ASAAS_SANDBOX === 'true'
    this.baseUrl = isSandbox
      ? 'https://sandbox.asaas.com/api/v3'
      : 'https://api.asaas.com/v3'
    this.apiKey = process.env.ASAAS_API_KEY ?? ''
  }

  async createCharge(input: ChargeInput): Promise<ChargeResult> {
    // Create or find customer
    const customerRes = await fetch(`${this.baseUrl}/customers`, {
      method: 'POST',
      headers: { 'access_token': this.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: input.leadNome,
        email: input.leadEmail ?? undefined,
        externalReference: input.pedidoId,
      }),
    })
    const customer = await customerRes.json() as { id: string }

    const res = await fetch(`${this.baseUrl}/payments`, {
      method: 'POST',
      headers: { 'access_token': this.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer: customer.id,
        billingType: 'PIX',
        value: input.valor,
        dueDate: input.dueDate,
        description: input.descricao,
        externalReference: input.pedidoId,
      }),
    })
    const payment = await res.json() as { id: string; invoiceUrl?: string; bankSlipUrl?: string; pixQrCode?: { payload: string } }

    return {
      cobrancaId: payment.id,
      linkPagamento: payment.invoiceUrl ?? payment.bankSlipUrl ?? payment.pixQrCode?.payload ?? '',
      status: 'pending',
    }
  }

  validateWebhook(body: string, signature: string): WebhookValidationResult {
    // Asaas uses access token validation — check signature header
    const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN ?? ''
    if (expectedToken && signature !== expectedToken) {
      return { valid: false }
    }
    try {
      const payload = JSON.parse(body) as { event?: string; payment?: { externalReference?: string } }
      return {
        valid: true,
        event: payload.event,
        pedidoId: payload.payment?.externalReference,
      }
    } catch {
      return { valid: false }
    }
  }

  async cancelCharge(cobrancaId: string): Promise<void> {
    await fetch(`${this.baseUrl}/payments/${cobrancaId}/cancel`, {
      method: 'POST',
      headers: { 'access_token': this.apiKey },
    })
  }
}

// ── Mercado Pago Gateway ───────────────────────────────────────────────────

class MercadoPagoGateway implements IPaymentGateway {
  private accessToken: string

  constructor() {
    this.accessToken = process.env.MP_ACCESS_TOKEN ?? ''
  }

  async createCharge(input: ChargeInput): Promise<ChargeResult> {
    const n = Math.min(input.numOutputs ?? 1, 4) // DALL-E max 4 per request
    const res = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': input.pedidoId,
      },
      body: JSON.stringify({
        transaction_amount: input.valor,
        description: input.descricao,
        payment_method_id: 'pix',
        payer: { email: input.leadEmail ?? 'cliente@fotoia.com' },
        external_reference: input.pedidoId,
      }),
    })
    const payment = await res.json() as { id: number; point_of_interaction?: { transaction_data?: { qr_code?: string; ticket_url?: string } } }

    return {
      cobrancaId: String(payment.id),
      linkPagamento: payment.point_of_interaction?.transaction_data?.ticket_url
        ?? payment.point_of_interaction?.transaction_data?.qr_code
        ?? '',
      status: 'pending',
    }
  }

  validateWebhook(body: string, signature: string): WebhookValidationResult {
    // MP uses X-Signature header (HMAC-SHA256) — basic validation
    if (!signature) return { valid: false }
    try {
      const payload = JSON.parse(body) as { action?: string; data?: { id?: string } }
      return {
        valid: true,
        event: payload.action,
        pedidoId: undefined, // Need to lookup by payment ID
      }
    } catch {
      return { valid: false }
    }
  }

  async cancelCharge(cobrancaId: string): Promise<void> {
    await fetch(`https://api.mercadopago.com/v1/payments/${cobrancaId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'cancelled' }),
    })
  }
}

// ── Factory ────────────────────────────────────────────────────────────────

let _instance: IPaymentGateway | null = null

export function getPaymentGateway(): IPaymentGateway {
  if (_instance) return _instance

  const provider = process.env.PAYMENT_GATEWAY ?? 'pix_manual'

  switch (provider) {
    case 'asaas':
      _instance = new AsaasGateway()
      break
    case 'mercadopago':
      _instance = new MercadoPagoGateway()
      break
    default:
      _instance = new PixManualGateway()
  }

  return _instance
}

// Reset for testing
export function resetPaymentGateway(): void {
  _instance = null
}
