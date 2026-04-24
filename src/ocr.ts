import { createWorker, PSM, type LoggerMessage, type Worker } from 'tesseract.js'
import { preprocessForOcr } from './ocrPreprocess'

let worker: Worker | null = null

export type OcrProgress = (p: { status: string; progress: number }) => void

function toRecognizeSource(
  image: ImageData | HTMLCanvasElement | HTMLImageElement | Blob
): ImageData | HTMLCanvasElement | Blob {
  if (image instanceof HTMLCanvasElement) {
    return preprocessForOcr(image)
  }
  if (image instanceof HTMLImageElement) {
    return preprocessForOcr(image)
  }
  return image
}

export async function runOcr(
  image: ImageData | HTMLCanvasElement | HTMLImageElement | Blob,
  onProgress?: OcrProgress
): Promise<string> {
  const logger = (m: LoggerMessage) => {
    if (m.status === 'recognizing text' && typeof m.progress === 'number') {
      onProgress?.({ status: m.status, progress: m.progress })
    }
  }

  if (!worker) {
    worker = await createWorker('slv+eng', 1, { logger })
  }

  await worker.setParameters({
    tessedit_pageseg_mode: PSM.AUTO,
    preserve_interword_spaces: '1',
  })

  onProgress?.({ status: 'recognizing text', progress: 0.02 })
  const src = toRecognizeSource(image)
  const {
    data: { text },
  } = await worker.recognize(src)
  onProgress?.({ status: 'done', progress: 1 })
  return text
}
