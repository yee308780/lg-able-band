export function WearableFrame({ children }) {
  return (
    <section className="wearable-shell" aria-label="4인치 웨어러블 화면">
      <div className="wearable-screen">{children}</div>
    </section>
  )
}
