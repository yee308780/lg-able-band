import { useEffect, useMemo, useState } from 'react'
import { LivingSignalSettingsScreen } from '../features/living-signal'
import { getAppPreview, getHomeSummary } from '../services/homeService'
import { createEmergencyRequest } from '../services/emergencyService'
import { deleteGuardian, getGuardians, linkGuardianByEmail } from '../services/guardianService'
import { AlertsTab } from './AlertsTab'
import { DevicesTab } from './DevicesTab'
import { HomeTab } from './HomeTab'
import { VoiceChatbot } from './VoiceChatbot'

const statusLabels = {
  SAFE: '안전',
  CAUTION: '주의',
  DANGER: '위험',
  EMERGENCY: '긴급',
}

const tabs = [
  { id: 'home', label: '홈' },
  { id: 'alerts', label: '알림' },
  { id: 'devices', label: '기기' },
  { id: 'menu', label: '메뉴' },
]

const tabTitles = {
  home: 'Able Band 홈',
  alerts: '실시간 알림',
  devices: '기기와 UWB',
  menu: '메뉴',
}

const MAX_DEVICE_COUNT = 6

const connectionStatusLabels = {
  CONNECTED: '연결됨',
  PENDING: '대기 중',
  DISCONNECTED: '연결 해제',
}

export function HomeScreen({ session, onLogout }) {
  const [activeTab, setActiveTab] = useState('home')
  const [menuScreen, setMenuScreen] = useState('root')
  const [linkedGuardians, setLinkedGuardians] = useState([])
  const [guardianListState, setGuardianListState] = useState({
    loading: true,
    error: '',
  })
  const [emergencyMessage, setEmergencyMessage] = useState('')
  const [emergencySubmitting, setEmergencySubmitting] = useState(false)
  const [homeState, setHomeState] = useState({
    loading: true,
    error: '',
    summary: null,
    preview: null,
  })

  useEffect(() => {
    let isMounted = true

    async function loadHome() {
      try {
        const [summary, preview] = await Promise.all([getHomeSummary(), getAppPreview()])

        if (isMounted) {
          setHomeState({ loading: false, error: '', summary, preview })
        }
      } catch {
        if (isMounted) {
          setHomeState({
            loading: false,
            error: '홈 정보를 불러오지 못했습니다.',
            summary: null,
            preview: null,
          })
        }
      }
    }

    loadHome()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    async function loadGuardians() {
      setGuardianListState({ loading: true, error: '' })
      try {
        const guardians = await getGuardians()
        if (isMounted) {
          setLinkedGuardians(guardians.map(normalizeGuardianForView))
          setGuardianListState({ loading: false, error: '' })
        }
      } catch (error) {
        if (isMounted) {
          setGuardianListState({
            loading: false,
            error: error.message || '보호자 목록을 불러오지 못했습니다.',
          })
        }
      }
    }

    loadGuardians()

    return () => {
      isMounted = false
    }
  }, [])

  const currentTitle = useMemo(() => {
    if (activeTab === 'menu' && menuScreen === 'livingSignals') {
      return '생활 신호 설정'
    }

    if (activeTab === 'menu' && menuScreen === 'guardianConnection') {
      return '보호자 연결'
    }

    return tabTitles[activeTab]
  }, [activeTab, menuScreen])

  function handleTabChange(nextTab) {
    setActiveTab(nextTab)
    setEmergencyMessage('')

    if (nextTab !== 'menu') {
      setMenuScreen('root')
    }
  }

  async function handleEmergencyRequest() {
    if (emergencySubmitting) {
      return
    }

    setEmergencySubmitting(true)
    setEmergencyMessage('긴급 요청을 보내는 중입니다.')
    try {
      const request = await createEmergencyRequest()
      setEmergencyMessage(request.message || '보호자에게 긴급 요청을 보냈습니다.')
    } catch (error) {
      setEmergencyMessage(error.message || '긴급 요청을 보내지 못했습니다.')
    } finally {
      setEmergencySubmitting(false)
    }
  }

  async function handleLinkGuardian(form) {
    const guardian = normalizeGuardianForView(await linkGuardianByEmail(form))

    setLinkedGuardians((current) => upsertGuardian(current, guardian))

    return guardian
  }

  async function handleDeleteGuardian(guardianId) {
    await deleteGuardian(guardianId)
    setLinkedGuardians((current) => current.filter((item) => item.guardianId !== guardianId))
  }

  if (homeState.loading) {
    return (
      <main className="phone-screen home-screen app-screen home-loading-screen">
        <div className="home-loading-group" role="status">
          <img
            className="home-loading-logo"
            src="/LG_Able_Band_wordmark_transparent.png"
            alt="LG Able Band"
          />
          <p>홈 정보를 불러오는 중입니다.</p>
        </div>
      </main>
    )
  }

  if (homeState.error) {
    return (
      <main className="phone-screen home-screen app-screen">
        <p className="form-error" role="alert">
          {homeState.error}
        </p>
      </main>
    )
  }

  const { preview, summary } = homeState
  const statusLabel = statusLabels[summary.safetyStatus.level] || summary.safetyStatus.level
  const homeUserName = summary.user?.name || session.account.name
  const displayTitle = activeTab === 'home' ? `${homeUserName} 홈` : currentTitle
  const todayMessage = `${homeUserName}님, ${summary.safetyStatus.message}`

  return (
    <main className="phone-screen home-screen app-screen" aria-labelledby="home-title">
      <header className="home-header app-header">
        <div>
          <p className="eyebrow">LG Able Band</p>
          <h1 id="home-title">{displayTitle}</h1>
          {activeTab === 'home' ? <p className="header-summary">{todayMessage}</p> : null}
        </div>
        <button className="logout-button" type="button" onClick={onLogout}>
          로그아웃
        </button>
      </header>

      <div className="app-content">
        {activeTab === 'home' ? (
          <HomeTab
            emergencyMessage={emergencyMessage}
            emergencySubmitting={emergencySubmitting}
            statusLabel={statusLabel}
            summary={summary}
            onEmergencyRequest={handleEmergencyRequest}
            onOpenAlerts={() => handleTabChange('alerts')}
            onOpenDevices={() => handleTabChange('devices')}
          />
        ) : null}
        {activeTab === 'alerts' ? (
          <AlertsTab
            accessibilityType={session.userProfile?.accessibilityType || 'VISUAL'}
            alerts={preview.alerts}
          />
        ) : null}
        {activeTab === 'devices' ? (
          <DevicesTab
            devices={preview.devices}
            maxDeviceCount={MAX_DEVICE_COUNT}
            uwb={preview.uwb}
          />
        ) : null}
        {activeTab === 'menu' && menuScreen === 'root' ? (
          <MenuTab
            accessibility={preview.accessibility}
            guardians={linkedGuardians}
            livingSignals={preview.livingSignals}
            onOpenGuardianConnection={() => setMenuScreen('guardianConnection')}
            onOpenLivingSignals={() => setMenuScreen('livingSignals')}
            onLogout={onLogout}
            userName={session.account.name}
          />
        ) : null}
        {activeTab === 'menu' && menuScreen === 'livingSignals' ? (
          <LivingSignalSettingsScreen
            livingSignals={preview.livingSignals}
            onBack={() => setMenuScreen('root')}
          />
        ) : null}
        {activeTab === 'menu' && menuScreen === 'guardianConnection' ? (
          <GuardianConnectionScreen
            guardians={linkedGuardians}
            guardianListState={guardianListState}
            onBack={() => setMenuScreen('root')}
            onLinkGuardian={handleLinkGuardian}
            onRemoveGuardian={handleDeleteGuardian}
          />
        ) : null}
      </div>

      <nav className="bottom-tabs" aria-label="주요 메뉴">
        {tabs.map((tab) => (
          <button
            className={activeTab === tab.id ? 'tab-button active' : 'tab-button'}
            type="button"
            key={tab.id}
            aria-label={tab.label}
            aria-current={activeTab === tab.id ? 'page' : undefined}
            onClick={() => handleTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      <VoiceChatbot preview={preview} session={session} summary={summary} />
    </main>
  )
}

function MenuTab({
  accessibility,
  guardians,
  livingSignals,
  onOpenGuardianConnection,
  onOpenLivingSignals,
  onLogout,
  userName,
}) {
  const [guardianInviteMessage, setGuardianInviteMessage] = useState('')
  const guardianMembers = [
    {
      id: 'me',
      label: '나',
      name: userName,
      tone: 'self',
    },
    ...guardians.map((member) => ({
      id: `guardian-${member.guardianId || member.name}`,
      label: member.relation || '가족',
      name: member.name,
      tone: 'guardian',
      status: formatConnectionStatus(member.connectionStatus || member.status),
    })),
  ]

  return (
    <section className="tab-stack" aria-labelledby="menu-title">
      <div className="content-card hero-card">
        <p className="card-label">빠른 설정</p>
        <h2 id="menu-title">자주 바꾸는 설정만 모았어요.</h2>
        <p>{userName}님의 접근성, 보호자, 생활 신호 기능을 확인합니다.</p>
      </div>

      <section className="content-card">
        <div className="section-title-row">
          <h2>접근성 설정</h2>
          <span>{accessibility.textSize}</span>
        </div>
        <div className="settings-grid">
          <span>{accessibility.disabilityType}</span>
          <span>{accessibility.voiceGuide ? '음성 안내 ON' : '음성 안내 OFF'}</span>
          <span>{accessibility.vibrationGuide ? '진동 안내 ON' : '진동 안내 OFF'}</span>
          <span>{accessibility.highContrast ? '고대비 ON' : '고대비 OFF'}</span>
        </div>
      </section>

      <section className="soft-card home-member-card" aria-labelledby="home-member-title">
        <div className="home-member-header">
          <div>
            <p className="card-label">보호자 연결</p>
            <h2 id="home-member-title">홈 멤버</h2>
            <p>{guardianMembers.length}명</p>
          </div>
          <button
            className="member-more-button"
            type="button"
            aria-label="홈 멤버 관리"
            onClick={onOpenGuardianConnection}
          >
            ›
          </button>
        </div>

        <div className="home-member-list" aria-label="홈 멤버 목록">
          <button
            className="home-member-item invite"
            type="button"
            onClick={onOpenGuardianConnection}
          >
            <span className="member-avatar invite-avatar" aria-hidden="true">
              +
            </span>
            <span>멤버 초대</span>
          </button>

          {guardianMembers.map((member) => (
            <button
              className="home-member-item"
              type="button"
              key={member.id}
              onClick={() =>
                setGuardianInviteMessage(
                  member.status ? `${member.name} · ${member.status}` : `${member.name} 계정입니다.`,
                )
              }
            >
              <span className={`member-avatar avatar-${member.tone}`} aria-hidden="true">
                {member.name.slice(0, 1)}
                {member.id === 'me' ? <small>집</small> : null}
              </span>
              <span>{member.label}</span>
            </button>
          ))}
        </div>

        {guardianInviteMessage ? (
          <p className="member-status-message" role="status">
            {guardianInviteMessage}
          </p>
        ) : null}
      </section>

      <button className="soft-card settings-link-card" type="button" onClick={onOpenLivingSignals}>
        <p className="card-label">생활 신호 설정</p>
        <h2>등록된 생활 알림음을 관리해요.</h2>
        <p>
          현재 {livingSignals.summary.registeredSoundCount}개 신호, 샘플{' '}
          {livingSignals.summary.enrolledClipCount}개가 등록되어 있어요.
        </p>
      </button>

      <button className="secondary-button full-button" type="button" onClick={onLogout}>
        로그인으로 돌아가기
      </button>
    </section>
  )
}

function GuardianConnectionScreen({
  guardians,
  guardianListState,
  onBack,
  onLinkGuardian,
  onRemoveGuardian,
}) {
  const [form, setForm] = useState({
    email: '',
    isPrimary: guardians.length === 0,
    notifyOnDanger: true,
  })
  const [message, setMessage] = useState({ tone: '', text: '' })
  const [submitting, setSubmitting] = useState(false)
  const [deletingGuardianId, setDeletingGuardianId] = useState(null)

  useEffect(() => {
    if (guardians.length === 0) {
      setForm((current) => (current.isPrimary ? current : { ...current, isPrimary: true }))
    }
  }, [guardians.length])

  function handleChange(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
    setMessage({ tone: '', text: '' })
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const email = form.email.trim()

    if (!email) {
      setMessage({ tone: 'error', text: '보호자 계정 이메일을 입력해주세요.' })
      return
    }

    if (!isValidEmail(email)) {
      setMessage({ tone: 'error', text: '올바른 이메일 형식으로 입력해주세요.' })
      return
    }

    setSubmitting(true)
    try {
      const guardian = await onLinkGuardian({
        email,
        isPrimary: form.isPrimary,
        notifyOnDanger: form.notifyOnDanger,
      })
      setMessage({
        tone: 'success',
        text: `${guardian.name || '보호자'} 보호자와 연결했습니다.`,
      })
      setForm((current) => ({
        ...current,
        email: '',
        isPrimary: false,
      }))
    } catch (error) {
      setMessage({
        tone: 'error',
        text: error.message || '보호자 연결을 저장하지 못했습니다.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRemoveGuardian(guardian) {
    if (deletingGuardianId) {
      return
    }

    setDeletingGuardianId(guardian.guardianId)
    setMessage({ tone: '', text: '' })
    try {
      await onRemoveGuardian(guardian.guardianId)
      setMessage({
        tone: 'success',
        text: `${guardian.name} 보호자 연결을 해제했습니다.`,
      })
    } catch (error) {
      setMessage({
        tone: 'error',
        text: error.message || '보호자 연결을 해제하지 못했습니다.',
      })
    } finally {
      setDeletingGuardianId(null)
    }
  }

  return (
    <section className="tab-stack guardian-connection-screen" aria-labelledby="guardian-connection-title">
      <button className="text-link-button" type="button" onClick={onBack}>
        메뉴로 돌아가기
      </button>

      <form className="content-card guardian-form-card" onSubmit={handleSubmit}>
        <p className="card-label">보호자 연결</p>
        <h2 id="guardian-connection-title">긴급 알림을 받을 보호자를 등록해요.</h2>

        <label className="field">
          <span>보호자 이메일</span>
          <input
            type="email"
            value={form.email}
            onChange={(event) => handleChange('email', event.target.value)}
            placeholder="guardian@example.com"
            autoComplete="email"
          />
        </label>

        <div className="guardian-option-grid">
          <label className="guardian-option-card">
            <input
              type="checkbox"
              checked={form.isPrimary}
              onChange={(event) => handleChange('isPrimary', event.target.checked)}
            />
            <span>
              <strong>대표 보호자</strong>
              우선 연락
            </span>
          </label>
          <label className="guardian-option-card">
            <input
              type="checkbox"
              checked={form.notifyOnDanger}
              onChange={(event) => handleChange('notifyOnDanger', event.target.checked)}
            />
            <span>
              <strong>위험 알림</strong>
              자동 전달
            </span>
          </label>
        </div>

        {message.text ? (
          <p
            className={message.tone === 'error' ? 'member-status-message error' : 'member-status-message'}
            role={message.tone === 'error' ? 'alert' : 'status'}
          >
            {message.text}
          </p>
        ) : null}

        <button className="primary-button full-button" type="submit" disabled={submitting}>
          {submitting ? '연결 중...' : '보호자 등록'}
        </button>
      </form>

      <section className="content-card connected-guardian-card" aria-labelledby="connected-guardian-title">
        <div className="section-title-row">
          <h2 id="connected-guardian-title">연결된 보호자</h2>
          <span>{guardians.length}명</span>
        </div>

        {guardianListState.loading ? (
          <p className="empty-state" role="status">
            보호자 목록을 확인하는 중입니다.
          </p>
        ) : null}

        {guardianListState.error ? (
          <p className="member-status-message error" role="alert">
            {guardianListState.error}
          </p>
        ) : null}

        {guardians.length > 0 ? (
          <div className="connected-guardian-list">
            {guardians.map((guardian) => (
              <article className="connected-guardian-item" key={guardian.guardianId || guardian.name}>
                <p>{guardian.isPrimary ? '대표 보호자' : guardian.relation || '보호자'}</p>
                <strong>{guardian.name}</strong>
                <span>{guardian.phone || '연락처 미등록'}</span>
                <div>
                  <span className="guardian-chip">
                    {formatConnectionStatus(guardian.connectionStatus)}
                  </span>
                  {guardian.notifyOnDanger ? <span className="guardian-chip">긴급 알림 ON</span> : null}
                </div>
                <button
                  className="secondary-button full-button"
                  type="button"
                  disabled={deletingGuardianId === guardian.guardianId}
                  onClick={() => handleRemoveGuardian(guardian)}
                >
                  {deletingGuardianId === guardian.guardianId ? '해제 중...' : '연결 해제'}
                </button>
              </article>
            ))}
          </div>
        ) : (
          <p className="empty-state">아직 연결된 보호자가 없습니다.</p>
        )}
      </section>
    </section>
  )
}

function normalizeGuardianForView(guardian) {
  return {
    ...guardian,
    relation: guardian.relation || guardian.relationship || '가족',
    status: formatConnectionStatus(guardian.connectionStatus || guardian.status),
    connectionStatus: guardian.connectionStatus || guardian.status || 'CONNECTED',
  }
}

function upsertGuardian(currentGuardians, guardian) {
  const withoutSameGuardian = currentGuardians.filter((item) => item.guardianId !== guardian.guardianId)
  const nextGuardians = guardian.isPrimary
    ? withoutSameGuardian.map((item) => ({ ...item, isPrimary: false }))
    : withoutSameGuardian

  return [...nextGuardians, guardian]
}

function formatConnectionStatus(status) {
  return connectionStatusLabels[status] || status || '연결됨'
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}
