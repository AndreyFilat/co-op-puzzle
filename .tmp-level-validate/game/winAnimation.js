import { getOpenSides, dirDelta, inBounds, oppositeDir, posKey } from './tileUtils';
export const WIN_ANIM_TOTAL_MS = 1200;
export const WIN_ANIM_SEQUENCE_MS = 950;
export const WIN_REACTOR_FLASH_MS = 220;
export const WIN_GENERATOR_PULSE_MS = 180;
function findPos(board, type) {
    for (let r = 0; r < board.length; r++) {
        for (let c = 0; c < board[r].length; c++) {
            if (board[r][c].type === type)
                return { r, c };
        }
    }
    return null;
}
/**
 * For visuals only: builds a deterministic shortest powered path from generator to reactor
 * by walking through `tile.powered === true` connections.
 */
export function computeWinPathInfo(board) {
    const generatorPos = findPos(board, 'generator');
    const reactorPos = findPos(board, 'reactor');
    const generatorKey = generatorPos ? posKey(generatorPos) : null;
    const reactorKey = reactorPos ? posKey(reactorPos) : null;
    if (!generatorPos || !reactorPos || !generatorKey || !reactorKey) {
        return { pathKeys: [], generatorKey, reactorKey };
    }
    const visited = new Set();
    const parent = new Map(); // childKey -> parentKey
    const q = [generatorPos];
    visited.add(generatorKey);
    while (q.length) {
        const cur = q.shift();
        const curKey = posKey(cur);
        if (curKey === reactorKey)
            break;
        const curTile = board[cur.r][cur.c];
        const curOpen = getOpenSides(curTile);
        for (const dir of curOpen) {
            const { dr, dc } = dirDelta(dir);
            const nxt = { r: cur.r + dr, c: cur.c + dc };
            if (!inBounds(board, nxt))
                continue;
            const nxtTile = board[nxt.r][nxt.c];
            if (!nxtTile.powered)
                continue;
            if (nxtTile.type === 'empty')
                continue;
            const nxtOpen = getOpenSides(nxtTile);
            if (!nxtOpen.has(oppositeDir(dir)))
                continue;
            const nxtKey = posKey(nxt);
            if (visited.has(nxtKey))
                continue;
            visited.add(nxtKey);
            parent.set(nxtKey, curKey);
            q.push(nxt);
        }
    }
    if (!visited.has(reactorKey)) {
        return { pathKeys: [], generatorKey, reactorKey };
    }
    // Reconstruct parent chain from reactor back to generator.
    const reversed = [reactorKey];
    let curKey = reactorKey;
    while (curKey !== generatorKey) {
        const prev = parent.get(curKey);
        if (!prev)
            break;
        reversed.push(prev);
        curKey = prev;
    }
    return { pathKeys: reversed.reverse(), generatorKey, reactorKey };
}
