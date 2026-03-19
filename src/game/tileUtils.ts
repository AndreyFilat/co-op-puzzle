import type { Board, Direction, Pos, Rotation, Tile, TileType } from './types'

export const DIRECTIONS: ReadonlyArray<Direction> = ['N', 'E', 'S', 'W']

export function rotateCW(rotation: Rotation): Rotation {
  return (((rotation + 1) % 4) as Rotation)
}

export function rotateTileCW(tile: Tile): Tile {
  if (!tile.rotatable || tile.locked) return tile
  return { ...tile, rotation: rotateCW(tile.rotation) }
}

export function oppositeDir(d: Direction): Direction {
  switch (d) {
    case 'N':
      return 'S'
    case 'E':
      return 'W'
    case 'S':
      return 'N'
    case 'W':
      return 'E'
  }
}

export function dirDelta(d: Direction): Readonly<{ dr: number; dc: number }> {
  switch (d) {
    case 'N':
      return { dr: -1, dc: 0 }
    case 'E':
      return { dr: 0, dc: 1 }
    case 'S':
      return { dr: 1, dc: 0 }
    case 'W':
      return { dr: 0, dc: -1 }
  }
}

export function inBounds(board: Board, pos: Pos): boolean {
  return pos.r >= 0 && pos.c >= 0 && pos.r < board.length && pos.c < board[0]!.length
}

export function getTile(board: Board, pos: Pos): Tile {
  return board[pos.r]![pos.c]!
}

export function setTile(board: Board, pos: Pos, next: Tile): Board {
  return board.map((row, r) =>
    r === pos.r ? row.map((t, c) => (c === pos.c ? next : t)) : row,
  )
}

export function createTile(
  type: TileType,
  rotation: Rotation = 0,
  opts?: Partial<Pick<Tile, 'rotatable' | 'locked' | 'powered'>>,
): Tile {
  return {
    type,
    rotation,
    rotatable: opts?.rotatable ?? type !== 'empty',
    locked: opts?.locked ?? false,
    powered: opts?.powered ?? false,
    heldByPlayerId: undefined,
    heldUntilMs: undefined,
  }
}

function baseOpenSides(type: TileType): ReadonlyArray<Direction> {
  switch (type) {
    case 'empty':
      return []
    case 'generator':
      return ['N', 'E', 'S', 'W']
    case 'reactor':
      return ['N', 'E', 'S', 'W']
    case 'straight':
      return ['N', 'S']
    case 'corner':
      return ['N', 'E']
    case 'tee':
      return ['N', 'E', 'W']
    case 'cross':
      return ['N', 'E', 'S', 'W']
    case 'sync_tile':
      // SYNC_TILE behaves like a straight connector (N/S) for power routing.
      // The special dual-player mechanic is implemented in the room reducer.
      return ['N', 'S']
  }
}

function rotateDirCW(d: Direction, steps: Rotation): Direction {
  const idx = DIRECTIONS.indexOf(d)
  return DIRECTIONS[(idx + steps) % 4]!
}

export function getOpenSides(tile: Tile): ReadonlySet<Direction> {
  const base = baseOpenSides(tile.type)
  const rotated = base.map((d) => rotateDirCW(d, tile.rotation))
  return new Set(rotated)
}

export function posKey(pos: Pos): string {
  return `${pos.r},${pos.c}`
}

