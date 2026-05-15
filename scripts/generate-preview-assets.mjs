import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const outputDir = path.resolve('public/assets/previews');
await fs.mkdir(outputDir, { recursive: true });

const previews = [
  {
    file: 'desarrollo-web-quito.webp',
    title: 'Página web express',
    subtitle: 'WhatsApp + SEO local Quito',
    accent: '#c2a56d',
  },
  {
    file: 'tienda-online-ecuador.webp',
    title: 'Tienda online Ecuador',
    subtitle: 'Catálogo, pagos y pedidos',
    accent: '#56b6c6',
  },
  {
    file: 'inventario-pymes-quito.webp',
    title: 'Inventario para pymes',
    subtitle: 'Stock, alertas y reportes',
    accent: '#88b4cf',
  },
];

for (const preview of previews) {
  const svg = `
    <svg width="960" height="600" viewBox="0 0 960 600" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#101821"/>
          <stop offset="0.55" stop-color="#2c3947"/>
          <stop offset="1" stop-color="#0b1118"/>
        </linearGradient>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#000" flood-opacity="0.35"/>
        </filter>
      </defs>
      <rect width="960" height="600" fill="url(#bg)"/>
      <circle cx="820" cy="120" r="210" fill="${preview.accent}" opacity="0.18"/>
      <circle cx="120" cy="520" r="180" fill="#e8edf2" opacity="0.08"/>
      <g filter="url(#shadow)">
        <rect x="92" y="72" width="776" height="456" rx="24" fill="#f8fafc"/>
        <rect x="92" y="72" width="776" height="54" rx="24" fill="#e5e7eb"/>
        <circle cx="126" cy="99" r="8" fill="#ef4444"/>
        <circle cx="154" cy="99" r="8" fill="#f59e0b"/>
        <circle cx="182" cy="99" r="8" fill="#22c55e"/>
        <rect x="128" y="164" width="380" height="34" rx="10" fill="#111827"/>
        <rect x="128" y="220" width="520" height="18" rx="9" fill="#64748b" opacity="0.72"/>
        <rect x="128" y="252" width="440" height="18" rx="9" fill="#64748b" opacity="0.46"/>
        <rect x="128" y="304" width="170" height="48" rx="24" fill="${preview.accent}"/>
        <rect x="330" y="304" width="170" height="48" rx="24" fill="#111827"/>
        <rect x="616" y="160" width="172" height="234" rx="20" fill="#111827"/>
        <rect x="640" y="190" width="124" height="18" rx="9" fill="${preview.accent}"/>
        <rect x="640" y="230" width="100" height="12" rx="6" fill="#e5e7eb" opacity="0.72"/>
        <rect x="640" y="258" width="124" height="12" rx="6" fill="#e5e7eb" opacity="0.46"/>
        <rect x="640" y="318" width="92" height="36" rx="18" fill="#25d366"/>
        <rect x="128" y="410" width="190" height="72" rx="18" fill="#e8edf2"/>
        <rect x="346" y="410" width="190" height="72" rx="18" fill="#e8edf2"/>
        <rect x="564" y="410" width="190" height="72" rx="18" fill="#e8edf2"/>
      </g>
      <text x="128" y="190" font-family="Inter, Arial, sans-serif" font-size="32" font-weight="800" fill="#111827">${preview.title}</text>
      <text x="128" y="238" font-family="Inter, Arial, sans-serif" font-size="22" font-weight="600" fill="#475569">${preview.subtitle}</text>
      <text x="128" y="334" font-family="Inter, Arial, sans-serif" font-size="16" font-weight="800" fill="#111827">Ver demo</text>
      <text x="358" y="334" font-family="Inter, Arial, sans-serif" font-size="16" font-weight="800" fill="#f8fafc">WhatsApp</text>
    </svg>`;

  await sharp(Buffer.from(svg))
    .resize({ width: 640 })
    .webp({ quality: 72, effort: 6 })
    .toFile(path.join(outputDir, preview.file));
}
