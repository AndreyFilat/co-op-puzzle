import './App.css'
import { useEffect, useMemo, useState } from 'react'
import { LEVELS } from './game/gameState'
import { elapsedMs, formatTime } from './game/gameState'
import { GameBoard } from './components/GameBoard'
import { Hud } from './components/Hud'
import { MockCoopPanel } from './components/MockCoopPanel'
import { VictoryModal } from './components/VictoryModal'
import type { RoomState } from './room/types'
import { createRoomAdapter } from './room/adapter'
import type { RoomAdapter } from './room/adapter'
import type { Pos } from './game/types'
import { getRemainingCooldownMs } from './room/roomReducer'
import {
  computeWinPathInfo,
  WIN_ANIM_SEQUENCE_MS,
  WIN_ANIM_TOTAL_MS,
  WIN_GENERATOR_PULSE_MS,
  WIN_REACTOR_FLASH_MS,
} from './game/winAnimation'

function App() {
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [room, setRoom] = useState<RoomState | null>(null)
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [adapter, setAdapter] = useState<RoomAdapter | null>(null)
  const [, setAdapterDebug] = useState<ReturnType<RoomAdapter['getDebug']> | null>(null)

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 100)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    const url = new URL(window.location.href)
    const roomId = url.searchParams.get('room') ?? 'alpha'
    const nameFromUrl = url.searchParams.get('name')?.trim()
    const playerName = nameFromUrl && nameFromUrl.length > 0 ? nameFromUrl : '__ANON__'

    const storedId = window.sessionStorage.getItem('coop_player_id') || crypto.randomUUID()
    const colors = ['#68D7FF', '#A78BFA', '#F97373', '#34D399', '#FBBF24']
    const hash = Array.from(storedId).reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
    const storedColor = colors[hash % colors.length]!
    window.sessionStorage.setItem('coop_player_id', storedId)
    window.sessionStorage.setItem('coop_player_color', storedColor)
    console.log('[identity] local player', { storedId, providedName: playerName, storedColor })

    const ad = createRoomAdapter(roomId, playerName, storedId, storedColor)
    setAdapter(ad)
    setAdapterDebug(ad.getDebug())
    const unsub = ad.subscribe((s) => {
      setRoom(s)
      setPlayerId((cur) => cur ?? s.players[0]?.id ?? null)
    })
    return () => unsub()
  }, [])

  const timeText = useMemo(
    () => (room ? formatTime(elapsedMs(room.game, nowMs)) : '0:00'),
    [room, nowMs],
  )

  const winAnimationStartedAtMs = room?.game.winAnimationStartedAtMs ?? null
  const winAnimationActive =
    room?.game.status === 'won' && winAnimationStartedAtMs != null && nowMs < winAnimationStartedAtMs + WIN_ANIM_TOTAL_MS
  const shouldShowVictory = room?.game.status === 'won' && (winAnimationStartedAtMs == null || !winAnimationActive)

  const winPathInfo = useMemo(() => {
    if (!room || room.game.status !== 'won' || winAnimationStartedAtMs == null) {
      return { pathKeys: [], generatorKey: null as string | null, reactorKey: null as string | null }
    }
    return computeWinPathInfo(room.game.board)
  }, [room, winAnimationStartedAtMs])

  const winAnimationVisual = useMemo(() => {
    if (!winAnimationActive || winAnimationStartedAtMs == null) return null

    const elapsed = Math.max(0, nowMs - winAnimationStartedAtMs)
    const seqT = Math.min(1, elapsed / WIN_ANIM_SEQUENCE_MS)

    // Ensure we always have at least one ordered list to light up.
    const pathKeys =
      winPathInfo.pathKeys.length > 0
        ? winPathInfo.pathKeys
        : (() => {
            const keys: string[] = []
            for (let r = 0; r < room!.game.board.length; r++) {
              for (let c = 0; c < room!.game.board[r]!.length; c++) {
                if (room!.game.board[r]![c]!.powered) keys.push(`${r},${c}`)
              }
            }
            return keys
          })()

    const pathLen = pathKeys.length
    const wavePos = pathLen <= 1 ? 0 : seqT * (pathLen - 1)
    const pathIndexByKey: Record<string, number> = {}
    for (let i = 0; i < pathKeys.length; i++) pathIndexByKey[pathKeys[i]!] = i

    const generatorPulse =
      winPathInfo.generatorKey != null &&
      elapsed <= WIN_GENERATOR_PULSE_MS

    const reactorFlash =
      winPathInfo.reactorKey != null &&
      elapsed >= WIN_ANIM_SEQUENCE_MS - WIN_REACTOR_FLASH_MS &&
      elapsed <= WIN_ANIM_SEQUENCE_MS

    return {
      active: true,
      pathKeys,
      pathIndexByKey,
      wavePos,
      generatorPulse,
      reactorFlash,
      generatorKey: winPathInfo.generatorKey,
      reactorKey: winPathInfo.reactorKey,
    }
  }, [
    winAnimationActive,
    winAnimationStartedAtMs,
    nowMs,
    room,
    winPathInfo.generatorKey,
    winPathInfo.reactorKey,
    winPathInfo.pathKeys,
  ])

  function getLocalRemainingCooldownMs(): number {
    if (!room || !playerId) return 0
    const p = room.players.find((pl) => pl.id === playerId)
    return getRemainingCooldownMs(p, nowMs)
  }

  function handleTileClick(pos: Pos) {
    if (!adapter || !playerId) return
    if (winAnimationActive) return
    const remaining = getLocalRemainingCooldownMs()
    if (remaining > 0) return
    adapter.dispatch({ type: 'ROTATE_TILE', playerId, pos, atMs: Date.now() })
  }

  function handlePing(pos: Pos) {
    if (!adapter || !playerId) return
    if (winAnimationActive) return
    adapter.dispatch({ type: 'PING_TILE', playerId, pos, atMs: Date.now() })
  }

  function handleRestart() {
    if (!adapter || !playerId) return
    adapter.dispatch({ type: 'RESTART_LEVEL', playerId, atMs: Date.now() })
  }

  function handleNext() {
    if (!adapter || !playerId) return
    adapter.dispatch({ type: 'NEXT_LEVEL', playerId, atMs: Date.now() })
  }

  return (
    <div className="appShell">
      {room && (
        <div className="layout">
          <MockCoopPanel
            players={room.players}
            recent={room.recentActions}
            currentPlayerId={playerId}
            nowMs={nowMs}
          />

          <main className="main">
            <Hud
              levelName={room.game.level.name}
              errorMessage={room.game.levelLoadError ?? undefined}
              timeText={timeText}
              onRestart={handleRestart}
              onNext={handleNext}
              hideControls={room.game.status === 'won'}
            />
            {/* Temporary debug: level progression */}
            <div
              style={{
                marginTop: 6,
                fontSize: 12,
                opacity: 0.8,
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                color: 'var(--text-h)',
              }}
            >
              levelIndex={room.game.levelIndex} id={room.game.level.id} total={LEVELS.length} levelSize={room.game.level.size} boardSize=
              {room.game.board.length}x{room.game.board[0]?.length ?? 0}
            </div>

            <div className="boardArea">
              <GameBoard
                board={room.game.board}
                solutionPathKeys={room.game.solutionPathKeys}
                debugShowSolution={room.game.debugShowSolution}
                recentActions={room.recentActions}
                nowMs={nowMs}
                players={room.players}
                onTileClick={handleTileClick}
                onPingTile={handlePing}
                winAnimation={winAnimationVisual ?? undefined}
              />

              <VictoryModal
                open={shouldShowVictory}
                moves={room.game.moves}
                timeText={timeText}
                onRestart={handleRestart}
                onNext={handleNext}
              />
            </div>
          </main>
        </div>
      )}
    </div>
  )
}

export default App
