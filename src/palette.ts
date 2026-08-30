export type PaletteColor = {
  hex: string
  rgb: string
  hsl: string
  count: number
}

export type ContrastPair = {
  background: PaletteColor
  foreground: PaletteColor
  ratio: number
}

const clamp = (value: number) => Math.max(0, Math.min(255, value))

const toHex = (value: number) => clamp(value).toString(16).padStart(2, '0')

export const rgbToHex = (r: number, g: number, b: number) =>
  `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase()

export const rgbToHsl = (r: number, g: number, b: number) => {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const delta = max - min

  let h = 0
  if (delta !== 0) {
    if (max === rn) h = ((gn - bn) / delta) % 6
    else if (max === gn) h = (bn - rn) / delta + 2
    else h = (rn - gn) / delta + 4
    h *= 60
    if (h < 0) h += 360
  }

  const l = (max + min) / 2
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1))
  return `hsl(${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%)`
}

const hexToRgb = (hex: string) => {
  const clean = hex.replace('#', '')
  return {
    r: Number.parseInt(clean.slice(0, 2), 16),
    g: Number.parseInt(clean.slice(2, 4), 16),
    b: Number.parseInt(clean.slice(4, 6), 16),
  }
}

const luminance = (hex: string) => {
  const { r, g, b } = hexToRgb(hex)
  const channel = (value: number) => {
    const c = value / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

export const contrastRatio = (a: string, b: string) => {
  const l1 = luminance(a)
  const l2 = luminance(b)
  const light = Math.max(l1, l2)
  const dark = Math.min(l1, l2)
  return (light + 0.05) / (dark + 0.05)
}

export const getContrastPairs = (colors: PaletteColor[], limit = 6): ContrastPair[] => {
  const pairs: ContrastPair[] = []
  for (let i = 0; i < colors.length; i += 1) {
    for (let j = i + 1; j < colors.length; j += 1) {
      const ratio = contrastRatio(colors[i].hex, colors[j].hex)
      const firstLum = luminance(colors[i].hex)
      const secondLum = luminance(colors[j].hex)
      pairs.push({
        background: firstLum < secondLum ? colors[i] : colors[j],
        foreground: firstLum < secondLum ? colors[j] : colors[i],
        ratio,
      })
    }
  }
  return pairs.sort((a, b) => b.ratio - a.ratio).slice(0, limit)
}

export const assignRoles = (colors: PaletteColor[]) => {
  if (colors.length === 0) return {}
  const byLum = [...colors].sort((a, b) => luminance(a.hex) - luminance(b.hex))
  const background = byLum[0]
  const text = byLum[byLum.length - 1]
  const remaining = colors.filter((color) => color.hex !== background.hex && color.hex !== text.hex)
  return {
    background: background.hex,
    surface: byLum[Math.min(1, byLum.length - 1)].hex,
    primary: (remaining[0] ?? colors[0]).hex,
    accent: (remaining[1] ?? colors[Math.min(1, colors.length - 1)]).hex,
    text: text.hex,
    muted: byLum[Math.max(0, byLum.length - 2)].hex,
  }
}

export const extractPalette = async (file: File, count = 8): Promise<PaletteColor[]> => {
  const image = new Image()
  const objectUrl = URL.createObjectURL(file)

  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('Could not read that image.'))
      image.src = objectUrl
    })

    const maxSide = 260
    const scale = Math.min(1, maxSide / Math.max(image.width, image.height))
    const width = Math.max(1, Math.round(image.width * scale))
    const height = Math.max(1, Math.round(image.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) throw new Error('Canvas is unavailable in this browser.')

    context.drawImage(image, 0, 0, width, height)
    const pixels = context.getImageData(0, 0, width, height).data
    const buckets = new Map<string, { r: number; g: number; b: number; count: number }>()

    for (let i = 0; i < pixels.length; i += 16) {
      const alpha = pixels[i + 3]
      if (alpha < 180) continue
      const r = Math.round(pixels[i] / 32) * 32
      const g = Math.round(pixels[i + 1] / 32) * 32
      const b = Math.round(pixels[i + 2] / 32) * 32
      const key = `${r},${g},${b}`
      const existing = buckets.get(key)
      if (existing) existing.count += 1
      else buckets.set(key, { r, g, b, count: 1 })
    }

    return [...buckets.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, count)
      .map(({ r, g, b, count: frequency }) => {
        const cr = clamp(r)
        const cg = clamp(g)
        const cb = clamp(b)
        return {
          hex: rgbToHex(cr, cg, cb),
          rgb: `rgb(${cr}, ${cg}, ${cb})`,
          hsl: rgbToHsl(cr, cg, cb),
          count: frequency,
        }
      })
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

export const downloadSwatches = (colors: PaletteColor[]) => {
  if (!colors.length) return
  const canvas = document.createElement('canvas')
  canvas.width = 1200
  canvas.height = 240
  const context = canvas.getContext('2d')
  if (!context) return

  const swatchWidth = canvas.width / colors.length
  colors.forEach((color, index) => {
    context.fillStyle = color.hex
    context.fillRect(index * swatchWidth, 0, swatchWidth, canvas.height)
  })

  const anchor = document.createElement('a')
  anchor.download = 'ultimatepalette-swatches.png'
  anchor.href = canvas.toDataURL('image/png')
  anchor.click()
}
