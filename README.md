# UltimatePalette

Extract dominant color palettes, contrast pairs, CSS variables, Tailwind tokens, and downloadable swatches from any image.

**Live:** https://ultimatepallete.shadorux.dev

UltimatePalette is a client-side image palette tool with a Shadorux-style default interface. Images stay in the browser; palette extraction runs with the Canvas API.

## Features

- Drag-and-drop or choose an image
- Adjustable palette size: 4 / 6 / 8 / 10 / 12 colors
- Perceptual color clustering to merge near-duplicate colors
- Copy HEX values directly from swatches
- View RGB and HSL representations
- Generate strongest contrast pairs with WCAG-style contrast ratios
- Auto-assign semantic roles such as `background`, `surface`, `primary`, `accent`, `text`, and `muted`
- Manually reassign semantic roles from the extracted palette
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

The browser downsamples the uploaded image, samples pixels, groups candidate colors, converts them into a perceptual color space, merges colors that are too visually similar, and ranks the resulting clusters by frequency. The extractor stays dependency-light and runs entirely client-side.

## Roadmap

- Adjustable extraction sensitivity
- Color locking and manual palette tuning
- SVG swatch export
- Shareable palette links
- Palette history stored locally

## Stack

React, TypeScript, Vite, Canvas API, and Lucide icons.

## License

MIT
