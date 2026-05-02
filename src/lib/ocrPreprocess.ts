/**
 * Povečaj kontrast in ločljivost pred Tesseractom (mali tisk na listkih).
 * Manj učinkovito kot namenski obrez pravega bloka, a stabilno in brez Otsu knjižnic.
 */
export function preprocessForOcr(source: HTMLCanvasElement | HTMLImageElement): HTMLCanvasElement {
  const w = source.width
  const h = source.height
  if (w < 1 || h < 1) {
    return source instanceof HTMLCanvasElement ? source : cloneToCanvas(source)
  }

  const scale = 2
  const out = document.createElement('canvas')
  out.width = Math.min(5000, Math.round(w * scale))
  out.height = Math.min(5000, Math.round(h * scale))
  const ctx = out.getContext('2d', { willReadFrequently: true })
  if (!ctx) return source instanceof HTMLCanvasElement ? source : cloneToCanvas(source)

  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, 0, 0, out.width, out.height)

  const img = ctx.getImageData(0, 0, out.width, out.height)
  const d = img.data
  const n = d.length / 4
  const greys = new Float64Array(n)
  for (let i = 0, j = 0; i < d.length; i += 4, j++) {
    greys[j] = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
  }

  const tail = 0.015
  const hist = new Uint32Array(256)
  for (let j = 0; j < n; j++) {
    const b = Math.max(0, Math.min(255, Math.round(greys[j])))
    hist[b] += 1
  }

  let acc = 0
  let minG = 0
  let maxG = 255
  for (let t = 0; t < 256; t++) {
    acc += hist[t]
    if (acc >= n * tail) {
      minG = t
      break
    }
  }
  acc = 0
  for (let t = 255; t >= 0; t--) {
    acc += hist[t]
    if (acc >= n * tail) {
      maxG = t
      break
    }
  }
  if (maxG - minG < 20) {
    minG = 0
    maxG = 255
  }
  const range = maxG - minG || 1
  for (let i = 0, j = 0; i < d.length; i += 4, j++) {
    const v = ((greys[j] - minG) / range) * 255
    const t = v <= 0 ? 0 : v >= 255 ? 255 : v
    d[i] = t
    d[i + 1] = t
    d[i + 2] = t
    d[i + 3] = 255
  }
  ctx.putImageData(img, 0, 0)
  return out
}

function cloneToCanvas(source: HTMLImageElement): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = source.naturalWidth || source.width
  c.height = source.naturalHeight || source.height
  const x = c.getContext('2d')
  if (x) x.drawImage(source, 0, 0)
  return c
}
