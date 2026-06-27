'use client'

import { QRCodeSVG } from 'qrcode.react'

interface QRCodeDisplayProps {
  value: string
  size?: number
}

export default function QRCodeDisplay({ value, size = 256 }: QRCodeDisplayProps) {
  return (
    <div id="ticket-qr-code" className="w-full max-w-[280px] mx-auto">
      <QRCodeSVG
        value={value}
        size={size}
        level="H"
        includeMargin={true}
        className="w-full h-auto"
      />
    </div>
  )
}
