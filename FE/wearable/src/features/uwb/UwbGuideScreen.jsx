import { StatusBadge } from '../../components/StatusBadge'
import { navigationStatusLabels, vibrationLabels } from './uwbLabels'

export function UwbGuideScreen({ session, actionMessage = '', isBusy, onStop }) {
  if (!session) {
    return (
      <section className="state-screen" aria-label="UWB 안내 없음">
        <p className="eyebrow">UWB</p>
        <h1>진행 중인 위치 안내가 없습니다.</h1>
        {actionMessage ? (
          <p className="live-message" role="status">
            {actionMessage}
          </p>
        ) : null}
      </section>
    )
  }

  const statusLabel = navigationStatusLabels[session.navigationStatus] || session.navigationStatus
  const vibrationLabel = vibrationLabels[session.vibrationPattern] || session.vibrationPattern
  const confidence = Math.round(session.confidence * 100)
  const canStop = session.navigationStatus === 'ACTIVE'

  return (
    <section className="uwb-screen" aria-labelledby="uwb-title">
      <div className="screen-topline">
        <StatusBadge tone={session.navigationStatus === 'CANCELED' ? 'default' : 'guide'}>
          {statusLabel}
        </StatusBadge>
        <span>신뢰도 {confidence}%</span>
      </div>

      <div className="uwb-main">
        <div>
          <p className="eyebrow">UWB 위치 안내</p>
          <h1 id="uwb-title">{session.targetDeviceName} 찾기</h1>
        </div>
        <strong>{session.distanceM}m</strong>
      </div>

      <p className="guide-copy">{session.voiceGuide}</p>
      {actionMessage ? (
        <p className="live-message" role="status">
          {actionMessage}
        </p>
      ) : null}

      <dl className="compact-meta">
        <div>
          <dt>진동</dt>
          <dd>{vibrationLabel}</dd>
        </div>
        <div>
          <dt>상태</dt>
          <dd>{statusLabel}</dd>
        </div>
      </dl>

      <button
      className="secondary-action stop-action"
      type="button"
      disabled={isBusy || !canStop}
      onClick={() => onStop(session.sessionId)}
    >
        탐색 종료
      </button>
    </section>
  )
}
