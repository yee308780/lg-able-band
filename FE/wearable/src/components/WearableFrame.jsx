export function WearableFrame({ children, screenClassName = '' }) {
  return (
    <section className="wearable-shell" aria-label="wearable screen">
      <div className={screenClassName ? `wearable-screen ${screenClassName}` : 'wearable-screen'}>
        {children}
      </div>
    </section>
  )
}
