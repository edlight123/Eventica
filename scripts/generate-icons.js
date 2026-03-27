#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Generate SVG icons with Eventica branding
function generateSVGIcon(size) {
  const fontSize = size * 0.55;
  const rx = size * 0.225; // 22.5% border radius for modern look
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad${size}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0F766E;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#14B8A6;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${rx}" fill="url(#grad${size})"/>
  <text x="${size/2}" y="${size/2 + fontSize/3}" font-family="system-ui, -apple-system, sans-serif" font-size="${fontSize}" font-weight="700" fill="white" text-anchor="middle">EH</text>
</svg>`;
}

// Generate icons
const publicDir = path.join(__dirname, '..', 'public');

// Create 192x192 icon
const icon192 = generateSVGIcon(192);
fs.writeFileSync(path.join(publicDir, 'icon-192.svg'), icon192);
console.log('✓ Created icon-192.svg');

// Create 512x512 icon
const icon512 = generateSVGIcon(512);
fs.writeFileSync(path.join(publicDir, 'icon-512.svg'), icon512);
console.log('✓ Created icon-512.svg');

// Create favicon
const favicon = generateSVGIcon(32);
fs.writeFileSync(path.join(publicDir, 'favicon.svg'), favicon);
console.log('✓ Created favicon.svg');

// Update manifest.json to use SVG icons (better quality, smaller size)
const manifestPath = path.join(publicDir, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

manifest.icons = [
  {
    src: '/icon-192.svg',
    sizes: '192x192',
    type: 'image/svg+xml',
    purpose: 'any maskable'
  },
  {
    src: '/icon-512.svg',
    sizes: '512x512',
    type: 'image/svg+xml',
    purpose: 'any maskable'
  }
];

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log('✓ Updated manifest.json with SVG icons');

console.log('\n🎉 PWA icons generated successfully!');
console.log('Note: SVG icons provide perfect quality at any size and are smaller than PNGs.');
