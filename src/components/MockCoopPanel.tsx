import { PLAYER_ACTION_COOLDOWN_MS } from '../room/roomReducer'

type Props = {
  players: ReadonlyArray<{ id: string; name: string; color: string; lastActionAtMs?: number }>
  recent: ReadonlyArray<{ id: string; text: string }>
  currentPlayerId: string | null
  nowMs: number
}

export function MockCoopPanel({ players, recent, currentPlayerId, nowMs }: Props) {
  const sortedPlayers = [...players].sort((a, b) => {
    if (a.id === currentPlayerId && b.id !== currentPlayerId) return -1
    if (b.id === currentPlayerId && a.id !== currentPlayerId) return 1
    return 0
  })

  function displayPlayerName(name: string): string {
    const m = name.match(/^Player\s+(\d+)/)
    if (m) return `Player ${m[1]}`
    if (name.length <= 14) return name
    return name.slice(0, 10) + '…'
  }

  const recentItems = recent.slice(0, 5)

  return (
    <aside className="coop">
      <div className="coopHeader">
        <div className="coopTitle">Players</div>
        <div className="coopSub">{players.length} connected</div>
      </div>

      <div className="coopPlayers">
        {sortedPlayers.map((p) => {
          const isYou = p.id === currentPlayerId
          return (
            <div key={p.id} className={`player${isYou ? ' playerMe' : ''}`}>
              <div className="avatar" aria-hidden="true" style={{ background: p.color }} />
              <div className="playerText">
                <div className="playerName">
                  {displayPlayerName(p.name)}
                  {isYou && <span className="playerYou"> (You)</span>}
                </div>
                {(() => {
                  const last = p.lastActionAtMs
                  const remainingMs = last == null ? 0 : Math.max(0, PLAYER_ACTION_COOLDOWN_MS - (nowMs - last))
                  const status = remainingMs > 0 ? `${(remainingMs / 1000).toFixed(1)}s` : 'Ready'
                  return (
                    <>
                      <div className="playerStatus">{status}</div>
                    </>
                  )
                })()}
              </div>
            </div>
          )
        })}
      </div>

      <div className="coopFeed">
        <div className="coopFeedTitle">Recent</div>
        <div className="feedList">
          {recentItems.map((item) => (
            <div key={item.id} className="feedItem" style={{ padding: '6px 8px' }}>
              {item.text}
            </div>
          ))}
        </div>
      </div>
    </aside>
  )
}

