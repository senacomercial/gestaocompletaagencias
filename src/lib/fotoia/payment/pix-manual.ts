import Anthropic from '@anthropic-ai/sdk'

export interface PixConfig {
  chave: string
  tipo: string
  nome: string
}

export interface ResultadoValidacao {
  valido: boolean
  valorEncontrado?: number
  destinatarioConfere: boolean
  motivo: string
}

const TIPO_LABELS: Record<string, string> = {
  cpf: 'CPF',
  cnpj: 'CNPJ',
  email: 'E-mail',
  telefone: 'Telefone',
  aleatoria: 'Chave Aleatória',
}

/**
 * Retorna a configuração de PIX manual lida das variáveis de ambiente.
 * Retorna null se PIX_CHAVE não estiver configurada.
 */
export function getPixConfig(): PixConfig | null {
  const chave = process.env.PIX_CHAVE?.trim()
  if (!chave) return null
  return {
    chave,
    tipo: process.env.PIX_TIPO?.trim() ?? 'chave',
    nome: process.env.PIX_NOME?.trim() ?? 'Agência',
  }
}

/**
 * Retorna o label legível do tipo de chave PIX.
 */
export function getTipoLabel(tipo: string): string {
  return TIPO_LABELS[tipo.toLowerCase()] ?? tipo
}

/**
 * Envia o comprovante de pagamento para o Claude analisar e valida se
 * o valor e o destinatário correspondem ao pedido.
 *
 * @param fileBuffer   Buffer com o conteúdo do arquivo (imagem ou PDF)
 * @param mimeType     MIME type: image/jpeg, image/png, image/webp ou application/pdf
 * @param valorEsperado Valor em reais que deve constar no comprovante
 * @param chavePix     Chave PIX ou nome do beneficiário esperado
 * @param nomeBeneficiario Nome do beneficiário cadastrado
 */
export async function validarComprovanteComIA(
  fileBuffer: Buffer,
  mimeType: string,
  valorEsperado: number,
  chavePix: string,
  nomeBeneficiario: string,
): Promise<ResultadoValidacao> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY não configurada')
  }

  const client = new Anthropic({ apiKey })
  const base64 = fileBuffer.toString('base64')

  const valorFormatado = valorEsperado.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })

  const systemPrompt = `Você é um validador especializado em comprovantes de pagamento PIX brasileiro.
Analise o documento fornecido e extraia as informações do pagamento.
Responda APENAS com um objeto JSON válido, sem markdown, sem explicações adicionais.`

  const userPrompt = `Analise este comprovante de pagamento PIX e responda em JSON com a seguinte estrutura:
{
  "valido": boolean,
  "valorEncontrado": number ou null,
  "destinatarioConfere": boolean,
  "motivo": "string explicando o resultado"
}

Critérios para validação:
1. O documento deve ser um comprovante PIX válido (extrato bancário, comprovante de transferência, ou recibo PIX)
2. O valor pago deve ser ${valorFormatado} (aceite uma margem de R$ 0,01 por arredondamento)
3. O destinatário deve corresponder à chave "${chavePix}" OU ao nome "${nomeBeneficiario}"

Se algum critério não for atendido, defina valido: false e explique em "motivo".
Se não conseguir ler o documento, defina valido: false com motivo explicando.`

  // Monta o conteúdo da mensagem de acordo com o tipo de arquivo
  let mediaContent: Anthropic.MessageParam['content']

  if (mimeType === 'application/pdf') {
    mediaContent = [
      {
        type: 'document',
        source: {
          type: 'base64',
          media_type: 'application/pdf',
          data: base64,
        },
      } as unknown as Anthropic.TextBlockParam,
      {
        type: 'text',
        text: userPrompt,
      },
    ]
  } else {
    const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const
    type ValidImageMediaType = typeof validImageTypes[number]
    const imageMediaType: ValidImageMediaType = validImageTypes.includes(mimeType as ValidImageMediaType)
      ? (mimeType as ValidImageMediaType)
      : 'image/jpeg'

    mediaContent = [
      {
        type: 'image',
        source: {
          type: 'base64',
          media_type: imageMediaType,
          data: base64,
        },
      },
      {
        type: 'text',
        text: userPrompt,
      },
    ]
  }

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: mediaContent,
      },
    ],
  })

  const rawText = response.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as Anthropic.TextBlock).text)
    .join('')
    .trim()

  // Extrai o JSON da resposta (remove possíveis marcadores de código)
  const jsonMatch = rawText.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    return {
      valido: false,
      destinatarioConfere: false,
      motivo: 'Não foi possível interpretar a resposta da IA. Tente novamente.',
    }
  }

  const parsed = JSON.parse(jsonMatch[0]) as {
    valido?: boolean
    valorEncontrado?: number | null
    destinatarioConfere?: boolean
    motivo?: string
  }

  return {
    valido: parsed.valido ?? false,
    valorEncontrado: parsed.valorEncontrado ?? undefined,
    destinatarioConfere: parsed.destinatarioConfere ?? false,
    motivo: parsed.motivo ?? 'Resultado sem descrição.',
  }
}
