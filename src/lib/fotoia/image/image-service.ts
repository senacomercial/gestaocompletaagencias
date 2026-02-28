/**
 * Abstract Image Generator Service — Story 8.4
 *
 * IImageGenerator defines the contract for all image generation providers.
 * Use `getImageGenerator()` to get the configured implementation.
 */

export interface GenerateInput {
  prompt: string
  negativePrompt?: string
  numOutputs?: number
  width?: number
  height?: number
  imageUrl?: string   // For face-conditioned models (PhotoMaker)
  styleStrength?: number
  guidanceScale?: number
  webhookUrl?: string
  pedidoId?: string
}

export interface GenerateResult {
  predictionId: string
  status: 'started' | 'succeeded' | 'failed'
  outputUrls?: string[]
}

export interface PredictionStatus {
  id: string
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled'
  outputUrls?: string[]
  error?: string
}

export interface IImageGenerator {
  generate(input: GenerateInput): Promise<GenerateResult>
  getResult(predictionId: string): Promise<PredictionStatus>
  cancelPrediction?(predictionId: string): Promise<void>
}

// ── Replicate Implementation ───────────────────────────────────────────────

const PHOTOMAKER_MODEL = 'tencentarc/photomaker-style:ddfc2b08d209f9fa8c1eca692712918bd449f695d786de39a1d4f0c4cbed1433'

class ReplicateGenerator implements IImageGenerator {
  private apiToken: string

  constructor() {
    this.apiToken = process.env.REPLICATE_API_TOKEN ?? ''
  }

  async generate(input: GenerateInput): Promise<GenerateResult> {
    const modelVersion = PHOTOMAKER_MODEL.split(':')[1]
    const body = {
      version: modelVersion,
      input: {
        prompt: input.prompt,
        negative_prompt: input.negativePrompt ?? 'blurry, low quality, distorted, ugly',
        num_outputs: input.numOutputs ?? 4,
        num_inference_steps: 20,
        style_name: 'Photographic (Default)',
        style_strength_ratio: input.styleStrength ?? 20,
        guidance_scale: input.guidanceScale ?? 5,
        ...(input.imageUrl && { input_image: input.imageUrl }),
      },
      ...(input.webhookUrl && {
        webhook: input.webhookUrl,
        webhook_events_filter: ['completed'],
      }),
    }

    const res = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${this.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Replicate error ${res.status}: ${err}`)
    }

    const prediction = await res.json() as { id: string; status: string; output?: string[] }
    return {
      predictionId: prediction.id,
      status: 'started',
      outputUrls: prediction.output,
    }
  }

  async getResult(predictionId: string): Promise<PredictionStatus> {
    const res = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
      headers: { 'Authorization': `Token ${this.apiToken}` },
    })
    const data = await res.json() as { id: string; status: string; output?: string[]; error?: string }
    return {
      id: data.id,
      status: data.status as PredictionStatus['status'],
      outputUrls: data.output,
      error: data.error,
    }
  }

  async cancelPrediction(predictionId: string): Promise<void> {
    await fetch(`https://api.replicate.com/v1/predictions/${predictionId}/cancel`, {
      method: 'POST',
      headers: { 'Authorization': `Token ${this.apiToken}` },
    })
  }
}

// ── DALL-E Fallback ────────────────────────────────────────────────────────

class DalleGenerator implements IImageGenerator {
  private apiKey: string

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY ?? ''
  }

  async generate(input: GenerateInput): Promise<GenerateResult> {
    const n = Math.min(input.numOutputs ?? 1, 4) // DALL-E max 4 per request
    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: input.prompt,
        n: 1, // DALL-E 3 only supports n=1
        size: '1024x1024',
        quality: 'standard',
        response_format: 'url',
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`DALL-E error ${res.status}: ${err}`)
    }

    const data = await res.json() as { data: Array<{ url: string }> }
    const urls = data.data.map(d => d.url)
    const predictionId = `dalle_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

    return {
      predictionId,
      status: 'succeeded',
      outputUrls: urls,
    }
  }

  async getResult(predictionId: string): Promise<PredictionStatus> {
    // DALL-E is synchronous — if we have a dalle_ ID, it's already done
    return {
      id: predictionId,
      status: 'succeeded',
    }
  }
}

// ── Factory ────────────────────────────────────────────────────────────────

let _instance: IImageGenerator | null = null

export function getImageGenerator(): IImageGenerator {
  if (_instance) return _instance

  const provider = process.env.IMAGE_PROVIDER ?? 'replicate'

  switch (provider) {
    case 'dalle':
    case 'openai':
      _instance = new DalleGenerator()
      break
    default:
      _instance = new ReplicateGenerator()
  }

  return _instance
}

export function resetImageGenerator(): void {
  _instance = null
}
