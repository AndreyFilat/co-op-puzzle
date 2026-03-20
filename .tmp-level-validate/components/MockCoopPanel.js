import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { PLAYER_ACTION_COOLDOWN_MS } from '../room/roomReducer';
export function MockCoopPanel({ players, recent, currentPlayerId, nowMs }) {
    const sortedPlayers = [...players].sort((a, b) => {
        if (a.id === currentPlayerId && b.id !== currentPlayerId)
            return -1;
        if (b.id === currentPlayerId && a.id !== currentPlayerId)
            return 1;
        return 0;
    });
    function displayPlayerName(name) {
        const m = name.match(/^Player\s+(\d+)/);
        if (m)
            return `Player ${m[1]}`;
        if (name.length <= 14)
            return name;
        return name.slice(0, 10) + '…';
    }
    const recentItems = recent.slice(0, 5);
    return (_jsxs("aside", { className: "coop", children: [_jsxs("div", { className: "coopHeader", children: [_jsx("div", { className: "coopTitle", children: "Players" }), _jsxs("div", { className: "coopSub", children: [players.length, " connected"] })] }), _jsx("div", { className: "coopPlayers", children: sortedPlayers.map((p) => {
                    const isYou = p.id === currentPlayerId;
                    return (_jsxs("div", { className: `player${isYou ? ' playerMe' : ''}`, children: [_jsx("div", { className: "avatar", "aria-hidden": "true", style: { background: p.color } }), _jsxs("div", { className: "playerText", children: [_jsxs("div", { className: "playerName", children: [displayPlayerName(p.name), isYou && _jsx("span", { className: "playerYou", children: " (You)" })] }), (() => {
                                        const last = p.lastActionAtMs;
                                        const remainingMs = last == null ? 0 : Math.max(0, PLAYER_ACTION_COOLDOWN_MS - (nowMs - last));
                                        const status = remainingMs > 0 ? `${(remainingMs / 1000).toFixed(1)}s` : 'Ready';
                                        return (_jsx(_Fragment, { children: _jsx("div", { className: "playerStatus", children: status }) }));
                                    })()] })] }, p.id));
                }) }), _jsxs("div", { className: "coopFeed", children: [_jsx("div", { className: "coopFeedTitle", children: "Recent" }), _jsx("div", { className: "feedList", children: recentItems.map((item) => (_jsx("div", { className: "feedItem", style: { padding: '6px 8px' }, children: item.text }, item.id))) })] })] }));
}
