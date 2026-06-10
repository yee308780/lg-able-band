import { QrCodeImage } from './QrCodeImage'

export function PairingQrScreen({ pairing, onPairComplete }) {
  if (!pairing) {
    return <p className="screen-message">연동 QR을 준비하는 중입니다.</p>
  }

  return (
    <section className="pairing-screen" aria-labelledby="pairing-title">
      <div className="pairing-copy">
        <p className="eyebrow">LG Able Band</p>
        <h1 id="pairing-title">휴대폰으로 연동</h1>
        <p>앱에서 QR을 스캔하면 바로 밴드가 연결됩니다.</p>
      </div>

      <div className="qr-panel">
        <QrCodeImage payload={pairing.pairingPayload} />
        <div className="pairing-meta">
          <strong>{pairing.pairingCode}</strong>
          <span>{pairing.deviceId}</span>
          <span>{pairing.expiresInMinutes}분 동안 유효</span>
        </div>
      </div>

      <button className="primary-action" type="button" onClick={onPairComplete}>
        휴대폰 연동 완료
      </button>
    </section>
  )
}
