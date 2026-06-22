#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Generate the Tikèm mark: teal rounded square + serif "T" + amber accent dot
// (echoing the è in Tikèm). Scales cleanly from favicon to app icon.
function generateSVGIcon(size) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="tikemMark" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
      <stop stop-color="#0F766E"/>
      <stop offset="1" stop-color="#0C5E57"/>
    </linearGradient>
  </defs>
  <rect width="100" height="100" rx="24" fill="url(#tikemMark)"/>
  <text x="50" y="72" font-family="Georgia, 'Times New Roman', serif" font-size="64" font-weight="700" fill="#F8F5EE" text-anchor="middle">T</text>
  <circle cx="69" cy="34" r="5.5" fill="#F2B705"/>
</svg>`;
}

const publicDir = path.join(__dirname, '..', 'public');

// Write every icon variant from the single source mark.
const targets = [
  ['tikem-mark.svg', 512],
  ['icon-192.svg', 192],
  ['icon-512.svg', 512],
  ['favicon.svg', 32],
  ['favicon-color.svg', 512],
  ['color.svg', 512],
];

for (const [file, size] of targets) {
  fs.writeFileSync(path.join(publicDir, file), generateSVGIcon(size));
  console.log(`✓ Wrote ${file}`);
}

// Point the PWA manifest at the scalable mark.
const manifestPath = path.join(publicDir, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
manifest.icons = [
  {
    src: '/tikem-mark.svg',
    sizes: 'any',
    type: 'image/svg+xml',
    purpose: 'any maskable',
  },
];
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log('✓ Updated manifest.json');

console.log('\n🎉 Tikèm icons generated.');
