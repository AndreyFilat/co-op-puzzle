export type Direction = 'N' | 'E' | 'S' | 'W'

export type TileType =
  | 'empty'
  | 'generator'
  | 'reactor'
  | 'straight'
  | 'corner'
  | 'tee'
  | 'cross'
  | 'sync_tile'

export type Rotation = 0 | 1 | 2 | 3

export type Pos = Readonly<{ r: number; c: number }>

export type Tile = Readonly<{
  type: TileType
  rotation: Rotation
  rotatable: boolean
  locked: boolean
  powered: boolean
  overloaded?: boolean // Overload: multiple energy flows collided; blocks conduction + shows overheated visuals.
  unlockedUntilMs?: number // When set, locked tiles temporarily become rotatable for cooperative unlocks.
  heldByPlayerId?: string // SYNC_TILE: holder id
  heldUntilMs?: number // SYNC_TILE: window end
}>

export type Board = ReadonlyArray<ReadonlyArray<Tile>>

export type Level = Readonly<{
  id: string
  name: string
  size: number
  board: Board
}>

export type GameStatus = 'playing' | 'won'

export type GameState = Readonly<{
  levelIndex: number
  level: Level
  levelLoadError: string | null
  board: Board
  solutionBoard: Board
  solutionPathKeys: ReadonlySet<string>
  debugShowSolution: boolean
  moves: number
  startedAtMs: number
  wonAtMs: number | null
  winAnimationStartedAtMs: number | null
  status: GameStatus
}>

