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
  const isOverloaded = tile.overloaded === true

  // Visual hierarchy: make "shape" tiles easier to distinguish at a glance.
  // This only affects drawing sizes/weights, not connectivity logic.
  const lineBoost = tile.type === 'corner' ? 0.9 : tile.type === 'tee' ? 1.35 : tile.type === 'cross' ? 1.8 : 0
  const nodeBoost = tile.type === 'corner' ? 1.2 : tile.type === 'tee' ? 2.1 : tile.type === 'cross' ? 3.2 : 0

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

  let connectorColor = '#9CA3AF' // unpowered neutral (friendly, readable)
  if (isGenerator) {
    connectorColor = poweredPath ? '#44D7FF' : '#8B8697'
  } else if (isReactor) {
    connectorColor = chainSolved ? '#D39BFF' : '#8B8697'
  } else if (poweredPath) {
    connectorColor = chainSolved ? '#44D7FF' : '#7DD3FC'
  }

  // Extra "toy-like" layering for connectors: an edge/shadow plus a brighter inner highlight.
  // Rendering-only (no gameplay/state changes).
  const connectorHighlightColor = poweredPath
    ? isReactor
      ? 'rgba(245,205,255,0.98)'
      : isGenerator
        ? 'rgba(185,247,255,0.98)'
        : 'rgba(185,247,255,0.86)'
    : 'rgba(255,255,255,0.38)'

  const effectiveConnectorHighlightColor = isOverloaded ? 'rgba(255,198,143,0.98)' : connectorHighlightColor
  if (isOverloaded) {
    connectorColor = '#F97316' // overload: red/orange overheated tint
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

  const baseBoxShadow = (() => {
    if (poweredPath && !isGenerator && !isReactor) {
      return chainSolved ? '0 0 26px rgba(56,189,248,0.38)' : '0 0 18px rgba(56,189,248,0.22)'
    }
    if (poweredPath && (isGenerator || isReactor)) {
      return 'inset 0 0 0 1px rgba(255,255,255,0.06), inset 0 10px 18px rgba(0,0,0,0.20), 0 0 18px rgba(255,255,255,0.08)'
    }
    if (!isEmpty) {
      // Unpowered tiles still get a soft inner depth so frames don't look flat/technical.
      return 'inset 0 0 0 1px rgba(255,255,255,0.06), inset 0 6px 14px rgba(255,255,255,0.03)'
    }
    return 'none'
  })()

  const overlayShadow =
    poweredPath && overlayStrength > 0.02
      ? isReactor
        ? `0 0 ${16 + overlayStrength * 28}px rgba(211,155,255,${overlayAlpha})`
        : `0 0 ${16 + overlayStrength * 28}px rgba(68,215,255,${overlayAlpha})`
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
        ? `drop-shadow(0 0 ${18 + overlayStrength * 22}px rgba(211,155,255,${0.28 + overlayStrength * 0.55}))`
        : `drop-shadow(0 0 ${18 + overlayStrength * 22}px rgba(68,215,255,${0.28 + overlayStrength * 0.55}))`
      : ''

  const heldGlow = heldActive ? `drop-shadow(0 0 10px ${holderColor}55) drop-shadow(0 0 22px ${holderColor}33)` : ''
  const filterValue = poweredPath
    ? `${glow}${overlayFilter ? ' ' + overlayFilter : ''}${heldGlow ? ' ' + heldGlow : ''}`
    : heldGlow || 'none'

  // Cartoony tile "game piece" surface: soft gloss + bevel + vignette frame.
  const cellBackground = (() => {
    if (tile.type === 'empty') return 'transparent'

    if (isOverloaded) {
      return [
        'linear-gradient(180deg, rgba(255,255,255,0.10), rgba(0,0,0,0.26))',
        'radial-gradient(circle at 50% 30%, rgba(249,115,22,0.28), rgba(0,0,0,0) 62%)',
        'radial-gradient(circle at 50% 80%, rgba(251,146,60,0.16), rgba(0,0,0,0) 70%)',
      ].join(', ')
    }

    const gloss = 'radial-gradient(circle at 50% 15%, rgba(255,255,255,0.16), rgba(0,0,0,0) 55%)'
    const bottomBevel = 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0.22))'
    const frameVignette =
      'radial-gradient(circle at 50% 50%, rgba(0,0,0,0) 58%, rgba(0,0,0,0.30) 100%)'

    if (poweredPath) {
      if (tile.type === 'reactor') {
        return [
          gloss,
          bottomBevel,
          `radial-gradient(circle at 50% 45%, ${chainSolved ? 'rgba(211,155,255,0.26)' : 'rgba(211,155,255,0.16)'}, rgba(0,0,0,0) 64%)`,
          frameVignette,
        ].join(', ')
      }
      if (tile.type === 'generator') {
        return [
          gloss,
          bottomBevel,
          `radial-gradient(circle at 50% 45%, ${chainSolved ? 'rgba(68,215,255,0.28)' : 'rgba(68,215,255,0.18)'}, rgba(0,0,0,0) 64%)`,
          frameVignette,
        ].join(', ')
      }

      return [
        gloss,
        bottomBevel,
        `radial-gradient(circle at 50% 45%, ${chainSolved ? 'rgba(68,215,255,0.18)' : 'rgba(125,211,252,0.13)'}, rgba(0,0,0,0) 64%)`,
        frameVignette,
      ].join(', ')
    }

    // Unpowered: keep it readable and friendly, but not energy-bright.
    if (tile.type === 'reactor') {
      return [gloss, bottomBevel, 'radial-gradient(circle at 50% 45%, rgba(211,155,255,0.10), rgba(0,0,0,0) 70%)', frameVignette].join(
        ', ',
      )
    }
    if (tile.type === 'generator') {
      return [gloss, bottomBevel, 'radial-gradient(circle at 50% 45%, rgba(68,215,255,0.10), rgba(0,0,0,0) 70%)', frameVignette].join(
        ', ',
      )
    }
    // Regular tiles: subtle neutral face.
    return [gloss, bottomBevel, 'radial-gradient(circle at 50% 45%, rgba(255,255,255,0.05), rgba(0,0,0,0) 74%)', frameVignette].join(', ')
  })()

  const cellStyle: CSSProperties = {
    width: 'var(--cell, 56px)',
    height: 'var(--cell, 56px)',
    padding: 0,
    margin: 0,
    border:
      tile.type === 'empty'
        ? '1px solid rgba(255,255,255,0.08)'
        : isOverloaded
          ? '1px solid rgba(249,115,22,0.62)'
        : poweredPath
          ? chainSolved
            ? '1px solid rgba(56,189,248,0.58)'
            : '1px solid rgba(125,211,252,0.38)'
          : tile.type === 'generator'
            ? '1px solid rgba(56,189,248,0.22)'
            : tile.type === 'reactor'
              ? '1px solid rgba(192,132,252,0.18)'
              : '1px solid rgba(255,255,255,0.09)',
    borderRadius: 10,
    background: cellBackground,
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
            {segs.map((s, i) => {
              const segPowered = powered || isOverloaded
              const mainStroke = segPowered ? 15 + overlayStrength * 7 + lineBoost : 11 + lineBoost
              const mainOpacity = segPowered ? 0.96 + overlayStrength * 0.12 : 0.84
              const edgeOpacity = segPowered ? 0.28 : 0.22
              const highlightWidth = Math.max(2.5, mainStroke * 0.42)
              const highlightOpacity = segPowered ? 0.55 + overlayStrength * 0.20 : 0.28

              // Beads simulate chunky rounded pipe ends.
              const beadR = segPowered ? 4.9 + overlayStrength * 2.1 : 3.9
              const beadOpacity = segPowered ? 0.99 : 0.84
              return (
                <g key={i}>
                  {/* Edge/shadow for toy-like 3D mass */}
                  <line
                    x1={s.x1}
                    y1={s.y1}
                    x2={s.x2}
                    y2={s.y2}
                    stroke="rgba(0,0,0,0.65)"
                    strokeWidth={mainStroke + 4.5}
                    strokeOpacity={edgeOpacity}
                    strokeLinecap="round"
                  />
                  <line
                    x1={s.x1}
                    y1={s.y1}
                    x2={s.x2}
                    y2={s.y2}
                    stroke={connectorColor}
                    strokeWidth={mainStroke}
                    strokeOpacity={mainOpacity}
                    strokeLinecap="round"
                  />
                  {/* Inner highlight to make conduits feel chunky and glossy */}
                  <line
                    x1={s.x1}
                    y1={s.y1}
                    x2={s.x2}
                    y2={s.y2}
                    stroke={effectiveConnectorHighlightColor}
                    strokeWidth={highlightWidth}
                    strokeOpacity={highlightOpacity}
                    strokeLinecap="round"
                  />
                  {/* Rounded "bead" end-caps (both ends) */}
                  <circle
                    cx={s.x1}
                    cy={s.y1}
                    r={beadR}
                    fill={connectorColor}
                    opacity={beadOpacity}
                  />
                  <circle
                    cx={s.x2}
                    cy={s.y2}
                    r={beadR}
                    fill={connectorColor}
                    opacity={beadOpacity}
                  />
                </g>
              )
            })}
            <circle
              cx="50"
              cy="50"
              r={powered || isOverloaded ? 13 + overlayStrength * 3 + nodeBoost : 10 + nodeBoost}
              fill={connectorColor}
              opacity={powered || isOverloaded ? 0.92 + overlayStrength * 0.14 : 0.78}
            />

            {/* Glossy center hub so junctions/corners read as toy pieces. */}
            <circle
              cx="50"
              cy="50"
              r={powered || isOverloaded ? 7 + overlayStrength * 1.2 + nodeBoost * 0.2 : 5.4 + nodeBoost * 0.2}
              fill={
                isOverloaded ? 'rgba(249,115,22,0.20)' : poweredPath ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.10)'
              }
              opacity={powered || isOverloaded ? 0.55 + overlayStrength * 0.25 : 0.28}
            />
            <circle
              cx="50"
              cy="50"
              r={powered || isOverloaded ? 3.8 + overlayStrength * 0.8 : 2.8}
              fill={
                isOverloaded ? 'rgba(249,115,22,0.45)' : poweredPath ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.35)'
              }
              opacity={powered || isOverloaded ? 0.26 + overlayStrength * 0.22 : 0.12}
            />

            {/* Shape hint for straight/corner/T/cross tiles (drawing-only). */}
            {tile.type === 'straight' ||
            tile.type === 'corner' ||
            tile.type === 'tee' ||
            tile.type === 'cross' ? (
              (() => {
                const prongOpacity = poweredPath ? 0.44 : 0.22
                const prongStrokeColor = poweredPath ? connectorColor : 'rgba(160,174,192,0.95)'
                const prongStrokeWidth = poweredPath ? 4 + lineBoost * 0.5 : 3.4 + lineBoost * 0.35
                function prongEnd(d: Direction): { x: number; y: number } {
                  switch (d) {
                    case 'N':
                      return { x: 50, y: 40 }
                    case 'E':
                      return { x: 60, y: 50 }
                    case 'S':
                      return { x: 50, y: 60 }
                    case 'W':
                      return { x: 40, y: 50 }
                  }
                }
                return (
                  <>
                    {[...open].map((d) => {
                      const end = prongEnd(d)
                      return (
                        <line
                          key={d}
                          x1={50}
                          y1={50}
                          x2={end.x}
                          y2={end.y}
                          stroke={prongStrokeColor}
                          strokeWidth={prongStrokeWidth}
                          strokeLinecap="round"
                          opacity={prongOpacity}
                        />
                      )
                    })}
                    {tile.type === 'corner' ? (() => {
                      // Rounded inner arc to make the L-shape read as a smooth turn.
                      if (open.has('N') && open.has('E')) {
                        return (
                          <path
                            d="M50 40 A12 12 0 0 1 60 50"
                            fill="none"
                            stroke={prongStrokeColor}
                            strokeWidth={prongStrokeWidth}
                            strokeLinecap="round"
                            opacity={prongOpacity}
                          />
                        )
                      }
                      if (open.has('E') && open.has('S')) {
                        return (
                          <path
                            d="M60 50 A12 12 0 0 1 50 60"
                            fill="none"
                            stroke={prongStrokeColor}
                            strokeWidth={prongStrokeWidth}
                            strokeLinecap="round"
                            opacity={prongOpacity}
                          />
                        )
                      }
                      if (open.has('S') && open.has('W')) {
                        return (
                          <path
                            d="M50 60 A12 12 0 0 1 40 50"
                            fill="none"
                            stroke={prongStrokeColor}
                            strokeWidth={prongStrokeWidth}
                            strokeLinecap="round"
                            opacity={prongOpacity}
                          />
                        )
                      }
                      if (open.has('W') && open.has('N')) {
                        return (
                          <path
                            d="M40 50 A12 12 0 0 1 50 40"
                            fill="none"
                            stroke={prongStrokeColor}
                            strokeWidth={prongStrokeWidth}
                            strokeLinecap="round"
                            opacity={prongOpacity}
                          />
                        )
                      }
                      return null
                    })() : null}
                  </>
                )
              })()
            ) : null}
          </g>
          {isOverloaded && !isEmpty && (
            <g className="overloadCracks" opacity="0.95">
              <path
                d="M30 30 L70 70"
                stroke="rgba(249,115,22,0.95)"
                strokeWidth="7"
                strokeLinecap="round"
              />
              <path
                d="M70 30 L30 70"
                stroke="rgba(249,115,22,0.95)"
                strokeWidth="7"
                strokeLinecap="round"
                opacity="0.85"
              />
            </g>
          )}
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
                r="28"
                fill={winAnimActive ? 'rgba(68,215,255,0.14)' : 'rgba(68,215,255,0.08)'}
                stroke="#44D7FF"
                strokeWidth={winAnimActive ? 2.5 : 2.0}
                opacity="0.95"
              />
              <circle
                cx="50"
                cy="50"
                r="24"
                fill={
                  winAnimActive && (winGeneratorPulseActive || overlayStrength > 0.35)
                    ? 'rgba(68,215,255,0.72)'
                    : 'rgba(68,215,255,0.42)'
                }
                stroke="#44D7FF"
                strokeWidth={
                  winAnimActive && (winGeneratorPulseActive || overlayStrength > 0.35) ? 7.2 : 6.3
                }
              />
              <circle
                cx="50"
                cy="50"
                r={winAnimActive && (winGeneratorPulseActive || overlayStrength > 0.35) ? 14 : 11.5}
                fill="#44D7FF"
                opacity={winAnimActive ? 0.98 : 0.92}
              />

              {/* Layered "battery core" rings */}
              <circle
                cx="50"
                cy="50"
                r="17.2"
                fill="none"
                stroke="#44D7FF"
                strokeWidth={poweredPath ? 3.8 : 3.1}
                opacity={poweredPath ? 0.85 : 0.42}
              />
              <circle
                cx="50"
                cy="50"
                r={poweredPath ? 9.6 : 8.1}
                fill={poweredPath ? 'rgba(125,211,252,0.72)' : 'rgba(125,211,252,0.36)'}
                opacity={poweredPath ? 0.96 : 0.62}
              />
              <circle
                cx="50"
                cy="50"
                r={poweredPath ? 5.8 : 4.7}
                fill={poweredPath ? 'rgba(255,255,255,0.58)' : 'rgba(255,255,255,0.30)'}
                opacity={poweredPath ? 0.65 : 0.40}
              />

              {/* Cartoon energy petals */}
              <g
                opacity={winAnimActive || poweredPath ? 0.98 : 0.70}
                style={{
                  animation: poweredPath ? 'energyFlowPulse 1.25s ease-in-out infinite' : undefined,
                  transformOrigin: '50px 50px',
                }}
              >
                <path d="M50 18 C58 24 58 32 50 38 C42 32 42 24 50 18" fill="none" stroke="#44D7FF" strokeWidth="4.3" strokeLinecap="round" />
                <path d="M82 50 C76 42 68 42 62 50 C68 58 76 58 82 50" fill="none" stroke="#44D7FF" strokeWidth="4.3" strokeLinecap="round" />
                <path d="M50 82 C42 76 42 68 50 62 C58 68 58 76 50 82" fill="none" stroke="#44D7FF" strokeWidth="4.3" strokeLinecap="round" />
                <path d="M18 50 C24 58 32 58 38 50 C32 42 24 42 18 50" fill="none" stroke="#44D7FF" strokeWidth="4.3" strokeLinecap="round" />
              </g>
            </g>
          )}
          {tile.type === 'reactor' && (
            <g
              className="glyph reactor"
              style={{
                animation: poweredPath ? 'energyFlowPulse 0.9s ease-in-out infinite' : undefined,
                transformOrigin: '50px 50px',
              }}
            >
              <circle
                cx="50"
                cy="50"
                r="28"
                fill={winAnimActive ? 'rgba(211,155,255,0.12)' : 'rgba(211,155,255,0.07)'}
                stroke="#D39BFF"
                strokeWidth={winAnimActive ? 2.4 : 1.9}
                opacity="0.95"
              />
              <circle
                cx="50"
                cy="50"
                r="24"
                fill={
                  winAnimActive && (winReactorFlashActive || overlayStrength > 0.35)
                    ? 'rgba(211,155,255,0.76)'
                    : poweredPath
                      ? 'rgba(211,155,255,0.58)'
                      : 'rgba(211,155,255,0.18)'
                }
                stroke="#D39BFF"
                strokeWidth={
                  winAnimActive && (winReactorFlashActive || overlayStrength > 0.35)
                    ? 6.2
                    : poweredPath
                      ? 6.0
                      : 4.9
                }
              />
              <circle
                cx="50"
                cy="50"
                r={
                  winAnimActive && (winReactorFlashActive || overlayStrength > 0.35)
                    ? 23
                    : poweredPath
                      ? 19
                      : 15
                }
                fill="#D39BFF"
                opacity="0.98"
              />

              {/* Reactor chamber shell rings */}
              <circle
                cx="50"
                cy="50"
                r="20.8"
                fill="none"
                stroke="#D39BFF"
                strokeWidth={poweredPath ? 4.2 : 3.1}
                opacity={poweredPath ? 0.86 : 0.40}
              />
              <circle
                cx="50"
                cy="50"
                r="15.8"
                fill="none"
                stroke={poweredPath ? 'rgba(245,205,255,0.55)' : 'rgba(245,205,255,0.25)'}
                strokeWidth={poweredPath ? 3.1 : 2.3}
                strokeDasharray="4 6"
                opacity={poweredPath ? 0.95 : 0.55}
              />

              {/* Reactor crystal core (hero destination) */}
              <g opacity={poweredPath ? 0.98 : 0.75}>
                <path
                  d="M50 30 L58 42 L50 58 L42 42 Z"
                  fill={poweredPath ? 'rgba(211,155,255,0.70)' : 'rgba(211,155,255,0.34)'}
                />
                <path
                  d="M50 34 L55 42 L50 49 L45 42 Z"
                  fill={poweredPath ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.12)'}
                  opacity={poweredPath ? 1 : 0.85}
                />
                <line x1="50" y1="18" x2="50" y2="30" stroke="#FFFFFF" strokeOpacity={poweredPath ? 0.28 : 0.14} strokeWidth="3.2" strokeLinecap="round" />
                <path
                  d="M33 50 Q50 40 67 50"
                  fill="none"
                  stroke={poweredPath ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.10)'}
                  strokeWidth="3.2"
                  strokeLinecap="round"
                />
              </g>
            </g>
          )}
        </svg>
      )}
    </button>
  )
}

