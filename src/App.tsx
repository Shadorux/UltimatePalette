import { useMemo, useRef, useState } from 'react'
import { Copy, Download, ImagePlus, Sparkles } from 'lucide-react'
import {
  assignRoles,
  downloadSwatches,
  extractPalette,
  getContrastPairs,
  type PaletteColor,
} from './palette'

const starterColors: PaletteColor[] = [
  { hex: '#09090B', rgb: 'rgb(9, 9, 11)', hsl: 'hsl(240 10% 4%)', count: 10 },
  { hex: '#18181B', rgb: 'rgb(24, 24, 27)', hsl: 'hsl(240 6% 10%)', count: 9 },
  { hex: '#EF1717', rgb: 'rgb(239, 23, 23)', hsl: 'hsl(0 87% 51%)', count: 8 },
  { hex: '#F97316', rgb: 'rgb(249, 115, 22)', hsl: 'hsl(25 95% 53%)', count: 6 },
  { hex: '#FACC15', rgb: 'rgb(250, 204, 21)', hsl: 'hsl(48 96% 53%)', count: 5 },
  { hex: '#F4F4F5', rgb: 'rgb(244, 244, 245)', hsl: 'hsl(240 5% 96%)', count: 4 },
]

const copy = async (value: string) => {
  await navigator.clipboard.writeText(value)
}

function App() {
  const [colors, setColors] = useState<PaletteColor[]>(starterColors)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [fileName, setFileName] = useState('Shadow-coded demo palette')
  const [status, setStatus] = useState('Drop an image to extract its palette.')
  const inputRef = useRef<HTMLInputElement>(null)

  const pairs = useMemo(() => getContrastPairs(colors), [colors])
  const roles = useMemo(() => assignRoles(colors), [colors])

  const cssExport = useMemo(() => {
    const lines = Object.entries(roles).map(([key, value]) => `  --${key}: ${value};`)
    return `:root {\n${lines.join('\n')}\n}`
  }, [roles])

  const tailwindExport = useMemo(
    () =>
      `theme: {\n  extend: {\n    colors: ${JSON.stringify(roles, null, 6)}\n  }\n}`,
    [roles],
  )

  const jsonExport = useMemo(
    () => JSON.stringify({ palette: colors.map((color) => color.hex), roles }, null, 2),
    [colors, roles],
  )

  const handleFile = async (file?: File) => {
    if (!file || !file.type.startsWith('image/')) return
    if (imageUrl) URL.revokeObjectURL(imageUrl)
    const nextUrl = URL.createObjectURL(file)
    setImageUrl(nextUrl)
    setFileName(file.name)
    setStatus('Extracting colors…')
    try {
      const palette = await extractPalette(file, 8)
      setColors(palette.length ? palette : starterColors)
      setStatus(`Extracted ${palette.length || starterColors.length} colors.`)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Palette extraction failed.')
    }
  }

  return (
    <main>
      <section className="hero shell">
        <div className="eyebrow"><Sparkles size={15} /> SHADORUX LAB // COLOR SYSTEM</div>
        <h1>ULTIMATE<span>PALETTE</span></h1>
        <p className="lede">
          Extract dominant colors, contrast pairs, CSS variables, Tailwind tokens, and downloadable swatches from any image.
        </p>
      </section>

      <section className="workspace shell">
        <button
          className="dropzone"
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault()
            void handleFile(event.dataTransfer.files[0])
          }}
        >
          <input
            ref={inputRef}
            hidden
            type="file"
            accept="image/*"
            onChange={(event) => void handleFile(event.target.files?.[0])}
          />
          {imageUrl ? <img src={imageUrl} alt="Uploaded preview" /> : <ImagePlus size={52} />}
          <div>
            <strong>{fileName}</strong>
            <span>{status}</span>
          </div>
        </button>

        <div className="panel">
          <div className="panel-head">
            <div>
              <span className="kicker">DOMINANT COLORS</span>
              <h2>Extracted palette</h2>
            </div>
            <button className="mini-button" onClick={() => downloadSwatches(colors)}>
              <Download size={16} /> PNG swatches
            </button>
          </div>

          <div className="swatches">
            {colors.map((color) => (
              <button className="swatch" key={color.hex} onClick={() => void copy(color.hex)}>
                <span className="swatch-color" style={{ background: color.hex }} />
                <span className="swatch-data">
                  <strong>{color.hex}</strong>
                  <small>{color.rgb}</small>
                  <small>{color.hsl}</small>
                </span>
                <Copy size={15} />
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="grid shell">
        <div className="panel">
          <span className="kicker">AUTO ROLES</span>
          <h2>Semantic color system</h2>
          <div className="roles">
            {Object.entries(roles).map(([role, value]) => (
              <button key={role} onClick={() => void copy(value)}>
                <span style={{ background: value }} />
                <b>{role}</b>
                <code>{value}</code>
              </button>
            ))}
          </div>
        </div>

        <div className="panel">
          <span className="kicker">ACCESSIBILITY</span>
          <h2>Strongest contrast pairs</h2>
          <div className="contrasts">
            {pairs.map((pair) => (
              <div key={`${pair.background.hex}-${pair.foreground.hex}`} style={{ background: pair.background.hex, color: pair.foreground.hex }}>
                <strong>Aa</strong>
                <span>{pair.background.hex} / {pair.foreground.hex}</span>
                <b>{pair.ratio.toFixed(2)}:1</b>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="exports shell">
        <ExportCard title="CSS VARIABLES" value={cssExport} />
        <ExportCard title="TAILWIND TOKENS" value={tailwindExport} />
        <ExportCard title="JSON" value={jsonExport} />
      </section>

      <footer className="shell">ULTIMATEPALETTE // BUILT BY SHADORUX</footer>
    </main>
  )
}

function ExportCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="panel export-card">
      <div className="panel-head">
        <span className="kicker">{title}</span>
        <button className="mini-button" onClick={() => void copy(value)}><Copy size={15} /> Copy</button>
      </div>
      <pre>{value}</pre>
    </div>
  )
}

export default App
