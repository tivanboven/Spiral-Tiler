import { Metadata } from 'next';
import './globals.css';

export const metadata = {
  title: 'Spiral Tiler - Pattern Generator',
  description: 'Sequence-based spiral pattern generator with configurable pieces and moves',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
