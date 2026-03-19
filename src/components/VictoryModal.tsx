type Props = {
  open: boolean
  moves: number
  timeText: string
  onRestart: () => void
  onNext: () => void
}

export function VictoryModal({ open, moves, timeText, onRestart, onNext }: Props) {
  if (!open) return null
  return (
    <div className="modalOverlay">
      <div className="modal">
        <div className="modalHeader">
          <h2 className="modalTitle">Reactor online!</h2>
          <div className="modalStats">
            <div className="statRow">
              <span className="statLabel">Moves</span>
              <strong className="statValue">{moves}</strong>
            </div>
            <div className="statRow">
              <span className="statLabel">Time</span>
              <strong className="statValue">{timeText}</strong>
            </div>
          </div>
        </div>

        <div className="modalButtons">
          <button type="button" className="btn" onClick={onRestart}>
            Restart
          </button>
          <button type="button" className="btn primary" onClick={onNext}>
            Next level
          </button>
        </div>
      </div>
    </div>
  )
}

