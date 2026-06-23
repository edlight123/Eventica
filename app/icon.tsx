/* eslint-disable @next/next/no-img-element */

import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

// Teal "T" on a white tile — matches the static marks in /public.
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#FFFFFF',
          color: '#0F766E',
          borderRadius: 7,
          fontSize: 26,
          fontWeight: 700,
          fontFamily: 'Georgia, "Times New Roman", serif',
        }}
      >
        T
      </div>
    ),
    {
      ...size,
    }
  )
}
