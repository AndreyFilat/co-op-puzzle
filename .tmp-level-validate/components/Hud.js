import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function Hud({ levelName, errorMessage, timeText, onRestart, onNext, hideControls, }) {
    return (_jsxs("header", { className: "hud", children: [_jsxs("div", { className: "hud__meta", children: [_jsx("h1", { className: "hud__title", children: levelName }), errorMessage ? _jsx("div", { className: "hud__error", children: errorMessage }) : null, _jsxs("div", { className: "hud__time", children: [_jsx("span", { children: "Time" }), _jsx("strong", { children: timeText })] })] }), _jsxs("div", { className: "hud__actions", style: {
                    visibility: hideControls ? 'hidden' : 'visible',
                    pointerEvents: hideControls ? 'none' : 'auto',
                }, children: [_jsx("button", { type: "button", className: "button", onClick: onRestart, children: "Restart" }), _jsx("button", { type: "button", className: "button button--primary", onClick: onNext, children: "Next level" })] })] }));
}
