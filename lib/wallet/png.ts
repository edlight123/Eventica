/**
 * A tiny, dependency-free PNG writer.
 *
 * Apple refuses to open a `.pkpass` that has no `icon.png`, so the pass builder
 * always needs *some* icon bytes. The repo ships only SVG marks (public/*.svg)
 * and `public/` is not reliably readable from a serverless function at runtime,
 * so rather than committing a binary or adding an image library we synthesize a
 * solid-colour square here. The owner can replace it at any time by setting
 * APPLE_PASS_ICON_PNG_BASE64 / APPLE_PASS_LOGO_PNG_BASE64 (see lib/wallet/config.ts).
 *
 * Only what a solid square needs is implemented: 8-bit truecolour, one IDAT.
 */

import zlib from 'node:zlib'

/** Standard PNG/zlib CRC-32 table. */
const CRC_TABLE: number[] = (() => {
  const table: number[] = []
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[n] = c >>> 0
  }
  return table
})()

function crc32(buf: Buffer): number {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  }
  return (c ^ 0xffffffff) >>> 0
}

/** `<length><type><data><crc>` — the PNG chunk envelope. */
function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(typeAndData), 0)
  return Buffer.concat([length, typeAndData, crc])
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

/**
 * A `size` x `size` PNG filled with one RGB colour.
 * Used as the fallback pass icon/logo so a generated pass is always openable.
 */
export function solidPng(size: number, rgb: [number, number, number]): Buffer {
  const [r, g, b] = rgb
  const bytesPerRow = 1 /* filter byte */ + size * 3
  const raw = Buffer.alloc(bytesPerRow * size)
  for (let y = 0; y < size; y++) {
    const rowStart = y * bytesPerRow
    raw[rowStart] = 0 // filter type 0 (None)
    for (let x = 0; x < size; x++) {
      const p = rowStart + 1 + x * 3
      raw[p] = r
      raw[p + 1] = g
      raw[p + 2] = b
    }
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // colour type: truecolour (RGB)
  ihdr[10] = 0 // deflate
  ihdr[11] = 0 // adaptive filtering
  ihdr[12] = 0 // no interlace

  return Buffer.concat([
    PNG_SIGNATURE,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}
