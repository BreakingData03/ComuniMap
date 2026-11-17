const MAX_DIMENSION = 1600
const QUALITY = 0.8

function toBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, QUALITY))
}

async function decode(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; close: () => void }> {
  if ('createImageBitmap' in window) {
    try {
      // from-image respeita a rotação EXIF das fotos de celular
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
      return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() }
    } catch {
      // cai no <img> abaixo
    }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => {} }
  } finally {
    URL.revokeObjectURL(url)
  }
}

/**
 * Reduz a foto para no máximo 1600 px e converte para WebP antes do envio.
 * Redesenhar no canvas também descarta os metadados EXIF (inclusive GPS).
 * Navegadores sem encoder WebP (Safari antigo) caem para JPEG.
 */
export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) throw new Error('O arquivo selecionado não é uma imagem.')

  let decoded
  try {
    decoded = await decode(file)
  } catch {
    throw new Error('Não foi possível ler a imagem.')
  }

  try {
    const scale = Math.min(1, MAX_DIMENSION / Math.max(decoded.width, decoded.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(decoded.width * scale))
    canvas.height = Math.max(1, Math.round(decoded.height * scale))

    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Não foi possível processar a imagem.')
    ctx.drawImage(decoded.source, 0, 0, canvas.width, canvas.height)

    let blob = await toBlob(canvas, 'image/webp')
    if (!blob || blob.type !== 'image/webp') blob = await toBlob(canvas, 'image/jpeg')
    if (!blob) throw new Error('Não foi possível processar a imagem.')

    const ext = blob.type === 'image/webp' ? 'webp' : 'jpg'
    return new File([blob], `foto.${ext}`, { type: blob.type })
  } finally {
    decoded.close()
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
