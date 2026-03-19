type HudProps = {
  levelName: string
  errorMessage?: string
  timeText: string
  onRestart: () => void
  onNext: () => void
  hideControls?: boolean
}

export function Hud({
  levelName,
  errorMessage,
  timeText,
  onRestart,
  onNext,
  hideControls,
}: HudProps) {
  return (
    <header className="hud">
      <div className="hud__meta">
        <h1 className="hud__title">{levelName}</h1>
        {errorMessage ? <div className="hud__error">{errorMessage}</div> : null}
        <div className="hud__time">
          <span>Time</span>
          <strong>{timeText}</strong>
        </div>
      </div>

      {/* Keep actions container in layout to avoid board vertical shift. */}
      <div
        className="hud__actions"
        style={{
          visibility: hideControls ? 'hidden' : 'visible',
          pointerEvents: hideControls ? 'none' : 'auto',
        }}
      >
        <button type="button" className="button" onClick={onRestart}>
          Restart
        </button>
        <button type="button" className="button button--primary" onClick={onNext}>
          Next level
        </button>
      </div>
    </header>
  )
}
