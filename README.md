# UltimatePalette

Extract dominant color palettes, contrast pairs, CSS variables, Tailwind tokens, and downloadable swatches from any image.

UltimatePalette is a client-side image palette tool with a Shadorux-style default interface. Images stay in the browser; palette extraction runs with the Canvas API.

## Features

- Drag-and-drop or choose an image
- Extract dominant colors
- Copy HEX values directly from swatches
- View RGB and HSL representations
- Generate strongest contrast pairs with WCAG-style contrast ratios
- Assign semantic roles such as `background`, `surface`, `primary`, `accent`, and `text`
- Export CSS custom properties
- Export Tailwind-friendly color tokens
- Export JSON
- Download the extracted palette as a PNG strip
- Responsive red/black Shadorux interface

## Run locally

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

## How extraction works

The browser downsamples the uploaded image, samples pixels, groups nearby RGB values into color buckets, and ranks those buckets by frequency. The MVP intentionally keeps the algorithm dependency-free so it can run entirely client-side.

## Roadmap

- Adjustable palette size and extraction sensitivity
- Better perceptual color clustering
- Editable semantic roles
- Color locking and manual palette tuning
- SVG swatch export
- Shareable palette links
- Palette history stored locally

## Stack

React, TypeScript, Vite, Canvas API, and Lucide icons.

## License

MIT
