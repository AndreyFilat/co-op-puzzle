import type { Board, GameState, Level, Pos } from './types'
import { createTile, rotateTileCW, setTile } from './tileUtils'
import { solveBoard } from './solver'

const GENERATOR = createTile('generator', 0, { rotatable: false })
const REACTOR = createTile('reactor', 0, { rotatable: false })

const EMPTY = createTile('empty')

// Level 1 (8x8): overload avoidance via loop, with a coop-locked gate.
const LEVEL_1: Level = {
  id: 'hand1',
  name: 'Overload Avoidance (Loop + Locked SYNC Gate)',
  size: 10,
  board: [
    // r0
    [EMPTY, EMPTY, EMPTY, EMPTY, GENERATOR, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],

    // r1
    [EMPTY, EMPTY, EMPTY, createTile('corner', 1), createTile('tee', 0), createTile('corner', 2), EMPTY, EMPTY, EMPTY, EMPTY],

    // r2
    [EMPTY, EMPTY, EMPTY, createTile('straight', 0), EMPTY, createTile('sync_tile', 1), EMPTY, EMPTY, EMPTY, EMPTY],

    // r3
    [EMPTY, EMPTY, createTile('corner', 1), createTile('corner', 3), EMPTY, createTile('corner', 0), createTile('corner', 2), EMPTY, EMPTY, EMPTY],

    // r4
    [EMPTY, EMPTY, createTile('straight', 0), EMPTY, EMPTY, EMPTY, createTile('straight', 0), EMPTY, EMPTY, EMPTY],

    // r5
    [EMPTY, EMPTY, createTile('corner', 0), createTile('straight', 1), createTile('corner', 2), EMPTY, createTile('straight', 0), EMPTY, EMPTY, EMPTY],

    // r6 (merge zone)
    [EMPTY, EMPTY, EMPTY, EMPTY, createTile('corner', 0), createTile('cross', 0), createTile('corner', 3), EMPTY, EMPTY, EMPTY],

    // r7 (locked on path)
    [EMPTY, EMPTY, EMPTY, EMPTY, createTile('cross', 0), createTile('straight', 0, { locked: false }), EMPTY, EMPTY, EMPTY, EMPTY],

    // r8 (специально сломан поворот — не solved)
    [EMPTY, EMPTY, EMPTY, EMPTY, createTile('corner', 2), createTile('corner', 1), EMPTY, EMPTY, EMPTY, EMPTY],

    // r9
    [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, REACTOR, EMPTY, EMPTY, EMPTY, EMPTY],
  ] as unknown as Board,
}

// Level 2 (8x8): locked path + overload interaction at the central merge cross.
const LEVEL_2: Level = {
  id: 'hand2',
  name: 'Locked Path + Overload Interaction',
  size: 8,
  board: [
    // r0
    [EMPTY, EMPTY, GENERATOR, EMPTY, EMPTY, EMPTY, createTile('corner', 0), createTile('corner', 3)],
    // r1
    [EMPTY, createTile('corner', 3), createTile('tee', 0), createTile('corner', 2), EMPTY, EMPTY, createTile('corner', 2), createTile('corner', 1)],
    // r2
    [EMPTY, createTile('corner', 0), createTile('cross', 0), createTile('corner', 0), EMPTY, EMPTY, EMPTY, EMPTY],
    // r3
    [EMPTY, EMPTY, createTile('straight', 1), EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
    // r4  <- LOCKED gate blocks main corridor until coop unlock/rotation
    [EMPTY, EMPTY, createTile('corner', 0), createTile('straight', 0, { locked: false }), createTile('corner', 2), EMPTY, EMPTY, EMPTY],
    // r5  <- extra decision element (competing route)
    [createTile('corner', 0), createTile('corner', 3), EMPTY, createTile('corner', 1), createTile('tee', 0), createTile('corner', 0), EMPTY, EMPTY],
    // r6
    [createTile('corner', 2), createTile('corner', 1), EMPTY, createTile('straight', 1), EMPTY, EMPTY, EMPTY, EMPTY],
    // r7  <- coop SYNC_TILE gate to unlock the LOCKED tile
    [createTile('corner', 1), createTile('corner', 2), EMPTY, createTile('corner', 0), createTile('sync_tile', 1), REACTOR, EMPTY, EMPTY],
  ] as unknown as Board,
}

// Level 3 (10x10): split-merge with overload at merge and dual locked branch gates.
//
// Layout sketch:
// - Generator (0,4) -> fixed split tee (1,4)
// - Left branch (starts at 1,3) -> locked corner (3,2) -> winding chain -> merge entrance (5,3)
// - Right branch (starts at 1,5) -> locked corner (3,6) -> winding chain -> merge entrance (5,5)
// - Merge: overloaded-sensitive cross (5,4) receives from both sides
// - Downstream: (6,4) straight -> (7,4) straight -> (8,4) corner -> (8,5) corner -> Reactor (9,5)
// - Coop: an isolated sync_tile (8,0) unlocks locked tiles.
const LEVEL_3: Level = {
  id: 'splitmerge1',
  name: 'Split/Merge Overload (Critical Locked Gate)',
  size: 10,
  board: [
    // r0
    [EMPTY, EMPTY, EMPTY, EMPTY, GENERATOR, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
    // r1: split tee (generator -> 2 branches)
    // (1,4) must accept from North, and can emit to West/East.
    [EMPTY, EMPTY, EMPTY, createTile('corner', 1), createTile('tee', 0), createTile('corner', 2), EMPTY, EMPTY, EMPTY, EMPTY],
    // r2
    [EMPTY, EMPTY, EMPTY, createTile('straight', 0), EMPTY, createTile('straight', 0), EMPTY, EMPTY, EMPTY, EMPTY],
    // r3
    [EMPTY, EMPTY, EMPTY, createTile('straight', 0), EMPTY, createTile('straight', 0), EMPTY, EMPTY, EMPTY, EMPTY],
    // r4
    [EMPTY, EMPTY, EMPTY, createTile('straight', 0), EMPTY, createTile('straight', 0), EMPTY, EMPTY, EMPTY, EMPTY],
    // r5: merge cross
    // Left branch entrance at (5,3) -> cross at (5,4) from West.
    // Right branch entrance at (5,5) -> cross at (5,4) from East.
    [EMPTY, EMPTY, EMPTY, createTile('corner', 0), createTile('cross', 0), createTile('corner', 3), EMPTY, EMPTY, EMPTY, EMPTY],
    // r6: sync_tile is downstream of the overload-sensitive merge.
    [EMPTY, EMPTY, EMPTY, EMPTY, createTile('sync_tile', 1), EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
    // r7: Gate tile on the only sync->reactor corridor.
    // Keep it unlocked so E8 (row 8, col E) is always rotatable.
    [EMPTY, EMPTY, EMPTY, EMPTY, createTile('straight', 1, { locked: false }), EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
    // r8: after the locked straight, we must turn into the reactor corridor.
    [EMPTY, EMPTY, EMPTY, EMPTY, createTile('corner', 1), createTile('corner', 0), EMPTY, EMPTY, EMPTY, EMPTY],
    // r9
    [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, REACTOR, EMPTY, EMPTY, EMPTY, EMPTY],
  ] as unknown as Board,
}

export const LEVELS: ReadonlyArray<Level> = [LEVEL_1, LEVEL_2, LEVEL_3]

export function createGameState(levelIndex: number, nowMs: number): GameState {
  const idx = Math.max(0, Math.min(levelIndex, LEVELS.length - 1))
  const level = LEVELS[idx]!

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

