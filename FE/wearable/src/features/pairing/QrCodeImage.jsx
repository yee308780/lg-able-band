import { useEffect, useState } from 'react'
import { createQrImageSrc } from './qrEncoder'

export function QrCodeImage({ payload }) {
  const [src, setSrc] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadQrImage() {
      try {
        const nextSrc = await createQrImageSrc(payload || '')
        if (!cancelled) {
          setSrc(nextSrc)
        }
      } catch {
        if (!cancelled) {
          setSrc('')
        }
      }
    }

    loadQrImage()

    return () => {
      cancelled = true
    }
  }, [payload])

  return (
    <img
      className="qr-code"
      src={src}
      alt="Able Band pairing QR code"
      data-pairing-payload={payload}
      draggable="false"
    />
  )
}
