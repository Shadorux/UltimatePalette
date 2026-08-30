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

export type ColorRoles = {
  background: string
  surface: string
  primary: string
  accent: string
  text: string
  muted: string
}

type Rgb = { r: number; g: number; b: number }
type WeightedRgb = Rgb & { count: number }
type Lab = { l: number; a: number; b: number }

const clamp = (value: number) => Math.max(0, Math.min(255, Math.round(value)))
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

const hexToRgb = (hex: string): Rgb => {
  const clean = hex.replace('#', '')
  return {
    r: Number.parseInt(clean.slice(0, 2), 16),
    g: Number.parseInt(clean.slice(2, 4), 16),
    b: Number.parseInt(clean.slice(4, 6), 16),
  }
}

const rgbToLab = ({ r, g, b }: Rgb): Lab => {
  const linearize = (value: number) => {
    const normalized = value / 255
    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4
  }

  const rn = linearize(r)
  const gn = linearize(g)
  const bn = linearize(b)

  const x = (rn * 0.4124 + gn * 0.3576 + bn * 0.1805) / 0.95047
  const y = rn * 0.2126 + gn * 0.7152 + bn * 0.0722
  const z = (rn * 0.0193 + gn * 0.1192 + bn * 0.9505) / 1.08883

  const pivot = (value: number) =>
    value > 0.008856 ? Math.cbrt(value) : 7.787 * value + 16 / 116

  const fx = pivot(x)
  const fy = pivot(y)
  const fz = pivot(z)

  return {
    l: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  }
}

const deltaE = (first: Rgb, second: Rgb) => {
  const a = rgbToLab(first)
  const b = rgbToLab(second)
  return Math.sqrt((a.l - b.l) ** 2 + (a.a - b.a) ** 2 + (a.b - b.b) ** 2)
}

const mergeSimilarColors = (colors: WeightedRgb[], threshold = 20) => {
  const clusters: WeightedRgb[] = []

  for (const color of colors.sort((a, b) => b.count - a.count)) {
    const match = clusters.find((cluster) => deltaE(color, cluster) < threshold)

    if (!match) {
      clusters.push({ ...color })
      continue
    }

    const total = match.count + color.count
    match.r = (match.r * match.count + color.r * color.count) / total
    match.g = (match.g * match.count + color.g * color.count) / total
    match.b = (match.b * match.count + color.b * color.count) / total
    match.count = total
  }

  return clusters.sort((a, b) => b.count - a.count)
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

export const assignRoles = (colors: PaletteColor[]): ColorRoles => {
  const fallback = '#000000'
  if (colors.length === 0) {
    return {
      background: fallback,
      surface: fallback,
      primary: fallback,
      accent: fallback,
      text: '#FFFFFF',
      muted: '#808080',
    }
  }

  const byLum = [...colors].sort((a, b) => luminance(a.hex) - luminance(b.hex))
  const background = byLum[0]
  const text = byLum[byLum.length - 1]
  const chromatic = colors
    .filter((color) => color.hex !== background.hex && color.hex !== text.hex)
    .sort((a, b) => {
      const labA = rgbToLab(hexToRgb(a.hex))
      const labB = rgbToLab(hexToRgb(b.hex))
      const chromaA = Math.hypot(labA.a, labA.b)
      const chromaB = Math.hypot(labB.a, labB.b)
      return chromaB - chromaA
    })

  return {
    background: background.hex,
    surface: byLum[Math.min(1, byLum.length - 1)].hex,
    primary: (chromatic[0] ?? colors[0]).hex,
    accent: (chromatic[1] ?? chromatic[0] ?? colors[Math.min(1, colors.length - 1)]).hex,
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

    const maxSide = 320
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
    const buckets = new Map<string, WeightedRgb>()

    for (let i = 0; i < pixels.length; i += 16) {
      const alpha = pixels[i + 3]
      if (alpha < 180) continue

      const r = clamp(Math.round(pixels[i] / 16) * 16)
      const g = clamp(Math.round(pixels[i + 1] / 16) * 16)
      const b = clamp(Math.round(pixels[i + 2] / 16) * 16)
      const key = `${r},${g},${b}`
      const existing = buckets.get(key)

      if (existing) existing.count += 1
      else buckets.set(key, { r, g, b, count: 1 })
    }

    const candidates = [...buckets.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, Math.max(count * 10, 48))

    const clustered = mergeSimilarColors(candidates)
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

    return clustered
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
