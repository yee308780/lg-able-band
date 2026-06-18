import { useEffect, useMemo, useState } from 'react'
import { getGuardianDashboard } from '../services/guardianDashboardService'

const severityLabels = {
  CRITICAL: '긴급',
  HIGH: '위험',
  MEDIUM: '주의',
  LOW: '생활',
}

const statusLabels = {
  UNREAD: '미확인',
  CONFIRMED: '확인 완료',
  REPLAYED: '다시 듣기',
  ESCALATED: '보호자 전달',
  RESOLVED: '해결됨',
  CANCELED: '취소됨',
}

const accessibilityLabels = {
  VISUAL: '시각 지원',
  HEARING: '청각 지원',
}

const sourceLabels = {
  APP: '앱',
  WEARABLE: '웨어러블',
  DEVICE: '기기',
}

const DASHBOARD_POLL_INTERVAL_MS = 3000

export function GuardianPlaceholder({ account, onLogout }) {
  const [dashboardState, setDashboardState] = useState({
    loading: true,
    error: '',
    data: null,
    refreshing: false,
    lastUpdatedAt: null,
  })
  const [actionMessage, setActionMessage] = useState('')
  const [activeActionPanel, setActiveActionPanel] = useState('')

  useEffect(() => {
    let isMounted = true
    let pollTimer = null

    async function loadDashboard({ silent = false } = {}) {
      if (silent) {
        setDashboardState((current) => ({
          ...current,
          refreshing: Boolean(current.data),
        }))
      }

      try {
        const data = await getGuardianDashboard()
        if (isMounted) {
          setDashboardState({
            loading: false,
            error: '',
            data,
            refreshing: false,
            lastUpdatedAt: new Date().toISOString(),
          })
        }
      } catch (error) {
        if (isMounted) {
          setDashboardState((current) => ({
            loading: false,
            error: current.data
              ? '최신 보호자 정보를 다시 확인하지 못했습니다.'
              : error.message || '보호자 정보를 불러오지 못했습니다.',
            data: current.data,
            refreshing: false,
            lastUpdatedAt: current.lastUpdatedAt,
          }))
        }
      }
    }

    loadDashboard()
    pollTimer = window.setInterval(() => loadDashboard({ silent: true }), getDashboardPollIntervalMs())

    return () => {
      isMounted = false
      window.clearInterval(pollTimer)
    }
  }, [])

  const dashboard = dashboardState.data
  const latestDangerAlert = dashboard?.dangerAlerts?.[0] || null
  const latestEmergency = dashboard?.emergencyRequests?.[0] || null
  const safetyTone = dashboard?.summary?.activeEmergency ? 'danger' : 'safe'
  const protectedUserName = dashboard?.user?.name || '사용자'
  const contactMessage = useMemo(() => `${protectedUserName}님에게 연락합니다.`, [protectedUserName])

  if (dashboardState.loading) {
    return (
      <main className="phone-screen home-screen guardian-screen app-screen home-loading-screen guardian-loading-screen">
        <div className="home-loading-group" role="status">
          <img
            className="home-loading-logo"
            src="/LG_Able_Band_wordmark_transparent.png"
            alt="LG Able Band"
          />
          <p className="home-loading-message">
            보호자 홈화면으로 이동하는 중입니다
            <span className="home-loading-dots" aria-hidden="true">
              <span>.</span>
              <span>.</span>
              <span>.</span>
            </span>
          </p>
        </div>
      </main>
    )
  }

  if (dashboardState.error && !dashboardState.data) {
    return (
      <main className="phone-screen home-screen guardian-screen app-screen home-loading-screen guardian-loading-screen">
        <div className="home-loading-group guardian-error-group" role="alert">
          <img
            className="home-loading-logo"
            src="/LG_Able_Band_wordmark_transparent.png"
            alt="LG Able Band"
          />
          <p className="home-loading-message guardian-loading-error">{dashboardState.error}</p>
          <button className="summary-action-button guardian-loading-action" type="button" onClick={onLogout}>
            로그인으로 돌아가기
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="phone-screen home-screen guardian-screen app-screen" aria-labelledby="guardian-title">
      <header className="home-header app-header">
        <div>
          <span className="home-brand-logo-frame" aria-hidden="true">
            <img
              className="home-brand-logo"
              src="/LG_Able_Band_wordmark_transparent.png"
              alt="LG Able Band"
            />
          </span>
          <h1 id="guardian-title">보호자 홈</h1>
          <p className="header-summary">{protectedUserName}님의 현재 상태와 최근 위험 알림을 확인해요.</p>
        </div>
      </header>

      <div className="app-content guardian-content">
        <section className={`status-card home-safety-card guardian-home-status-card status-${safetyTone}`}>
          <div className="status-card-header">
            <div>
              <p className="card-label">오늘의 안전 상태</p>
              <strong className="card-title">{dashboard.summary?.safetyMessage || '상태를 확인하는 중입니다.'}</strong>
            </div>
            <span className="status-badge">{dashboardState.refreshing ? '업데이트 중' : '실시간'}</span>
          </div>
          <p className="status-copy">
            {protectedUserName} · {formatAccessibilityType(dashboard.user?.accessibilityType)}
          </p>
          <div className="home-metric-row" aria-label="보호자 알림 요약">
            <span className="home-metric-pill">위험 알림 {dashboard.summary?.unreadDangerAlertCount ?? 0}건</span>
            <span className="home-metric-pill">긴급 요청 {dashboard.summary?.emergencyRequestCount ?? 0}건</span>
            <span className="home-metric-pill danger">{formatGuardianTime(dashboardState.lastUpdatedAt)}</span>
          </div>
          {dashboardState.error ? (
            <p className="guardian-refresh-note error" role="alert">
              {dashboardState.error}
            </p>
          ) : null}
        </section>

        <section className="emergency-card guardian-home-emergency-card" aria-labelledby="guardian-emergency-title">
          <div>
            <p className="card-label">빠른 보호자 대응</p>
            <strong className="card-title" id="guardian-emergency-title">
              {latestEmergency ? latestEmergency.message : '현재 긴급 지원 요청은 없습니다.'}
            </strong>
            <p className="emergency-card-copy guardian-home-copy">
              {latestEmergency
                ? `${formatGuardianTime(latestEmergency.sentAt)} · ${formatSource(latestEmergency.source)}`
                : '사용자가 도움을 요청하면 이 화면에서 바로 대응할 수 있어요.'}
            </p>
          </div>
          <button
            className="sos-button guardian-home-action-button"
            type="button"
            onClick={() => {
              setActiveActionPanel('contact')
              setActionMessage('')
            }}
          >
            사용자에게 연락
          </button>
          {actionMessage ? (
            <p className="guardian-action-message" role="status">
              {actionMessage}
            </p>
          ) : null}
        </section>

        {activeActionPanel === 'contact' ? (
          <section className="content-card guardian-home-action-card" aria-labelledby="guardian-contact-title">
            <div className="section-title-row">
              <div>
                <p className="card-label">연락 지원</p>
                <strong className="card-title" id="guardian-contact-title">
                  {contactMessage}
                </strong>
              </div>
              <button className="summary-action-button" type="button" onClick={() => setActiveActionPanel('')}>
                닫기
              </button>
            </div>
            <p className="guardian-home-copy">
              먼저 전화로 상태를 확인하고, 필요하면 문자나 추가 지원 요청을 이어서 진행해 주세요.
            </p>
            <div className="guardian-home-contact-grid">
              <button
                className="primary-button compact-button"
                type="button"
                onClick={() => setActionMessage(`${protectedUserName}님에게 전화를 연결합니다.`)}
              >
                전화 연결
              </button>
              <button
                className="secondary-button compact-button"
                type="button"
                onClick={() => setActionMessage(`${protectedUserName}님에게 확인 문자를 전송했습니다.`)}
              >
                확인 문자
              </button>
            </div>
            <div className="guardian-home-script-box">
              <p className="card-label">권장 안내</p>
              <strong className="card-title">지금 바로 상태를 확인해 주세요.</strong>
              <p className="guardian-home-copy">
                응답이 어려우면 웨어러블 진동이나 최근 알림 내용을 함께 확인해 보는 것이 좋습니다.
              </p>
            </div>
          </section>
        ) : null}

        <section className="content-card alert-summary-card guardian-home-alert-card" aria-labelledby="guardian-alert-title">
          <div className="section-title-row">
            <div>
              <p className="card-label">위험 알림</p>
              <strong className="card-title" id="guardian-alert-title">
                {latestDangerAlert ? latestDangerAlert.title : '최근 위험 알림이 없습니다.'}
              </strong>
            </div>
            {latestDangerAlert ? (
              <span className={`severity severity-${latestDangerAlert.severity.toLowerCase()}`}>
                {severityLabels[latestDangerAlert.severity] || latestDangerAlert.severity}
              </span>
            ) : null}
          </div>
          {latestDangerAlert ? (
            <>
              <p className="guardian-home-copy">{latestDangerAlert.message}</p>
              <dl className="guardian-detail-grid guardian-home-detail-grid">
                <div>
                  <dt>발생 위치</dt>
                  <dd>{latestDangerAlert.locationName || '미등록'}</dd>
                </div>
                <div>
                  <dt>발생 기기</dt>
                  <dd>{latestDangerAlert.deviceName || '연동 기기'}</dd>
                </div>
                <div>
                  <dt>발생 시간</dt>
                  <dd>{formatGuardianTime(latestDangerAlert.occurredAt)}</dd>
                </div>
                <div>
                  <dt>확인 상태</dt>
                  <dd>{statusLabels[latestDangerAlert.status] || latestDangerAlert.status}</dd>
                </div>
              </dl>
            </>
          ) : (
            <p className="empty-state">새로운 위험 알림이 들어오면 이 카드에서 바로 확인할 수 있습니다.</p>
          )}
        </section>

        <section className="content-card device-summary-card guardian-home-history-card" aria-labelledby="guardian-history-title">
          <div className="section-title-row">
            <div>
              <p className="card-label">최근 전달 이력</p>
              <strong className="card-title" id="guardian-history-title">
                최근 위험 알림
              </strong>
            </div>
            <span>{dashboard.dangerAlerts?.length ?? 0}건</span>
          </div>
          <div className="guardian-event-list">
            {(dashboard.dangerAlerts || []).length > 0 ? (
              dashboard.dangerAlerts.map((alert) => (
                <article className="guardian-event-item" key={alert.alertId}>
                  <strong>{alert.title}</strong>
                  <span>
                    {severityLabels[alert.severity] || alert.severity} · {formatGuardianTime(alert.occurredAt)}
                  </span>
                </article>
              ))
            ) : (
              <p className="empty-state">최근 전달된 알림이 없습니다.</p>
            )}
          </div>
        </section>

        <section className="content-card guardian-home-session-card" aria-labelledby="guardian-session-title">
          <div className="section-title-row">
            <div>
              <p className="card-label">계정</p>
              <strong className="card-title" id="guardian-session-title">
                {account.name} 보호자 계정
              </strong>
            </div>
            <button className="summary-action-button" type="button" onClick={onLogout}>
              로그아웃
            </button>
          </div>
        </section>
      </div>
    </main>
  )
}

function getDashboardPollIntervalMs() {
  return (
    parsePositiveIntervalMs(window.__ABLE_BAND_GUARDIAN_DASHBOARD_POLL_MS__) ??
    parsePositiveIntervalMs(import.meta.env.VITE_GUARDIAN_DASHBOARD_POLL_MS) ??
    DASHBOARD_POLL_INTERVAL_MS
  )
}

function parsePositiveIntervalMs(value) {
  const intervalMs = Number(value)
  return Number.isFinite(intervalMs) && intervalMs > 0 ? intervalMs : null
}

function formatGuardianTime(value) {
  if (!value) {
    return '방금 전'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '시간 확인 필요'
  }

  return date.toLocaleString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatAccessibilityType(value) {
  return accessibilityLabels[value] || value || '지원 정보 없음'
}

function formatSource(value) {
  return sourceLabels[value] || value || '시스템'
}
