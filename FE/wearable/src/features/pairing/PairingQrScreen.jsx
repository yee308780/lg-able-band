import { QrCodeImage } from './QrCodeImage'

export function PairingQrScreen({
  pairing,
  onPairComplete,
  onResetPairing,
  showManualComplete = false,
  status = 'waiting',
}) {
  if (status === 'success') {
    return (
      <section className="pairing-state-screen" aria-labelledby="pairing-success-title">
        <p className="pairing-state-icon" aria-hidden="true">
          OK
        </p>
        <p className="eyebrow">연동 상태</p>
        <h1 id="pairing-success-title">연동 완료</h1>
        <p>휴대폰과 연결되었습니다. 곧 알림 화면으로 전환됩니다.</p>
      </section>
    )
  }

  if (status === 'expired') {
    return (
      <section
        className="pairing-state-screen pairing-loading-screen pairing-expired-screen"
        aria-labelledby="pairing-expired-title"
      >
        <div className="pairing-loading-orbit pairing-expired-orbit" aria-hidden="true">
          <span className="pairing-loading-orbit-ring pairing-loading-orbit-ring-outer" />
          <span className="pairing-loading-orbit-ring pairing-loading-orbit-ring-middle" />
          <span className="pairing-loading-orbit-ring pairing-loading-orbit-ring-inner" />
          <span className="pairing-loading-orbit-core pairing-expired-orbit-core">!</span>
        </div>
        <h1 id="pairing-expired-title">QR 다시 발급 필요</h1>
        <p>유효 시간이 지나 현재 화면에서는 QR을 사용할 수 없습니다.</p>
        <button className="primary-action" type="button" onClick={onResetPairing}>
          새 QR 발급
        </button>
      </section>
    )
  }

  if (status === 'invalid') {
    return (
      <section className="pairing-state-screen" aria-labelledby="pairing-invalid-title">
        <p className="pairing-state-icon warning" aria-hidden="true">
          !
        </p>
        <p className="eyebrow">연동 상태</p>
        <h1 id="pairing-invalid-title">연동 정보 오류</h1>
        <p>현재 화면의 연동 정보가 올바르지 않습니다.</p>
        <button className="secondary-action" type="button" onClick={onResetPairing}>
          QR 다시 보기
        </button>
      </section>
    )
  }

  if (!pairing) {
    return (
      <section className="pairing-state-screen pairing-loading-screen" aria-label="연동 QR 준비 중">
        <div className="pairing-loading-hero" role="status" aria-live="polite">
          <img
            className="wearable-brand-logo pairing-loading-logo"
            src="/LG_Able_Band_wordmark_transparent.png"
            alt="LG Able Band"
          />
          <div className="pairing-loading-orbit" aria-hidden="true">
            <span className="pairing-loading-orbit-ring pairing-loading-orbit-ring-outer" />
            <span className="pairing-loading-orbit-ring pairing-loading-orbit-ring-middle" />
            <span className="pairing-loading-orbit-ring pairing-loading-orbit-ring-inner" />
            <span className="pairing-loading-orbit-core" />
          </div>
          <div className="pairing-loading-copy">
            <strong>연동 QR 준비 중</strong>
            <p>휴대폰에서 바로 스캔할 수 있도록 보안 정보를 생성하고 있습니다.</p>
          </div>
          <div className="pairing-loading-progress" aria-hidden="true">
            <span className="pairing-loading-progress-bar" />
          </div>
          <div className="pairing-loading-footer" aria-hidden="true">
            <span className="pairing-loading-dot" />
            <span className="pairing-loading-dot" />
            <span className="pairing-loading-dot" />
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="pairing-screen" aria-labelledby="pairing-title">
      <div className="pairing-copy">
        <img className="wearable-brand-logo" src="/LG_Able_Band_wordmark_transparent.png" alt="LG Able Band" />
        <h1 id="pairing-title">앱과 연동</h1>
        <p>앱에서 QR을 스캔하면 바로 밴드가 연결됩니다.</p>
        <span className="pairing-status" role="status">
          스캔 대기 중
        </span>
      </div>

      <div className="qr-panel">
        <QrCodeImage payload={pairing.pairingPayload} />
        <div className="pairing-meta">
          <strong>{pairing.pairingCode}</strong>
          <span>{pairing.deviceId}</span>
          <span>{pairing.expiresInMinutes}분 동안 유효</span>
        </div>
      </div>

      {showManualComplete ? (
        <button className="primary-action" type="button" onClick={onPairComplete}>
          휴대폰 연동 완료
        </button>
      ) : null}
    </section>
  )
}
