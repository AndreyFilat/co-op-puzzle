import { dirDelta, getOpenSides, getTile, inBounds, oppositeDir, posKey } from './tileUtils';
function withSolvedCleared(tile) {
    // Solver output is recomputed each call, so stale powered/overloaded flags must be removed first.
    if (!tile.powered && tile.overloaded == null)
        return tile;
    return { ...tile, powered: false, overloaded: undefined };
}
export function solveBoard(board) {
    const generatorPos = findFirst(board, (t) => t.type === 'generator');
    const reactorPos = findFirst(board, (t) => t.type === 'reactor');
    const cleared = board.map((row) => row.map(withSolvedCleared));
    if (!generatorPos) {
        return {
            board: cleared,
            poweredKeys: new Set(),
            reactorPowered: false,
            generatorPos: null,
            reactorPos,
        };
    }
    // Phase 1: detect branch conflicts (Overload) without counting loop revisits as "simultaneous" conflicts.
    //
    // We still prevent backtracking by skipping exit direction === incomingDir.
    // We also still use visited-state identity (tile position + incomingDir) to avoid infinite growth.
    //
    // Overload rule here is "branch conflict at the same time":
    // A tile overloads only if it receives energy from 2+ different incomingDir states in the same BFS depth layer.
    // This prevents a single continuous path that loops and revisits later from being treated as multiple flows.
    const genKey = posKey(generatorPos);
    const stateKey = (s) => `${posKey(s.pos)}|${s.incomingDir ?? 'gen'}`;
    const visitedStates = new Set();
    const overloadedKeys = new Set();
    const queue = [{ pos: generatorPos, incomingDir: null, depth: 0 }];
    visitedStates.add(stateKey(queue[0]));
    let head = 0;
    const maxStates = cleared.length * cleared[0].length * 20 + 200;
    let processed = 0;
    while (head < queue.length) {
        if (++processed > maxStates)
            break;
        const currentDepth = queue[head].depth;
        const layer = [];
        while (head < queue.length && queue[head].depth === currentDepth) {
            layer.push(queue[head]);
            head++;
        }
        // Detect collisions within the same time layer.
        const incomingDirsThisLayerByTile = new Map();
        for (const s of layer) {
            if (s.incomingDir == null)
                continue; // ignore generator emission marker
            const k = posKey(s.pos);
            const set = incomingDirsThisLayerByTile.get(k) ?? new Set();
            set.add(s.incomingDir);
            incomingDirsThisLayerByTile.set(k, set);
        }
        for (const [tileKey, dirs] of incomingDirsThisLayerByTile.entries()) {
            if (dirs.size > 1)
                overloadedKeys.add(tileKey);
        }
        // Expand layer states to next depth.
        for (const cur of layer) {
            const curTile = getTile(cleared, cur.pos);
            const curOpen = getOpenSides(curTile);
            const exitSides = cur.incomingDir == null ? [...curOpen] : [...curOpen].filter((d) => d !== cur.incomingDir);
            if (exitSides.length === 0)
                continue;
            for (const exitDir of exitSides) {
                const { dr, dc } = dirDelta(exitDir);
                const nxt = { r: cur.pos.r + dr, c: cur.pos.c + dc };
                if (!inBounds(cleared, nxt))
                    continue;
                const nxtTile = getTile(cleared, nxt);
                if (nxtTile.type === 'empty')
                    continue;
                const nxtOpen = getOpenSides(nxtTile);
                if (!nxtOpen.has(oppositeDir(exitDir)))
                    continue;
                const nxtIncomingDir = oppositeDir(exitDir);
                const nxtState = { pos: nxt, incomingDir: nxtIncomingDir, depth: currentDepth + 1 };
                const nxtStateKey = stateKey(nxtState);
                if (visitedStates.has(nxtStateKey))
                    continue;
                visitedStates.add(nxtStateKey);
                queue.push(nxtState);
            }
        }
    }
    // Never overload the generator (it only emits energy).
    overloadedKeys.delete(genKey);
    // Phase 2: compute final powered region, stopping propagation through overloaded tiles.
    const poweredVisited = new Set();
    const q2 = [];
    if (!overloadedKeys.has(genKey)) {
        poweredVisited.add(genKey);
        q2.push(generatorPos);
    }
    while (q2.length) {
        const cur = q2.shift();
        const curTile = getTile(cleared, cur);
        const curOpen = getOpenSides(curTile);
        for (const dir of curOpen) {
            const { dr, dc } = dirDelta(dir);
            const nxt = { r: cur.r + dr, c: cur.c + dc };
            if (!inBounds(cleared, nxt))
                continue;
            const nxtTile = getTile(cleared, nxt);
            if (nxtTile.type === 'empty')
                continue;
            const nxtOpen = getOpenSides(nxtTile);
            if (!nxtOpen.has(oppositeDir(dir)))
                continue;
            const key = posKey(nxt);
            if (overloadedKeys.has(key))
                continue; // overloaded tiles do not conduct
            if (poweredVisited.has(key))
                continue;
            poweredVisited.add(key);
            q2.push(nxt);
        }
    }
    const solvedBoard = cleared.map((row, r) => row.map((t, c) => {
        if (t.type === 'empty')
            return t;
        const key = `${r},${c}`;
        const overloaded = overloadedKeys.has(key);
        const powered = !overloaded && poweredVisited.has(key);
        if (t.powered === powered && (t.overloaded === true) === overloaded)
            return t;
        return { ...t, powered, overloaded: overloaded ? true : undefined };
    }));
    const reactorPowered = reactorPos ? poweredVisited.has(posKey(reactorPos)) : false;
    return { board: solvedBoard, poweredKeys: poweredVisited, reactorPowered, generatorPos, reactorPos };
}
function findFirst(board, predicate) {
    for (let r = 0; r < board.length; r++) {
        for (let c = 0; c < board[r].length; c++) {
            if (predicate(board[r][c]))
                return { r, c };
        }
    }
    return null;
}
