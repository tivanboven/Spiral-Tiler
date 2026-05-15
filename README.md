# Spiral Tiler

A sequence-based spiral pattern generator webapp built with React and Next.js. Configure chess-like pieces with custom move patterns and generate intricate spiral tiling patterns.

## Features

- 🎨 Real-time pattern visualization on an interactive canvas
- 🎯 Configurable pieces with custom movement vectors  
- 🔄 Drag-to-reorder pieces in the cycle sequence
- 📊 Adjustable resolution from 100 to 4M placements
- 💾 Export pixel-perfect 8000×8000 PNG images
- 🌐 Share, download, or copy patterns to clipboard
- ⚡ Smooth zoom and pan controls

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn

### Installation & Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm start
```

## Deployment

### Deploy to Vercel

The easiest way to deploy is with [Vercel](https://vercel.com):

```bash
npm install -g vercel
vercel
```

Or connect your GitHub repository to Vercel for automatic deployments.

### Deploy to other platforms

Since this is a standard Next.js app, it can be deployed to any platform that supports Node.js (Netlify, Railway, Render, etc.)

## Usage

1. **Configure Pieces**: Select a piece from the cycle order and customize its movement pattern using the grid editor
2. **Set Resolution**: Choose the number of placements (100 to 4M)
3. **Run Pattern**: Click "Run Pattern" to generate the tiling
4. **Explore**: Use mouse wheel to zoom, drag to pan
5. **Export**: Click "8k PNG" to render and download an 8000×8000 pixel image

## Technical Details

- **Framework**: Next.js 14 with React 18
- **Styling**: Inline styles with dark theme
- **Performance**: Chunked algorithm execution for responsive UI
- **Canvas**: Hardware-accelerated 2D rendering with smooth interactions
- **Export**: Pixel-perfect PNG generation up to 8000×8000 pixels

## License

MIT
