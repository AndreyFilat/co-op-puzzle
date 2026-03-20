export const DIRECTIONS = ['N', 'E', 'S', 'W'];
export function rotateCW(rotation) {
    return ((rotation + 1) % 4);
}
export function rotateTileCW(tile) {
    if (!tile.rotatable || tile.locked)
        return tile;
    return { ...tile, rotation: rotateCW(tile.rotation) };
}
export function oppositeDir(d) {
    switch (d) {
        case 'N':
            return 'S';
        case 'E':
            return 'W';
        case 'S':
            return 'N';
        case 'W':
            return 'E';
    }
}
export function dirDelta(d) {
    switch (d) {
        case 'N':
            return { dr: -1, dc: 0 };
        case 'E':
            return { dr: 0, dc: 1 };
        case 'S':
            return { dr: 1, dc: 0 };
        case 'W':
            return { dr: 0, dc: -1 };
    }
}
export function inBounds(board, pos) {
    return pos.r >= 0 && pos.c >= 0 && pos.r < board.length && pos.c < board[0].length;
}
export function getTile(board, pos) {
    return board[pos.r][pos.c];
}
export function setTile(board, pos, next) {
    return board.map((row, r) => r === pos.r ? row.map((t, c) => (c === pos.c ? next : t)) : row);
}
export function createTile(type, rotation = 0, opts) {
    return {
        type,
        rotation,
        rotatable: opts?.rotatable ?? type !== 'empty',
        locked: opts?.locked ?? false,
        powered: opts?.powered ?? false,
        heldByPlayerId: undefined,
        heldUntilMs: undefined,
    };
}
function baseOpenSides(type) {
    switch (type) {
        case 'empty':
            return [];
        case 'generator':
            return ['N', 'E', 'S', 'W'];
        case 'reactor':
            return ['N', 'E', 'S', 'W'];
        case 'straight':
            return ['N', 'S'];
        case 'corner':
            return ['N', 'E'];
        case 'tee':
            return ['N', 'E', 'W'];
        case 'cross':
            return ['N', 'E', 'S', 'W'];
        case 'sync_tile':
            // SYNC_TILE behaves like a straight connector (N/S) for power routing.
            // The special dual-player mechanic is implemented in the room reducer.
            return ['N', 'S'];
    }
}
function rotateDirCW(d, steps) {
    const idx = DIRECTIONS.indexOf(d);
    return DIRECTIONS[(idx + steps) % 4];
}
export function getOpenSides(tile) {
    const base = baseOpenSides(tile.type);
    const rotated = base.map((d) => rotateDirCW(d, tile.rotation));
    return new Set(rotated);
}
export function posKey(pos) {
    return `${pos.r},${pos.c}`;
}
