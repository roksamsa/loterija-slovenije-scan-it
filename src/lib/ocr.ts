import { createWorker, PSM, type LoggerMessage, type Worker } from 'tesseract.js'
import { bestConfirmationId } from './parseTicket'
import { preprocessForOcr } from './ocrPreprocess'

let worker: Worker | null = null
let gutenOcrPromise: Promise<{ detect(image: string): Promise<{ text: string }[]> }> | null = null

export type OcrProgress = (p: { status: string; progress: number }) => void

const GUTEN_MODELS = {
  detectionPath: '/guten-ocr/ch_PP-OCRv4_det_infer.onnx',
  recognitionPath: '/guten-ocr/ch_PP-OCRv4_rec_infer.onnx',
  dictionaryPath: '/guten-ocr/ppocr_keys_v1.txt',
}

function toRecognizeSource(
  image: ImageData | HTMLCanvasElement | HTMLImageElement | Blob
): HTMLCanvasElement | Blob {
  if (image instanceof ImageData) {
    return imageDataToCanvas(image)
  }
  if (image instanceof HTMLCanvasElement) {
    return preprocessForOcr(image)
  }
  if (image instanceof HTMLImageElement) {
    return preprocessForOcr(image)
  }
  return image
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('Slike ni bilo mogoče pripraviti za OCR'))
    }, 'image/png')
  })
}

function imageToCanvas(image: HTMLImageElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth || image.width
  canvas.height = image.naturalHeight || image.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No 2D context')
  ctx.drawImage(image, 0, 0)
  return canvas
}

function imageDataToCanvas(image: ImageData): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = image.width
  canvas.height = image.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No 2D context')
  ctx.putImageData(image, 0, 0)
  return canvas
}

async function toObjectUrl(image: ImageData | HTMLCanvasElement | HTMLImageElement | Blob): Promise<string> {
  if (image instanceof Blob) return URL.createObjectURL(image)

  const canvas =
    image instanceof HTMLCanvasElement
      ? image
      : image instanceof HTMLImageElement
        ? imageToCanvas(image)
        : imageDataToCanvas(image)

  return URL.createObjectURL(await canvasToBlob(canvas))
}

async function getGutenOcr() {
  if (!gutenOcrPromise) {
    gutenOcrPromise = (async () => {
      const [{ default: Ocr }, { env }] = await Promise.all([
        import('@gutenye/ocr-browser'),
        import('onnxruntime-web'),
      ])

      env.wasm.wasmPaths = '/onnxruntime-web/'

      return Ocr.create({
        models: GUTEN_MODELS,
      })
    })()
  }

  return gutenOcrPromise
}

async function runGutenOcr(
  image: ImageData | HTMLCanvasElement | HTMLImageElement | Blob,
  onProgress?: OcrProgress
): Promise<string> {
  onProgress?.({ status: 'loading guten ocr', progress: 0.08 })
  const ocr = await getGutenOcr()
  const url = await toObjectUrl(image)

  try {
    onProgress?.({ status: 'recognizing text', progress: 0.35 })
    const lines = await ocr.detect(url)
    onProgress?.({ status: 'recognizing text', progress: 0.85 })
    return lines.map((line) => line.text).join('\n')
  } finally {
    URL.revokeObjectURL(url)
  }
}

async function runTesseractOcr(
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

export async function runOcr(
  image: ImageData | HTMLCanvasElement | HTMLImageElement | Blob,
  onProgress?: OcrProgress
): Promise<string> {
  try {
    const gutenText = await runGutenOcr(image, onProgress)
    if (bestConfirmationId(gutenText)) {
      onProgress?.({ status: 'done', progress: 1 })
      return gutenText
    }

    const tesseractText = await runTesseractOcr(image, onProgress)
    return [gutenText, tesseractText].filter(Boolean).join('\n')
  } catch (error) {
    console.warn('Guten OCR failed, falling back to Tesseract OCR', error)
    return runTesseractOcr(image, onProgress)
  }
}
