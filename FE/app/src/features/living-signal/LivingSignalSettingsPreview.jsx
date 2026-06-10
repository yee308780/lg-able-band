import { LivingSignalSettingsScreen } from './LivingSignalSettingsScreen'
import { livingSignalMock } from './livingSignalMock'
import './livingSignal.css'

export function LivingSignalSettingsPreview() {
  return (
    <main className="living-signal-preview-shell">
      <div className="living-signal-preview-frame">
        <LivingSignalSettingsScreen
          livingSignals={livingSignalMock}
          onBack={() => {}}
        />
      </div>
    </main>
  )
}
