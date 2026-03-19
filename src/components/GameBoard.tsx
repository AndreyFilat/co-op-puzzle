import type { Board, Pos } from '../game/types'
import type { RecentAction, RoomPlayer } from '../room/types'
import { TileView } from './TileView'

type Props = {
  board: Board
  solutionPathKeys: ReadonlySet<string>
  debugShowSolution: boolean
  recentActions: ReadonlyArray<RecentAction>
  nowMs: number
  players: ReadonlyArray<RoomPlayer>
  onTileClick: (pos: Pos) => void
  onPingTile: (pos: Pos) => void
  winAnimation?:
    | Readonly<{
        active: boolean
        pathKeys: ReadonlyArray<string>
        pathIndexByKey: Readonly<Record<string, number>>
        wavePos: number
        generatorPulse: boolean
        reactorFlash: boolean
        generatorKey: string | null
        reactorKey: string | null
      }>
}

export function GameBoard({
  board,
  solutionPathKeys,
  debugShowSolution,
  recentActions,
  nowMs,
  players,
  onTileClick,
  onPingTile,
  winAnimation,
}: Props) {
  if (!board || board.length === 0) {
    return <div className="boardWrap">Board missing</div>
  }

  const size = board.length
  const reactorPowered = board.some((row) => row.some((t) => t.type === 'reactor' && t.powered))

  function recentMetaForTile(pos: Pos) {
    const cutoff = nowMs - 1800
    return recentActions
      .filter((a) => a.pos && a.pos.r === pos.r && a.pos.c === pos.c && a.atMs >= cutoff)
      .at(-1)
  }

  return (
    <div
      className="boardWrap"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
        paddingBottom: 12,
      }}
    >
      <div
        className="board"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${size}, var(--cell, 56px))`,
          gap: 6,
          justifyContent: 'center',
          padding: 10,
          borderRadius: 14,
          background: 'rgba(0,0,0,0.15)',
          border: '1px solid rgba(255,255,255,0.10)',
        }}
      >
        {board.map((row, r) =>
          row.map((tile, c) => (
            <TileView
              key={`${r}-${c}`}
              tile={tile}
              pos={{ r, c }}
              nowMs={nowMs}
              recentMeta={recentMetaForTile({ r, c })}
              inSolution={debugShowSolution && solutionPathKeys.has(`${r},${c}`)}
              reactorPowered={reactorPowered}
                players={players}
              onClick={onTileClick}
              onPing={onPingTile}
                winAnimation={winAnimation}
            />
          )),
        )}
      </div>
      <div className="boardHint">Route energy from the generator to the reactor.</div>
    </div>
  )
}

