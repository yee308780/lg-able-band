import QRCode from 'qrcode'

const QR_OPTIONS = {
  errorCorrectionLevel: 'M',
  margin: 4,
  width: 1024,
  color: {
    dark: '#111111',
    light: '#ffffff',
  },
}

export async function createQrImageSrc(payload) {
  if (!payload) {
    return ''
  }

  return QRCode.toDataURL(payload, QR_OPTIONS)
}
