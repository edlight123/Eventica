'use client'

import { QRCodeSVG } from 'qrcode.react'

interface QRCodeDisplayProps {
  value: string
  size?: number
  /** DOM id of the container. Must be unique when several QRs render on one
   *  page (e.g. multiple active tickets) so PDF/Wallet capture targets the
   *  right one. Defaults to the legacy id for the single-ticket page. */
  id?: string
}

export default function QRCodeDisplay({ value, size = 256, id = 'ticket-qr-code' }: QRCodeDisplayProps) {
  return (
    <div id={id} className="w-full max-w-[280px] mx-auto">
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
