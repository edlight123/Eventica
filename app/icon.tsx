/* eslint-disable @next/next/no-img-element */

import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

// PNG fallback (browsers without SVG-favicon support): the brand-default dark
// tile with a heavy paper "t" and a teal accent dot — matches /public marks.
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0A0A0A',
          color: '#F6F3EA',
          fontSize: 30,
          fontWeight: 700,
          fontStyle: 'italic',
          fontFamily: 'Georgia, "Times New Roman", serif',
        }}
      >
        t
        <div
          style={{
            position: 'absolute',
            top: 6,
            right: 7,
            width: 6,
            height: 6,
            borderRadius: 6,
            background: '#2DD4BF',
          }}
        />
      </div>
    ),
    {
      ...size,
    }
  )
}
