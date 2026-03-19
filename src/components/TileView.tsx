import type { Direction, Pos, Tile } from '../game/types'
import type { RecentAction, RoomPlayer } from '../room/types'
import { getOpenSides, posKey } from '../game/tileUtils'
import type { CSSProperties } from 'react'

type Props = {
  tile: Tile
  pos: Pos
  inSolution?: boolean
  nowMs: number
  reactorPowered: boolean
  players: ReadonlyArray<RoomPlayer>
  onClick: (pos: Pos) => void
  onPing: (pos: Pos) => void
  recentMeta?: RecentAction
  winAnimation?:
    | Readonly<{
        active: boolean
        pathKeys: ReadonlyArray<string>
        pathIndexByKey: Readonly<Record<string, number>>
        wavePos: number
        generatorPulse: boolean
        reactorFlash: boolean
        generatorKey: string | null
        reactorKey: string | null
      }>
}

function shortPos(pos: Pos): string {
  const col = String.fromCharCode('A'.charCodeAt(0) + pos.c)
  return `${col}${pos.r + 1}`
}

function pathSegments(sides: ReadonlySet<Direction>) {
  const segs: Array<{ x1: number; y1: number; x2: number; y2: number }> = []
  const cx = 50
  const cy = 50
  const edge = 12
  for (const d of sides) {
    switch (d) {
      case 'N':
        segs.push({ x1: cx, y1: cy, x2: cx, y2: edge })
        break
      case 'E':
        segs.push({ x1: cx, y1: cy, x2: 100 - edge, y2: cy })
        break
      case 'S':
        segs.push({ x1: cx, y1: cy, x2: cx, y2: 100 - edge })
        break
      case 'W':
        segs.push({ x1: cx, y1: cy, x2: edge, y2: cy })
        break
    }
  }
  return segs
}

export function TileView({
  tile,
  pos,
  inSolution,
  nowMs,
  reactorPowered,
  players,
  onClick,
  onPing,
  recentMeta,
  winAnimation,
}: Props) {
  const isEmpty = tile.type === 'empty'
  const open = isEmpty ? new Set<Direction>() : getOpenSides(tile)
  const segs = pathSegments(open)

  const clickable = tile.rotatable && !tile.locked && tile.type !== 'empty'

  const powered = tile.powered
  const isGenerator = tile.type === 'generator'
  const isReactor = tile.type === 'reactor'

  const chainSolved = reactorPowered
  const poweredPath = powered && !isEmpty

  const isSyncTile = tile.type === 'sync_tile'
  const heldByPlayerId = isSyncTile ? tile.heldByPlayerId : undefined
  const heldUntilMs = isSyncTile ? tile.heldUntilMs : undefined
  const heldActive = isSyncTile && heldByPlayerId != null && heldUntilMs != null && nowMs <= heldUntilMs
  const holder = heldByPlayerId != null ? players.find((p) => p.id === heldByPlayerId) : undefined
  const holderColor = holder?.color ?? '#A78BFA'

  const winAnimActive = winAnimation?.active ?? false
  const tileKey = posKey(pos)
  const tileIdx = winAnimActive ? winAnimation?.pathIndexByKey[tileKey] : undefined
  const wavePos = winAnimation?.wavePos ?? 0
  const WAVE_SIGMA = 0.55
  const overlayStrength =
    winAnimActive && tileIdx != null ? Math.exp(-Math.pow(tileIdx - wavePos, 2) / (2 * WAVE_SIGMA * WAVE_SIGMA)) : 0

  let connectorColor = '#8B8697'
  if (isGenerator) {
    connectorColor = poweredPath ? '#38BDF8' : '#8B8697'
  } else if (isReactor) {
    connectorColor = chainSolved ? '#C084FC' : '#8B8697'
  } else if (poweredPath) {
    connectorColor = chainSolved ? '#38BDF8' : '#7DD3FC'
  }

  const glow = poweredPath
    ? chainSolved
      ? `drop-shadow(0 0 14px ${connectorColor}AA) drop-shadow(0 0 28px ${connectorColor}55)`
      : `drop-shadow(0 0 10px ${connectorColor}66) drop-shadow(0 0 20px ${connectorColor}33)`
    : 'none'

  const overlayAlpha = 0.18 + overlayStrength * 0.42

  const recentKindIsRotate = recentMeta?.kind === 'rotate'
  const playerColor = recentMeta?.playerColor
  const actionAtMs = recentMeta?.atMs

  const highlightActive =
    recentKindIsRotate &&
    playerColor != null &&
    actionAtMs != null &&
    nowMs - actionAtMs >= 0 &&
    nowMs - actionAtMs <= 700

  function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const m = hex.trim().match(/^#([0-9a-fA-F]{6})$/)
    if (!m) return null
    const v = m[1]!
    return {
      r: parseInt(v.slice(0, 2), 16),
      g: parseInt(v.slice(2, 4), 16),
      b: parseInt(v.slice(4, 6), 16),
    }
  }

  const highlightRemainingMs = highlightActive ? 700 - (nowMs - (actionAtMs ?? 0)) : 0
  const highlightT = highlightActive ? Math.max(0, highlightRemainingMs / 700) : 0
  const highlightRgb = highlightActive && playerColor != null ? hexToRgb(playerColor) : null
  const highlightBoost = isSyncTile ? 0.18 : 0
  const highlightRgba = highlightRgb
    ? `rgba(${highlightRgb.r},${highlightRgb.g},${highlightRgb.b},${0.20 + highlightT * 0.35 + highlightBoost})`
    : 'rgba(170,59,255,0.35)'

  const classes = [
    'tile',
    `t-${tile.type}`,
    tile.powered ? 'powered' : '',
    clickable ? 'clickable' : '',
    tile.locked ? 'locked' : '',
    inSolution ? 'solution' : '',
    recentMeta?.kind === 'rotate' ? 'touched' : '',
    recentMeta?.kind === 'ping' ? 'pinged' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const baseBoxShadow =
    poweredPath && !isGenerator && !isReactor
      ? chainSolved
        ? '0 0 26px rgba(56,189,248,0.38)'
        : '0 0 18px rgba(56,189,248,0.22)'
      : isGenerator
        ? chainSolved
          ? '0 0 22px rgba(56,189,248,0.40)'
          : '0 0 14px rgba(56,189,248,0.20)'
        : isReactor
          ? chainSolved
            ? '0 0 26px rgba(192,132,252,0.50)'
            : '0 0 14px rgba(192,132,252,0.22)'
          : 'none'

  const overlayShadow =
    poweredPath && overlayStrength > 0.02
      ? isReactor
        ? `0 0 ${16 + overlayStrength * 28}px rgba(192,132,252,${overlayAlpha})`
        : `0 0 ${16 + overlayStrength * 28}px rgba(56,189,248,${overlayAlpha})`
      : ''

  const baseBoxShadowFinal = highlightActive
    ? `0 0 0 2px ${highlightRgba}, 0 0 ${12 + highlightT * 18}px ${highlightRgba}`
    : overlayShadow
      ? baseBoxShadow === 'none'
        ? overlayShadow
        : `${baseBoxShadow}, ${overlayShadow}`
      : baseBoxShadow

  const syncHeldBoxShadow = heldActive ? `0 0 0 2px ${holderColor}66, 0 0 28px ${holderColor}55` : 'none'
  const boxShadow = heldActive ? (baseBoxShadowFinal === 'none' ? syncHeldBoxShadow : `${baseBoxShadowFinal}, ${syncHeldBoxShadow}`) : baseBoxShadowFinal

  const winReactorFlashActive = winAnimActive && !!winAnimation?.reactorFlash && isReactor
  const winGeneratorPulseActive = winAnimActive && !!winAnimation?.generatorPulse && isGenerator

  const overlayFilter =
    poweredPath && overlayStrength > 0.03
      ? isReactor
        ? `drop-shadow(0 0 ${18 + overlayStrength * 22}px rgba(192,132,252,${0.28 + overlayStrength * 0.55}))`
        : `drop-shadow(0 0 ${18 + overlayStrength * 22}px rgba(56,189,248,${0.28 + overlayStrength * 0.55}))`
      : ''

  const heldGlow = heldActive ? `drop-shadow(0 0 10px ${holderColor}55) drop-shadow(0 0 22px ${holderColor}33)` : ''
  const filterValue = poweredPath
    ? `${glow}${overlayFilter ? ' ' + overlayFilter : ''}${heldGlow ? ' ' + heldGlow : ''}`
    : heldGlow || 'none'

  const cellStyle: CSSProperties = {
    width: 'var(--cell, 56px)',
    height: 'var(--cell, 56px)',
    padding: 0,
    margin: 0,
    border:
      tile.type === 'empty'
        ? '1px solid rgba(255,255,255,0.08)'
        : poweredPath
          ? chainSolved
            ? '1px solid rgba(56,189,248,0.55)'
            : '1px solid rgba(125,211,252,0.35)'
          : '1px solid rgba(255,255,255,0.10)',
    borderRadius: 8,
    // Keep the cell body clean/light; rely on connector graphics + glow for energy.
    background:
      tile.type === 'empty'
        ? 'transparent'
        : poweredPath
          ? tile.type === 'reactor'
            ? chainSolved
              ? 'rgba(192,132,252,0.10)'
              : 'rgba(192,132,252,0.06)'
            : tile.type === 'generator'
              ? chainSolved
                ? 'rgba(56,189,248,0.10)'
                : 'rgba(56,189,248,0.07)'
              : chainSolved
                ? 'rgba(56,189,248,0.07)'
                : 'rgba(125,211,252,0.05)'
          : 'rgba(255,255,255,0.012)',
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 1,
    transition: 'background 120ms ease, border-color 120ms ease, box-shadow 120ms ease',
    boxShadow,
  }

  return (
    <button
      type="button"
      className={classes}
      style={cellStyle}
      onClick={() => onClick(pos)}
      onContextMenu={(e) => {
        e.preventDefault()
        if (!winAnimActive) onPing(pos)
      }}
      aria-label={
        isEmpty
          ? `Empty ${shortPos(pos)}`
          : `${tile.type} ${shortPos(pos)}${clickable ? ', rotate' : ''}`
      }
      disabled={!clickable || winAnimActive}
    >
      {!isEmpty && (
        <svg
          className="tileSvg"
          viewBox="0 0 100 100"
          role="presentation"
          aria-hidden="true"
          style={{
            width: '100%',
            height: '100%',
            filter: filterValue,
            animation: heldActive
              ? 'energyFlowPulse 0.9s ease-in-out infinite'
              : poweredPath && overlayStrength > 0.14
                ? chainSolved
                  ? 'energyFlowPulse 1.05s ease-in-out infinite'
                  : 'energyFlowPulse 1.3s ease-in-out infinite'
                : undefined,
          }}
        >
          <g className="pipe">
            {segs.map((s, i) => (
              <line
                key={i}
                x1={s.x1}
                y1={s.y1}
                x2={s.x2}
                y2={s.y2}
                stroke={connectorColor}
                strokeWidth={powered ? 11 + overlayStrength * 5 : 7}
                strokeOpacity={powered ? 0.78 + overlayStrength * 0.22 : 0.55}
                strokeLinecap="round"
              />
            ))}
            <circle
              cx="50"
              cy="50"
              r={powered ? 11 + overlayStrength * 3 : 8}
              fill={connectorColor}
              opacity={powered ? 0.78 + overlayStrength * 0.22 : 0.65}
            />
          </g>
          {isSyncTile && (
            <g className="glyph sync">
              <circle
                cx="50"
                cy="50"
                r="16"
                fill={heldActive ? `${holderColor}22` : 'rgba(170,59,255,0.10)'}
                stroke={heldActive ? holderColor : 'rgba(170,59,255,0.35)'}
                strokeWidth={heldActive ? 4 : 3}
              />
              <circle cx="50" cy="50" r={heldActive ? 7.5 : 6} fill={heldActive ? holderColor : '#A78BFA'} opacity={heldActive ? 0.95 : 0.35} />
              {/* Simple "SYNC" glyph hint (kept minimal so connector lines stay readable). */}
              <path
                d="M43 52 L43 48 L47 48 L50 51 L53 48 L57 48 L57 52 L53 52 L50 55 L47 52 Z"
                fill={heldActive ? `${holderColor}` : 'rgba(170,59,255,0.55)'}
                opacity={heldActive ? 0.95 : 0.55}
              />
            </g>
          )}
          {tile.type === 'generator' && (
            <g className="glyph generator">
              <circle
                cx="50"
                cy="50"
                r="18"
                fill={
                  winAnimActive && (winGeneratorPulseActive || overlayStrength > 0.35)
                    ? 'rgba(56,189,248,0.55)'
                    : 'rgba(56,189,248,0.26)'
                }
                stroke="#38BDF8"
                strokeWidth={
                  winAnimActive && (winGeneratorPulseActive || overlayStrength > 0.35) ? 6 : 5.2
                }
              />
              <circle
                cx="50"
                cy="50"
                r={winAnimActive && (winGeneratorPulseActive || overlayStrength > 0.35) ? 10 : 9}
                fill="#38BDF8"
              />
            </g>
          )}
          {tile.type === 'reactor' && (
            <g className="glyph reactor">
              <circle
                cx="50"
                cy="50"
                r="18"
                fill={
                  winAnimActive && (winReactorFlashActive || overlayStrength > 0.35)
                    ? 'rgba(192,132,252,0.65)'
                    : 'rgba(192,132,252,0.46)'
                }
                stroke="#C084FC"
                strokeWidth={
                  winAnimActive && (winReactorFlashActive || overlayStrength > 0.35) ? 6 : 5.2
                }
              />
              <circle
                cx="50"
                cy="50"
                r={winAnimActive && (winReactorFlashActive || overlayStrength > 0.35) ? 18 : 16}
                fill="#C084FC"
                opacity="0.98"
              />
            </g>
          )}
        </svg>
      )}
    </button>
  )
}

