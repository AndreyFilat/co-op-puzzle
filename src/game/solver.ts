import type { Board, Pos, Tile } from './types'
import { dirDelta, getOpenSides, getTile, inBounds, oppositeDir, posKey } from './tileUtils'

export type SolveResult = Readonly<{
  board: Board
  poweredKeys: ReadonlySet<string>
  reactorPowered: boolean
  generatorPos: Pos | null
  reactorPos: Pos | null
}>

function withPoweredCleared(tile: Tile): Tile {
  return tile.powered ? { ...tile, powered: false } : tile
}

export function solveBoard(board: Board): SolveResult {
  const generatorPos = findFirst(board, (t) => t.type === 'generator')
  const reactorPos = findFirst(board, (t) => t.type === 'reactor')

  const cleared: Board = board.map((row) => row.map(withPoweredCleared))
  if (!generatorPos) {
    return {
      board: cleared,
      poweredKeys: new Set(),
      reactorPowered: false,
      generatorPos: null,
      reactorPos,
    }
  }

  const visited = new Set<string>()
  const q: Pos[] = [generatorPos]
  visited.add(posKey(generatorPos))

  while (q.length) {
    const cur = q.shift()!
    const curTile = getTile(cleared, cur)
    const curOpen = getOpenSides(curTile)

    for (const dir of curOpen) {
      const { dr, dc } = dirDelta(dir)
      const nxt: Pos = { r: cur.r + dr, c: cur.c + dc }
      if (!inBounds(cleared, nxt)) continue

      const nxtTile = getTile(cleared, nxt)
      if (nxtTile.type === 'empty') continue

      const nxtOpen = getOpenSides(nxtTile)
      if (!nxtOpen.has(oppositeDir(dir))) continue

      const key = posKey(nxt)
      if (visited.has(key)) continue
      visited.add(key)
      q.push(nxt)
    }
  }

  const solvedBoard: Board = cleared.map((row, r) =>
    row.map((t, c) => {
      if (t.type === 'empty') return t
      const powered = visited.has(`${r},${c}`)
      return powered === t.powered ? t : { ...t, powered }
    }),
  )

  const reactorPowered = reactorPos ? visited.has(posKey(reactorPos)) : false

  return { board: solvedBoard, poweredKeys: visited, reactorPowered, generatorPos, reactorPos }
}

function findFirst(board: Board, predicate: (t: Tile) => boolean): Pos | null {
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[r]!.length; c++) {
      if (predicate(board[r]![c]!)) return { r, c }
    }
  }
  return null
}

