import qrcode from 'qrcode-generator'

export function QrCodeImage({ payload }) {
  const qr = qrcode(0, 'M')
  qr.addData(payload)
  qr.make()

  return (
    <img
      className="qr-code"
      src={qr.createDataURL(4, 1)}
      alt="Able Band 연동 QR 코드"
      data-pairing-payload={payload}
    />
  )
}
