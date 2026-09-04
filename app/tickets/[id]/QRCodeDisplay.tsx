'use client'

import { QRCodeSVG } from 'qrcode.react'

interface QRCodeDisplayProps {
  value: string
  size?: number
  /** DOM id of the container. Must be unique when several QRs render on one
   *  page (e.g. multiple active tickets) so PDF/Wallet capture targets the
   *  right one. Defaults to the legacy id for the single-ticket page. */
  id?: string
  /** Container classes. The SVG is `w-full h-auto`, so THIS is what decides how
   *  large the QR actually renders — `size` only sets the intrinsic viewBox.
   *  Override it to let the code run wider than the 280px default (a door
   *  scanner in bad light wants every pixel it can get). */
  className?: string
}

export default function QRCodeDisplay({
  value,
  size = 256,
  id = 'ticket-qr-code',
  className = 'w-full max-w-[280px] mx-auto',
}: QRCodeDisplayProps) {
  return (
    <div id={id} className={className}>
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
