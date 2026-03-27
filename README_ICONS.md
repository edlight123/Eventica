# App Icon Setup for Eventica

## Overview
This guide explains how to use your `favicon-color.svg` as the app icon for mobile devices (PWA - Progressive Web App).

## Current Setup

The app is now configured to use `favicon-color.svg` as the primary app icon. The configuration has been updated in:

1. **`public/manifest.json`** - PWA manifest for Android/Chrome
2. **`app/layout.tsx`** - Next.js metadata for iOS/Safari and general favicon

## Required Icon Files

For full mobile support, you need PNG versions of your SVG in these sizes:

- `icon-192.png` - 192×192px (Android small icon)
- `icon-512.png` - 512×512px (Android large icon / splash screen)
- `apple-touch-icon.png` - 180×180px (iOS home screen icon)
- `favicon.png` - 32×32px (browser tab icon, optional)

## How to Generate Icons

### Option 1: Automated Script (Recommended)

**Ensure `public/favicon-color.svg` contains your desired icon**

Then run:
```bash
./scripts/generate-icons.sh
```

This script will automatically generate all required PNG files from your SVG.

**Prerequisites:**
- ImageMagick: `sudo apt-get install imagemagick`
- OR rsvg-convert: `sudo apt-get install librsvg2-bin`

### Option 2: Manual Creation

If you prefer to create icons manually:

1. Open your SVG in a design tool (Figma, Adobe Illustrator, Inkscape, etc.)
2. Export as PNG at the following sizes:
   - 192×192px → save as `public/icon-192.png`
   - 512×512px → save as `public/icon-512.png`
   - 180×180px → save as `public/apple-touch-icon.png`

### Option 3: Online Tool

Use a free online PWA icon generator:
- https://realfavicongenerator.net/
- https://www.pwabuilder.com/imageGenerator

Upload your SVG and download the generated icons to the `public/` folder.

## Current Status

Ensure your icon is:

1. **A square SVG (1:1 aspect ratio)**
2. **Simple and high-contrast** (works at small sizes)
3. **Tested on mobile:**
   - Android: Open site in Chrome → Add to Home Screen
   - iOS: Open site in Safari → Share → Add to Home Screen

## Icon Design Best Practices

- ✅ Use a square canvas (1:1 aspect ratio)
- ✅ Keep design simple and recognizable at small sizes
- ✅ Use high contrast colors
- ✅ Avoid fine details or small text
- ✅ Include padding (safe area ~10% on each side)
- ✅ Test on both light and dark backgrounds

## Verification

After generating icons, verify they work:

1. **Local testing:**
   ```bash
   npm run dev
   ```
   - Check browser tab icon (favicon)
   - Open DevTools → Application → Manifest (should show all icons)

2. **Mobile testing:**
   - Deploy to production
   - Add to home screen on Android/iOS
   - Verify icon appears correctly

## Files Modified

- ✅ `public/manifest.json` - Updated PWA icon references
- ✅ `app/layout.tsx` - Updated Next.js metadata icons
- ✅ `scripts/generate-icons.sh` - Created automation script

## Next Steps

1. **Update** `public/favicon-color.svg` with your final icon
2. **Run icon generation script** or create icons manually
3. **Commit and deploy** the changes
4. **Test on mobile devices** by adding to home screen

---

**Need help?** The SVG should contain your Eventica logo/icon design. If you need to create one from scratch, consider using:
- Figma (free online)
- Inkscape (free desktop app)
- Adobe Illustrator (paid)
