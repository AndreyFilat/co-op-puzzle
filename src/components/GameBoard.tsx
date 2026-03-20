import type { Board, Pos } from '../game/types'
import type { RecentAction, RoomPlayer } from '../room/types'
import { TileView } from './TileView'
import { useEffect, useMemo, useRef, useState } from 'react'

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

  const wrapRef = useRef<HTMLDivElement | null>(null)
  const hintRef = useRef<HTMLDivElement | null>(null)

  const gapPx = 4
  const paddingPx = 6
  const verticalGapBetweenGridAndHintPx = 10
  const outerOverheadPx = 2 * paddingPx + (size - 1) * gapPx

  const [available, setAvailable] = useState<{ w: number; h: number; hintH: number }>({ w: 0, h: 0, hintH: 0 })

  const cell = useMemo(() => {
    // Grid must fit inside available area both horizontally and vertically.
    // `available.h` includes the hint, so we subtract it + the CSS gap between grid and hint.
    const gridAvailW = available.w
    const gridAvailH = Math.max(0, available.h - available.hintH - verticalGapBetweenGridAndHintPx)

    const cellFromW = gridAvailW > 0 ? (gridAvailW - outerOverheadPx) / size : 0
    const cellFromH = gridAvailH > 0 ? (gridAvailH - outerOverheadPx) / size : 0

    const raw = Math.min(cellFromW, cellFromH)
    // Keep it readable and avoid collapsing.
    return Math.max(28, Math.min(100, raw))
  }, [available.h, available.hintH, available.w, outerOverheadPx, size])

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return

    const ro = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect()
      const hintRect = hintRef.current?.getBoundingClientRect()
      const hintH = hintRect?.height ?? 0
      setAvailable({ w: rect.width, h: rect.height, hintH })
    })

    ro.observe(el)
    // Initialize on mount.
    const rect = el.getBoundingClientRect()
    const hintRect = hintRef.current?.getBoundingClientRect()
    const hintH = hintRect?.height ?? 0
    setAvailable({ w: rect.width, h: rect.height, hintH })

    return () => ro.disconnect()
  }, [])

  return (
    <div
      className="boardWrap"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        flex: '1 1 auto',
        minHeight: 0,
        boxSizing: 'border-box',
      }}
      ref={wrapRef}
    >
      <div
        className="board"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${size}, var(--cell, 56px))`,
          ['--cell' as any]: `${cell}px`,
          gap: gapPx,
          justifyContent: 'center',
          padding: paddingPx,
          maxWidth: '100%',
          height: '100%',
          alignContent: 'center',
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
      <div className="boardHint" ref={hintRef}>
        Route energy from the generator to the reactor.
      </div>
    </div>
  )
}

