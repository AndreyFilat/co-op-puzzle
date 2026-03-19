import type { Board, GameState, Level, Pos } from './types'
import { createTile, rotateTileCW, setTile } from './tileUtils'
import { solveBoard } from './solver'

const empty = (): Board[number][number] => createTile('empty')

const GENERATOR = createTile('generator', 0, { rotatable: false })
const REACTOR = createTile('reactor', 0, { rotatable: false })

const LEVEL_1: Level = {
  id: 'l1',
  name: 'SYNC Tile Test',
  size: 6,
  board: [
    // Generator -> SYNC_TILE (row0) -> corner -> vertical corridor -> reactor.
    // Without cooperation, SYNC_TILE can be held but cannot be rotated, so the corridor stays disconnected.
    [GENERATOR, createTile('straight', 1), createTile('straight', 1), createTile('sync_tile', 0), createTile('straight', 1), createTile('corner', 2)],
    [empty(), empty(), empty(), empty(), empty(), createTile('straight', 1)],
    [empty(), empty(), empty(), empty(), empty(), createTile('straight', 1)],
    [empty(), empty(), empty(), empty(), empty(), createTile('straight', 1)],
    [empty(), empty(), empty(), empty(), empty(), createTile('straight', 1)],
    [empty(), empty(), empty(), empty(), empty(), REACTOR],
  ],
}

const LEVEL_2: Level = {
  id: 'l2',
  name: 'Sideways Switchback',
  size: 6,
  board: [
    [GENERATOR, createTile('straight', 0), createTile('corner', 1), empty(), empty(), empty()],
    [empty(), createTile('corner', 1), createTile('straight', 1), empty(), empty(), empty()],
    [empty(), createTile('cross', 0), createTile('tee', 3), createTile('corner', 1), empty(), empty()],
    [empty(), empty(), empty(), createTile('straight', 1), empty(), empty()],
    [empty(), empty(), empty(), createTile('corner', 3), createTile('straight', 0), createTile('corner', 1)],
    [empty(), empty(), empty(), empty(), empty(), REACTOR],
  ],
}

const LEVEL_3: Level = {
  id: 'l3',
  name: 'Junction Nebula',
  size: 7,
  board: [
    [GENERATOR, createTile('straight', 0), createTile('straight', 0), createTile('corner', 1), empty(), empty(), empty()],
    [empty(), empty(), createTile('tee', 1), createTile('straight', 1), empty(), empty(), empty()],
    [empty(), createTile('corner', 0), createTile('cross', 0), createTile('tee', 3), createTile('corner', 1), empty(), empty()],
    [empty(), empty(), createTile('corner', 1), empty(), createTile('straight', 1), empty(), empty()],
    [empty(), empty(), empty(), empty(), createTile('corner', 3), createTile('straight', 0), createTile('corner', 1)],
    [empty(), empty(), empty(), empty(), empty(), empty(), createTile('straight', 1)],
    [empty(), empty(), empty(), empty(), empty(), empty(), REACTOR],
  ],
}

const LEVEL_4: Level = {
  id: 'l4',
  name: 'Loop Labyrinth',
  size: 7,
  board: [
    [GENERATOR, createTile('straight', 0), createTile('straight', 0), createTile('corner', 1), empty(), empty(), empty()],
    [empty(), empty(), empty(), createTile('straight', 1), empty(), empty(), empty()],
    [empty(), empty(), empty(), createTile('tee', 3), createTile('corner', 1), empty(), empty()],
    [empty(), empty(), createTile('corner', 0), createTile('tee', 0), createTile('straight', 1), empty(), empty()],
    [empty(), empty(), createTile('corner', 2), createTile('cross', 0), createTile('straight', 1), empty(), empty()],
    [empty(), empty(), empty(), empty(), createTile('straight', 1), empty(), empty()],
    [empty(), empty(), empty(), empty(), createTile('corner', 3), createTile('straight', 0), REACTOR],
  ],
}

// Existing 8x8 layouts become deeper Levels 5 and 6
const LEVEL_5: Level = {
  id: 'l5',
  name: 'Branch & Loop (Deep)',
  size: 8,
  board: [
    [GENERATOR, createTile('straight', 1), createTile('straight', 1), createTile('corner', 2), empty(), empty(), empty(), empty()],
    [empty(), empty(), empty(), createTile('straight', 0), empty(), empty(), empty(), empty()],
    [empty(), empty(), empty(), createTile('straight', 0), empty(), empty(), empty(), empty()],
    [
      empty(),
      empty(),
      empty(),
      createTile('tee', 1),
      createTile('straight', 1),
      createTile('straight', 1),
      // Break east branch here in the initial layout.
      createTile('corner', 1),
      empty(),
    ],
    [empty(), empty(), empty(), createTile('straight', 0), empty(), empty(), createTile('straight', 0), empty()],
    [empty(), createTile('corner', 1), createTile('cross', 0), createTile('corner', 3), empty(), empty(), createTile('straight', 0), empty()],
    [empty(), createTile('corner', 0), createTile('corner', 3), empty(), empty(), empty(), createTile('straight', 3), empty()],
    [empty(), empty(), empty(), empty(), empty(), empty(), createTile('corner', 3), REACTOR],
  ],
}

const LEVEL_6: Level = {
  id: 'l6',
  name: 'Multiple Routes (Final)',
  size: 8,
  board: [
    [GENERATOR, createTile('straight', 1), createTile('straight', 1), createTile('corner', 2), empty(), empty(), empty(), empty()],
    [empty(), empty(), empty(), createTile('straight', 0), empty(), empty(), empty(), empty()],
    [empty(), empty(), empty(), createTile('straight', 0), empty(), empty(), empty(), empty()],
    [empty(), empty(), empty(), createTile('corner', 0), createTile('straight', 1), createTile('straight', 1), createTile('corner', 1), empty()],
    [empty(), empty(), empty(), empty(), empty(), empty(), createTile('straight', 0), empty()],
    [empty(), empty(), empty(), empty(), empty(), empty(), createTile('straight', 0), empty()],
    [empty(), empty(), empty(), empty(), empty(), createTile('corner', 1), createTile('tee', 3), empty()],
    [empty(), empty(), empty(), empty(), empty(), createTile('corner', 0), createTile('tee', 3), REACTOR],
  ],
}

const LEVEL_A: Level = {
  id: 'a7',
  name: 'Co-op Gate A',
  size: 7,
  board: [
    [GENERATOR, createTile('straight', 0), createTile('straight', 0), createTile('sync_tile', 0), createTile('straight', 0), createTile('corner', 0), empty()],
    [empty(), empty(), createTile('corner', 0), createTile('corner', 2), empty(), createTile('straight', 1), empty()],
    [empty(), empty(), createTile('corner', 1), createTile('cross', 0), empty(), createTile('tee', 3), createTile('corner', 0)],
    [empty(), empty(), empty(), empty(), empty(), empty(), createTile('straight', 1)],
    [empty(), empty(), empty(), empty(), empty(), empty(), createTile('sync_tile', 1)],
    [empty(), empty(), empty(), empty(), empty(), empty(), createTile('straight', 1)],
    [empty(), empty(), empty(), empty(), empty(), empty(), REACTOR],
  ],
}

const LEVEL_B: Level = {
  id: 'b8',
  name: 'Co-op Gate B',
  size: 8,
  board: [
    [
      GENERATOR,
      createTile('straight', 0),
      createTile('straight', 0),
      createTile('straight', 0),
      createTile('sync_tile', 0),
      createTile('straight', 0),
      createTile('corner', 0),
      empty(),
    ],
    [empty(), empty(), empty(), createTile('corner', 0), empty(), empty(), createTile('straight', 1), empty()],
    [empty(), empty(), empty(), createTile('cross', 0), empty(), empty(), createTile('straight', 1), empty()],
    [empty(), empty(), empty(), empty(), empty(), empty(), createTile('tee', 3), createTile('corner', 0)],
    [empty(), empty(), empty(), empty(), empty(), empty(), empty(), createTile('sync_tile', 1)],
    [empty(), empty(), empty(), empty(), empty(), empty(), empty(), createTile('straight', 1)],
    [empty(), empty(), empty(), empty(), empty(), empty(), empty(), createTile('straight', 1)],
    [empty(), empty(), empty(), empty(), empty(), empty(), empty(), REACTOR],
  ],
}

const LEVEL_C: Level = {
  id: 'c8',
  name: 'Co-op Gate C',
  size: 8,
  board: [
    [GENERATOR, createTile('straight', 0), createTile('straight', 0), createTile('straight', 0), createTile('sync_tile', 0), createTile('straight', 0), createTile('corner', 0), empty()],
    [empty(), empty(), empty(), empty(), empty(), empty(), createTile('straight', 1), empty()],
    [empty(), empty(), empty(), empty(), empty(), createTile('corner', 0), createTile('corner', 0), empty()],
    [empty(), empty(), empty(), empty(), empty(), createTile('tee', 0), createTile('cross', 0), empty()],
    [empty(), empty(), empty(), empty(), empty(), createTile('sync_tile', 1), empty(), empty()],
    [empty(), empty(), empty(), empty(), empty(), createTile('straight', 1), empty(), empty()],
    [empty(), empty(), empty(), empty(), empty(), createTile('corner', 2), createTile('corner', 0), empty()],
    [empty(), empty(), empty(), empty(), empty(), empty(), REACTOR, empty()],
  ],
}

const LEVEL_D: Level = {
  id: 'd9',
  name: 'Co-op Gate D',
  size: 9,
  board: [
    [GENERATOR, createTile('straight', 0), createTile('straight', 0), createTile('straight', 0), createTile('sync_tile', 0), createTile('straight', 0), createTile('corner', 0), empty(), empty()],
    [empty(), empty(), empty(), empty(), empty(), empty(), createTile('straight', 1), empty(), empty()],
    [empty(), empty(), empty(), empty(), empty(), empty(), createTile('straight', 1), empty(), empty()],
    [empty(), empty(), empty(), empty(), empty(), createTile('cross', 0), createTile('tee', 3), createTile('corner', 0), empty()],
    [empty(), empty(), empty(), empty(), empty(), empty(), empty(), createTile('sync_tile', 1), empty()],
    [empty(), empty(), empty(), empty(), empty(), empty(), empty(), createTile('straight', 1), empty()],
    [empty(), empty(), empty(), empty(), empty(), empty(), empty(), createTile('straight', 1), empty()],
    [empty(), empty(), empty(), empty(), empty(), empty(), empty(), createTile('corner', 2), createTile('corner', 0)],
    [empty(), empty(), empty(), empty(), empty(), empty(), empty(), empty(), REACTOR],
  ],
}

export const LEVELS: ReadonlyArray<Level> = [LEVEL_1, LEVEL_2, LEVEL_3, LEVEL_4, LEVEL_5, LEVEL_6, LEVEL_A, LEVEL_B, LEVEL_C, LEVEL_D]

export function createGameState(levelIndex: number, nowMs: number): GameState {
  const idx = Math.max(0, Math.min(levelIndex, LEVELS.length - 1))
  const level = LEVELS[idx]!

  // Temporary debug: verify level progression + SYNC_TILE density.
  let syncTileCount = 0
  for (let r = 0; r < level.board.length; r++) {
    for (let c = 0; c < level.board[r]!.length; c++) {
      if (level.board[r]![c]!.type === 'sync_tile') syncTileCount++
    }
  }
  console.log('[level-load]', { levelIndex: idx, boardSize: level.size, syncTileCount, levelId: level.id })

  const solvedInitial = solveBoard(level.board)

  return {
    // Keep `levelIndex` always valid for consistent UI + progression logic.
    levelIndex: idx,
    level,
    levelLoadError: null,
    board: solvedInitial.board,
    solutionBoard: solvedInitial.board,
    solutionPathKeys: solvedInitial.poweredKeys,
    debugShowSolution: false,
    moves: 0,
    startedAtMs: nowMs,
    wonAtMs: null,
    winAnimationStartedAtMs: null,
    status: 'playing',
  }
}

export function rotateAt(state: GameState, pos: Pos, nowMs: number): GameState {
  if (state.status !== 'playing') return state
  const tile = state.board[pos.r]?.[pos.c]
  if (!tile) return state
  if (!tile.rotatable || tile.locked) return state

  const nextBoard = setTile(state.board, pos, rotateTileCW(tile))
  const solved = solveBoard(nextBoard)
  const won = solved.reactorPowered

  return {
    ...state,
    board: solved.board,
    moves: state.moves + 1,
    status: won ? 'won' : 'playing',
    wonAtMs: won ? state.wonAtMs ?? nowMs : null,
  }
}

export function restartLevel(state: GameState, nowMs: number): GameState {
  return createGameState(state.levelIndex, nowMs)
}

export function nextLevel(state: GameState, nowMs: number): GameState {
  const nextIdx = (state.levelIndex + 1) % LEVELS.length
  return createGameState(nextIdx, nowMs)
}

export function elapsedMs(state: GameState, nowMs: number): number {
  const end = state.wonAtMs ?? nowMs
  return Math.max(0, end - state.startedAtMs)
}

export function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

