import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function VictoryModal({ open, moves, timeText, onRestart, onNext }) {
    if (!open)
        return null;
    return (_jsx("div", { className: "modalOverlay", children: _jsxs("div", { className: "modal", children: [_jsxs("div", { className: "modalHeader", children: [_jsx("h2", { className: "modalTitle", children: "Reactor online!" }), _jsxs("div", { className: "modalStats", children: [_jsxs("div", { className: "statRow", children: [_jsx("span", { className: "statLabel", children: "Moves" }), _jsx("strong", { className: "statValue", children: moves })] }), _jsxs("div", { className: "statRow", children: [_jsx("span", { className: "statLabel", children: "Time" }), _jsx("strong", { className: "statValue", children: timeText })] })] })] }), _jsxs("div", { className: "modalButtons", children: [_jsx("button", { type: "button", className: "btn", onClick: onRestart, children: "Restart" }), _jsx("button", { type: "button", className: "btn primary", onClick: onNext, children: "Next level" })] })] }) }));
}
