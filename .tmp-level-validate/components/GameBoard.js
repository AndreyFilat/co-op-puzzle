import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { TileView } from './TileView';
export function GameBoard({ board, solutionPathKeys, debugShowSolution, recentActions, nowMs, players, onTileClick, onPingTile, winAnimation, }) {
    if (!board || board.length === 0) {
        return _jsx("div", { className: "boardWrap", children: "Board missing" });
    }
    const size = board.length;
    const reactorPowered = board.some((row) => row.some((t) => t.type === 'reactor' && t.powered));
    function recentMetaForTile(pos) {
        const cutoff = nowMs - 1800;
        return recentActions
            .filter((a) => a.pos && a.pos.r === pos.r && a.pos.c === pos.c && a.atMs >= cutoff)
            .at(-1);
    }
    return (_jsxs("div", { className: "boardWrap", style: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 10,
            paddingBottom: 12,
            width: '100%',
            boxSizing: 'border-box',
        }, children: [_jsx("div", { className: "board", style: {
                    display: 'grid',
                    gridTemplateColumns: `repeat(${size}, var(--cell, 56px))`,
                    // Scale tiles to better fill the desktop viewport; clamp keeps it responsive.
                    // All sizing is driven by --cell which TileView already uses.
                    ['--cell']: 'clamp(42px, 8.2vw, 86px)',
                    gap: 5,
                    justifyContent: 'center',
                    padding: 10,
                    maxWidth: '100%',
                    borderRadius: 14,
                    background: 'rgba(0,0,0,0.15)',
                    border: '1px solid rgba(255,255,255,0.10)',
                }, children: board.map((row, r) => row.map((tile, c) => (_jsx(TileView, { tile: tile, pos: { r, c }, nowMs: nowMs, recentMeta: recentMetaForTile({ r, c }), inSolution: debugShowSolution && solutionPathKeys.has(`${r},${c}`), reactorPowered: reactorPowered, players: players, onClick: onTileClick, onPing: onPingTile, winAnimation: winAnimation }, `${r}-${c}`)))) }), _jsx("div", { className: "boardHint", children: "Route energy from the generator to the reactor." })] }));
}
