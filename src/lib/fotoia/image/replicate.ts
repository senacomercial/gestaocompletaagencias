export interface ImageGenerationInput {
  prompt: string
  negativePrompt?: string
  numOutputs?: number
  width?: number
  height?: number
}

export interface ImageGenerationResult {
  predictionId: string
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled'
  urls?: string[]
  error?: string
}

const DEFAULT_MODEL =
  'stability-ai/sdxl:39ed52f2319f9bf9f645aca573a99de73eb0b239b0d6f71022b56c8e617ee7c1'

export async function startImageGeneration(
  input: ImageGenerationInput,
  webhookUrl: string,
  model?: string,
): Promise<{ predictionId: string }> {
  const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN
  if (!REPLICATE_API_TOKEN) {
    throw new Error('REPLICATE_API_TOKEN não configurado')
  }

  const response = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      Authorization: `Token ${REPLICATE_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      version: model ?? DEFAULT_MODEL,
      input: {
        prompt: input.prompt,
        negative_prompt: input.negativePrompt ?? 'low quality, blurry, distorted',
        num_outputs: input.numOutputs ?? 4,
        width: input.width ?? 1024,
        height: input.height ?? 1024,
      },
      webhook: webhookUrl,
      webhook_events_filter: ['completed'],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Replicate API error: ${err}`)
  }

  const prediction = await response.json()
  return { predictionId: prediction.id }
}

export async function getPredictionStatus(predictionId: string): Promise<ImageGenerationResult> {
  const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN
  if (!REPLICATE_API_TOKEN) {
    throw new Error('REPLICATE_API_TOKEN não configurado')
  }

  const response = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
    headers: { Authorization: `Token ${REPLICATE_API_TOKEN}` },
  })

  if (!response.ok) throw new Error('Falha ao consultar prediction')

  const data = await response.json()
  return {
    predictionId: data.id,
    status: data.status,
    urls: Array.isArray(data.output) ? data.output : undefined,
    error: data.error,
  }
}
