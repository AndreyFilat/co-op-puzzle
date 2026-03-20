import { createTile, rotateTileCW, setTile } from './tileUtils';
import { solveBoard } from './solver';
const empty = () => createTile('empty');
const GENERATOR = createTile('generator', 0, { rotatable: false });
const REACTOR = createTile('reactor', 0, { rotatable: false });
const LEVEL_3 = {
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
};
const LEVEL_4 = {
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
};
// Existing 8x8 layouts become deeper Levels 5 and 6
const LEVEL_5 = {
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
};
const LEVEL_6 = {
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
};
const LEVEL_A = {
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
};
const LEVEL_B = {
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
};
const LEVEL_C = {
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
};
const LEVEL_D = {
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
};
const LEVEL_OVERLOAD_1 = {
    id: 'ov1',
    name: 'Overload Trap (Merge Cross)',
    size: 6,
    board: [
        // Generator -> tee split -> two branch paths -> cross merge -> single corridor to reactor.
        // Overload tile is the cross at (r=2,c=1).
        // If BOTH branches are connected, the cross is overloaded and blocks the only corridor to the reactor.
        // Success requires keeping ONLY ONE branch connected so the cross is NOT overloaded.
        // .  G  .  .  .  .
        [empty(), GENERATOR, empty(), empty(), empty(), empty()],
        // (row1) split
        // Left enters (1,0) from E => corner(1) lets it go S.
        // Right enters (1,2) from W => corner(2) lets it go S.
        [createTile('corner', 1), createTile('tee', 0), createTile('corner', 2), empty(), empty(), empty()],
        // (row2) merge + branch control
        // Cross at (2,1) is the ONLY gateway to the reactor corridor.
        //
        // Left branch is disconnected until the player rotates (2,0) into corner(0) (N/E).
        // Right branch is also disconnected until the player rotates (2,2) into corner(3) (W/N).
        //
        // If BOTH are connected, the cross receives energy from two sides and becomes overloaded,
        // blocking the only corridor to the reactor.
        [createTile('corner', 2), createTile('cross', 0), createTile('corner', 0), empty(), empty(), empty()],
        // (row3) corridor is intentionally misoriented to require interaction after the merge is opened.
        [empty(), createTile('straight', 1), empty(), empty(), empty(), empty()],
        [empty(), createTile('straight', 1), empty(), empty(), empty(), empty()],
        // (row5) reactor (only reachable if merge is not overloaded + corridor tiles are oriented correctly)
        [empty(), REACTOR, empty(), empty(), empty(), empty()],
    ],
};
const LEVEL_OVERLOAD_2 = {
    id: 'ov2',
    name: 'Overload Split + Safe Single Route',
    size: 7,
    board: [
        // Generator -> tee split -> equal-length branches -> cross merge -> single corridor to reactor.
        // Overload tile is the cross at (r=3,c=3).
        // Right branch is intentionally broken on level start by straight(1) at (2,4).
        // Rotating that tile to straight(0) connects the second branch and overloads the cross, blocking the only corridor.
        // . . . G . . .
        [empty(), empty(), empty(), GENERATOR, empty(), empty(), empty()],
        // (row1) split into two equal branches
        [empty(), empty(), createTile('corner', 1), createTile('tee', 0), createTile('corner', 2), empty(), empty()],
        // (row2) left branch is partially disconnected; right branch is intentionally broken
        // so the merge cross is NOT powered on level start.
        [empty(), empty(), createTile('straight', 0), empty(), createTile('straight', 1), empty(), empty()],
        // (row3) merge cross (critical path)
        // Left branch will connect only after rotating (3,2) into the proper corner orientation.
        // Right branch will connect only after rotating (2,4) from straight(1) -> straight(0).
        // If BOTH connect, the cross is overloaded and blocks the only corridor to the reactor.
        [empty(), empty(), createTile('corner', 2), createTile('cross', 0), createTile('corner', 3), empty(), empty()],
        // (row4)/(row5) corridor is intentionally misoriented to force additional interaction.
        [empty(), empty(), empty(), createTile('straight', 1), empty(), empty(), empty()],
        [empty(), empty(), empty(), createTile('straight', 1), empty(), empty(), empty()],
        // (row6) reactor
        [empty(), empty(), empty(), REACTOR, empty(), empty(), empty()],
    ],
};
export const LEVELS = [
    LEVEL_3,
    LEVEL_4,
    LEVEL_5,
    LEVEL_6,
    LEVEL_A,
    LEVEL_B,
    LEVEL_C,
    LEVEL_D,
    LEVEL_OVERLOAD_1,
    LEVEL_OVERLOAD_2,
];
export function createGameState(levelIndex, nowMs) {
    const idx = Math.max(0, Math.min(levelIndex, LEVELS.length - 1));
    const level = LEVELS[idx];
    // Temporary debug: verify level progression + SYNC_TILE density.
    let syncTileCount = 0;
    for (let r = 0; r < level.board.length; r++) {
        for (let c = 0; c < level.board[r].length; c++) {
            if (level.board[r][c].type === 'sync_tile')
                syncTileCount++;
        }
    }
    console.log('[level-load]', { levelIndex: idx, boardSize: level.size, syncTileCount, levelId: level.id });
    const solvedInitial = solveBoard(level.board);
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
    };
}
export function rotateAt(state, pos, nowMs) {
    if (state.status !== 'playing')
        return state;
    const tile = state.board[pos.r]?.[pos.c];
    if (!tile)
        return state;
    if (!tile.rotatable || tile.locked)
        return state;
    const nextBoard = setTile(state.board, pos, rotateTileCW(tile));
    const solved = solveBoard(nextBoard);
    const won = solved.reactorPowered;
    return {
        ...state,
        board: solved.board,
        moves: state.moves + 1,
        status: won ? 'won' : 'playing',
        wonAtMs: won ? state.wonAtMs ?? nowMs : null,
    };
}
export function restartLevel(state, nowMs) {
    return createGameState(state.levelIndex, nowMs);
}
export function nextLevel(state, nowMs) {
    const nextIdx = (state.levelIndex + 1) % LEVELS.length;
    return createGameState(nextIdx, nowMs);
}
export function elapsedMs(state, nowMs) {
    const end = state.wonAtMs ?? nowMs;
    return Math.max(0, end - state.startedAtMs);
}
export function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
}
