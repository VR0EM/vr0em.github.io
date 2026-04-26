// SVG canvas — pan/zoom, grid, nodes, containers, edges.
// Coordinates: doc coords are scaled by viewport.zoom and translated by viewport.x/y.
// We mount one <svg> filling the viewport; everything is drawn in a single <g>
// transformed by the current viewport.

const { useState, useRef, useEffect, useCallback, useMemo } = React;

const GRID = 16;
const snap = (v) => Math.round(v / GRID) * GRID;

// Convert a screen-space (clientX/Y relative to <svg>) point to doc coords.
function screenToDoc(svgEl, clientX, clientY, viewport) {
  const rect = svgEl.getBoundingClientRect();
  const sx = clientX - rect.left;
  const sy = clientY - rect.top;
  return {
    x: (sx - viewport.x) / viewport.zoom,
    y: (sy - viewport.y) / viewport.zoom,
  };
}

// ---------------- Node ----------------
// Renders via <foreignObject> so HTML+Tailwind handles wrapping and auto-sizing.
// After mount we measure the rendered box and report any size delta back via onMeasure.
function NodeView({ node, type, selected, onMouseDown, onClick, onMeasure }) {
  const accent = type?.color || TW.slate500;
  const iconName = type?.icon || "Box";
  const cardRef = React.useRef(null);

  React.useEffect(() => {
    const el = cardRef.current;
    // Skip auto-measurement when user has explicitly set a height.
    if (!el || !onMeasure || node.userHeight) return;
    const measure = () => {
      const h = Math.ceil(el.offsetHeight);
      // Width is always fixed at node.w — only report height changes.
      if (h !== node.h) onMeasure(node.id, node.w, h);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [node.id, node.label, node.subtitle, node.ip, node.w, node.h, node.userHeight, onMeasure]);

  // FO is just wide enough to hold the card — no large transparent hit area.
  const FO_W = node.w + 4;
  const FO_H = node.userHeight ? node.h + 4 : Math.max(200, node.h + 80);

  return (
    <g
      transform={`translate(${node.x}, ${node.y})`}
      onMouseDown={onMouseDown}
      onClick={onClick}
      style={{ cursor: "grab" }}
    >
      {/* Drop shadow — also acts as the SVG hit area for this node */}
      <rect
        x="0" y="2" width={node.w} height={node.h} rx="10"
        fill="rgba(15,23,42,0.08)"
      />
      {/* Selection ring */}
      {selected && (
        <rect
          x="-4" y="-4" width={node.w + 8} height={node.h + 8} rx="13"
          fill="none" stroke={accent} strokeWidth="2" strokeOpacity="0.45"
          style={{ pointerEvents: "none" }}
        />
      )}
      {/* pointerEvents:none on the FO prevents it acting as a large invisible SVG hit
          area; HTML content inside (card div with pointerEvents:auto) still fires events
          that bubble through the fiber tree to this <g>'s handlers. */}
      <foreignObject x="0" y="0" width={FO_W} height={FO_H} style={{ pointerEvents: "none" }}>
        <div xmlns="http://www.w3.org/1999/xhtml" style={{ width: node.w, pointerEvents: "none" }}>
          <div
            ref={cardRef}
            className="flex rounded-lg overflow-hidden bg-white select-none"
            style={{
              width: node.w,
              height: node.userHeight ? node.h : undefined,
              overflow: node.userHeight ? "hidden" : undefined,
              border: `${selected ? 2 : 1}px solid ${selected ? accent : TW.slate200}`,
              fontFamily: "Inter, sans-serif",
              pointerEvents: "auto",
              cursor: "grab",
            }}
          >
            {/* Accent bar */}
            <div style={{ width: 6, background: accent, flexShrink: 0 }} />
            <div className="flex-1 p-3 flex gap-2.5 items-start min-w-0">
              {/* Icon */}
              <div
                className="rounded-md flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ width: 24, height: 24, background: hexToRgba(accent, 0.12), color: accent }}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  {ICON_INNER[iconName] || ICON_INNER.Box}
                </svg>
              </div>
              {/* Text stack */}
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-slate-900 leading-snug truncate">
                  {node.label || ""}
                </div>
                {node.subtitle && (
                  <div
                    className="text-[11px] text-slate-500 leading-snug mt-0.5"
                    style={node.userHeight
                      ? { overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }
                      : { whiteSpace: "normal", wordBreak: "break-word" }
                    }
                  >
                    {node.subtitle}
                  </div>
                )}
                {node.ip && (
                  <div className="text-[10.5px] text-slate-400 mono leading-snug mt-1 truncate">
                    {node.ip}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </foreignObject>
    </g>
  );
}

// Inline SVG icon body — uses ICON_PATHS via the Icon component already defined.
// We render JUST the inner shapes (no <svg>) so they can be embedded.
function SvgIconInner({ name }) {
  // We can't reuse <Icon /> because it wraps in <svg>. Re-implement by reading ICON_PATHS via a hidden mapping.
  // Cheapest path: render an <Icon> at 16x16 — but inside an existing SVG we need the inner only.
  // Solution: use foreignObject? No — we'll re-export the inner paths.
  return ICON_INNER[name] || ICON_INNER.Box;
}

// Recreate the inner-only icon set (mirrors icons.jsx). Kept here so we render
// inside an existing <svg> root.
const ICON_INNER = {
  Shield: <path d="M8 14s5.33-2.67 5.33-6.67V3.33L8 1.33 2.67 3.33v4C2.67 11.33 8 14 8 14z" transform="scale(1)" />,
  ShieldCheck: <><path d="M8 14s5.33-2.67 5.33-6.67V3.33L8 1.33 2.67 3.33v4C2.67 11.33 8 14 8 14z"/><path d="m6 8 1.33 1.33L10.67 6"/></>,
  ShieldAlert: <><path d="M8 14s5.33-2.67 5.33-6.67V3.33L8 1.33 2.67 3.33v4C2.67 11.33 8 14 8 14z"/><path d="M8 5v3"/><path d="M8 10.67h.01"/></>,
  Eye: <><path d="M1.33 8s2-4.67 6.67-4.67S14.67 8 14.67 8s-2 4.67-6.67 4.67S1.33 8 1.33 8z"/><circle cx="8" cy="8" r="2"/></>,
  Radar: <><circle cx="8" cy="8" r="5.33"/><path d="M8 8l3-3"/><circle cx="8" cy="8" r="1.33"/></>,
  Filter: <path d="M2 4h12l-4.67 6v4l-2.67-1.33V10z"/>,
  Server: <><rect x="1.33" y="2" width="13.33" height="5.33" rx="1.33"/><rect x="1.33" y="8.67" width="13.33" height="5.33" rx="1.33"/><line x1="4" y1="4.67" x2="4.01" y2="4.67"/><line x1="4" y1="11.33" x2="4.01" y2="11.33"/></>,
  Database: <><ellipse cx="8" cy="3.33" rx="6" ry="2"/><path d="M2 3.33v9.33C2 13.77 4.69 14.67 8 14.67s6-0.9 6-2V3.33"/><path d="M2 8c0 1.1 2.69 2 6 2s6-0.9 6-2"/></>,
  Globe: <><circle cx="8" cy="8" r="6.67"/><path d="M1.33 8h13.33"/><path d="M8 1.33a10 10 0 0 1 0 13.33"/><path d="M8 1.33a10 10 0 0 0 0 13.33"/></>,
  Cloud: <path d="M11.67 12.67a3 3 0 1 0-1-5.85A4 4 0 0 0 3 9a2.67 2.67 0 0 0 1 3.67h7.67z"/>,
  Key: <><circle cx="5" cy="10.33" r="2.33"/><path d="m6.67 8.67 6-6"/><path d="m11.33 4 1.33 1.33"/><path d="m9.33 6 1.33 1.33"/></>,
  KeyRound: <><circle cx="5.33" cy="10" r="2.67"/><path d="m7.33 8 6-6"/><path d="m11.33 4 2 2"/><path d="m9.33 6 2 2"/></>,
  Network: <><rect x="6" y="1.33" width="4" height="4" rx="0.67"/><rect x="1.33" y="10.67" width="4" height="4" rx="0.67"/><rect x="10.67" y="10.67" width="4" height="4" rx="0.67"/><path d="M3.33 10.67v-2h9.33v2"/><path d="M8 5.33v3.33"/></>,
  Router: <><rect x="1.33" y="8.67" width="13.33" height="5.33" rx="1.33"/><circle cx="4" cy="11.33" r="0.33"/><circle cx="6.67" cy="11.33" r="0.33"/><path d="M6 8.67v-1.34a2 2 0 0 1 4 0v1.34"/></>,
  Cpu: <><rect x="2.67" y="2.67" width="10.67" height="10.67" rx="1.33"/><rect x="6" y="6" width="4" height="4"/><line x1="6" y1="1.33" x2="6" y2="2.67"/><line x1="10" y1="1.33" x2="10" y2="2.67"/><line x1="6" y1="13.33" x2="6" y2="14.67"/><line x1="10" y1="13.33" x2="10" y2="14.67"/><line x1="13.33" y1="6" x2="14.67" y2="6"/><line x1="13.33" y1="10" x2="14.67" y2="10"/><line x1="1.33" y1="6" x2="2.67" y2="6"/><line x1="1.33" y1="10" x2="2.67" y2="10"/></>,
  Box: <><path d="M14 10.67V5.33a1.33 1.33 0 0 0-0.67-1.16l-4.67-2.67a1.33 1.33 0 0 0-1.33 0L2.67 4.18A1.33 1.33 0 0 0 2 5.33v5.33a1.33 1.33 0 0 0 0.67 1.16l4.67 2.67a1.33 1.33 0 0 0 1.33 0l4.67-2.67A1.33 1.33 0 0 0 14 10.67z"/><polyline points="2.18 4.64 8 8 13.82 4.64"/><line x1="8" y1="14.72" x2="8" y2="8"/></>,
  Laptop: <><rect x="2" y="2.67" width="12" height="8" rx="1.33"/><line x1="1.33" y1="13.33" x2="14.67" y2="13.33"/></>,
  Smartphone: <><rect x="4" y="1.33" width="8" height="13.33" rx="1.33"/><line x1="7.33" y1="12" x2="8.67" y2="12"/></>,
  User: <><circle cx="8" cy="5.33" r="2.67"/><path d="M2.67 14a5.33 5.33 0 0 1 10.67 0"/></>,
  Users: <><circle cx="6" cy="5.33" r="2.67"/><path d="M1.33 14a4.67 4.67 0 0 1 9.33 0"/><path d="M10.67 2.67a2.67 2.67 0 0 1 0 5.33"/><path d="M14.67 14a4.67 4.67 0 0 0-3.33-4.47"/></>,
  Lock: <><rect x="2.67" y="7.33" width="10.67" height="6.67" rx="1.33"/><path d="M5.33 7.33V4.67a2.67 2.67 0 0 1 5.33 0v2.67"/></>,
  Activity: <polyline points="14.67 8 12 8 10 14 6 2 4 8 1.33 8"/>,
  Bug: <><circle cx="8" cy="9" r="3"/><path d="M8 12v-3"/><path d="M5 9H3"/><path d="M13 9h-2"/></>,
  GitBranch: <><line x1="4" y1="2" x2="4" y2="10"/><circle cx="12" cy="4" r="2"/><circle cx="4" cy="12" r="2"/><path d="M12 6a6 6 0 0 1-6 6"/></>,
  Share2: <><circle cx="12" cy="3.33" r="2"/><circle cx="4" cy="8" r="2"/><circle cx="12" cy="12.67" r="2"/><line x1="5.73" y1="9" x2="10.28" y2="11.66"/><line x1="10.28" y1="4.34" x2="5.73" y2="7"/></>,
  Layers: <><polygon points="8 1.33 1.33 4.67 8 8 14.67 4.67 8 1.33"/><polyline points="1.33 11.33 8 14.67 14.67 11.33"/><polyline points="1.33 8 8 11.33 14.67 8"/></>,
  Tag: <><path d="M13.73 8.94 8.94 13.73a1.33 1.33 0 0 1-1.89 0L1.33 8V1.33h6.67l5.73 5.73a1.33 1.33 0 0 1 0 1.88z"/><line x1="4.67" y1="4.67" x2="4.68" y2="4.67"/></>,
  Mail: <><rect x="1.33" y="2.67" width="13.33" height="10.67" rx="1.33"/><polyline points="14.67 4 8 8.67 1.33 4"/></>,
};

// ---------------- Container ----------------
function ContainerView({ container, selected, onMouseDown, onTitleMouseDown, onResizeStart, onClick, addMode }) {
  const tint = CONTAINER_TINTS.find(t => t.id === container.tint) || CONTAINER_TINTS[0];
  const titleH = 28;
  // Unique clip path ID so the title bar gets a flat bottom edge (no double-rounded seam).
  const clipId = `cclip-${container.id}`;
  // In addNode/addContainer mode, make the container transparent to pointer events so
  // clicks fall through to the canvas background (which handles placement).
  const noHit = addMode ? { pointerEvents: "none" } : null;
  return (
    <g
      transform={`translate(${container.x}, ${container.y})`}
      onClick={addMode ? undefined : onClick}
    >
      <defs>
        {/* Clip the title bar to exactly titleH so its rounded bottom corners don't show. */}
        <clipPath id={clipId}>
          <rect x="0" y="0" width={container.w} height={titleH} />
        </clipPath>
      </defs>
      {/* Body — translucent fill, dashed border */}
      <rect
        x="0" y="0" width={container.w} height={container.h} rx="12"
        fill={hexToRgba(tint.color, 0.06)}
        stroke={selected ? tint.color : hexToRgba(tint.color, 0.5)}
        strokeWidth={selected ? 2 : 1.25}
        strokeDasharray={selected ? "0" : "6 4"}
        onMouseDown={addMode ? undefined : onMouseDown}
        style={noHit || { cursor: "grab" }}
      />
      {/* Title bar — extends below titleH so its own rounded bottom corners fall outside
          the clip; the clip gives a clean flat bottom. Full opacity avoids dashed-border bleed. */}
      <rect
        x="0" y="0" width={container.w} height={titleH + 14} rx="12"
        fill={tint.color}
        clipPath={`url(#${clipId})`}
        onMouseDown={addMode ? undefined : onTitleMouseDown}
        style={noHit || { cursor: "grab" }}
      />
      <text x="14" y={titleH / 2 + 4.5} fontSize="12" fontWeight="600" fill="#ffffff" style={{ fontFamily: "Inter, sans-serif", pointerEvents: "none" }}>
        {container.label}
      </text>
      {/* Resize handle (bottom-right) */}
      <g transform={`translate(${container.w - 14}, ${container.h - 14})`} onMouseDown={addMode ? undefined : onResizeStart} style={noHit || { cursor: "nwse-resize" }}>
        <rect x="-4" y="-4" width="14" height="14" fill="transparent" />
        <path d="M0 8 L8 0 M3 8 L8 3 M6 8 L8 6" stroke={hexToRgba(tint.color, 0.7)} strokeWidth="1.5" strokeLinecap="round" />
      </g>
      {/* Selection ring */}
      {selected && (
        <rect
          x="-4" y="-4" width={container.w + 8} height={container.h + 8} rx="15"
          fill="none" stroke={tint.color} strokeWidth="2" strokeOpacity="0.4"
          style={{ pointerEvents: "none" }}
        />
      )}
    </g>
  );
}

// ---------------- Edge ----------------
function EdgeView({ edge, fromNode, toNode, flowType, selected, animationsOn, onClick, onLabelDragStart }) {
  if (!fromNode || !toNode) return null;

  // Per-edge overrides take precedence over flowType defaults
  const color = edge.color || flowType?.color || TW.slate600;
  const styleKey = edge.style && edge.style !== "auto" ? edge.style : (flowType?.dash || "solid");
  const dash = DASH_PATTERNS[styleKey] || DASH_PATTERNS.solid;
  const animated = (edge.animated ?? flowType?.animated) && animationsOn;
  const direction = edge.direction || "forward";

  const waypoints = edge.waypoints || [];
  const d = buildEdgePath(fromNode, toNode, !!edge.curved, waypoints);

  // For animation we need a dasharray + animate stroke-dashoffset.
  // Animated dashes look weird if styleKey is "none"/"solid" — force a pattern in that case.
  const animDash = animated && (dash === "0") ? "8 6" : dash;
  const dashSum = (animDash.split(/\s+/).reduce((s, n) => s + (parseFloat(n) || 0), 0)) || 14;

  const markerEnd = direction !== "bidirectional" ? `url(#arrow-${edge.id})` : `url(#arrow-${edge.id})`;
  const markerStart = direction === "bidirectional" ? `url(#arrow-start-${edge.id})` : undefined;

  const mid = pathMidpoint(fromNode, toNode, !!edge.curved, waypoints);
  const labelOffset = edge.labelOffset || { x: 0, y: 0 };
  const labelX = mid.x + labelOffset.x;
  const labelY = mid.y + labelOffset.y;
  const hasLabelOffset = Math.abs(labelOffset.x) > 6 || Math.abs(labelOffset.y) > 6;

  return (
    <g onClick={(e) => { e.stopPropagation(); onClick(); }} style={{ cursor: "pointer" }}>
      <defs>
        <marker id={`arrow-${edge.id}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
        </marker>
        {direction === "bidirectional" && (
          <marker id={`arrow-start-${edge.id}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
          </marker>
        )}
      </defs>
      {/* Invisible wide path for hit-testing */}
      <path d={d} stroke="transparent" strokeWidth="14" fill="none" />
      {/* Selection halo */}
      {selected && (
        <path d={d} stroke={color} strokeOpacity="0.25" strokeWidth="8" fill="none" />
      )}
      {/* Main path */}
      <path
        d={d}
        stroke={color}
        strokeWidth={selected ? 2.25 : 1.75}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={animated ? animDash : dash}
        markerEnd={markerEnd}
        markerStart={markerStart}
      >
        {animated && (
          <animate
            attributeName="stroke-dashoffset"
            from={dashSum}
            to="0"
            dur="1.2s"
            repeatCount="indefinite"
          />
        )}
      </path>
      {animated && direction === "bidirectional" && (
        <path
          d={d}
          stroke={color}
          strokeWidth="1.75"
          fill="none"
          strokeOpacity="0.55"
          strokeDasharray={animDash}
          strokeLinecap="round"
        >
          <animate
            attributeName="stroke-dashoffset"
            from="0"
            to={dashSum}
            dur="1.2s"
            repeatCount="indefinite"
          />
        </path>
      )}
      {/* Label */}
      {edge.label && (
        <g>
          {hasLabelOffset && (
            <line
              x1={mid.x} y1={mid.y} x2={labelX} y2={labelY}
              stroke={color} strokeWidth="1" strokeDasharray="3 3" strokeOpacity="0.4"
              style={{ pointerEvents: "none" }}
            />
          )}
          <g
            transform={`translate(${labelX}, ${labelY})`}
            onMouseDown={onLabelDragStart ? (e) => { e.stopPropagation(); onLabelDragStart(e, { ...labelOffset }); } : undefined}
            style={{ cursor: onLabelDragStart ? "move" : undefined }}
          >
            <rect
              x={-(edge.label.length * 3.4 + 8)}
              y="-9"
              width={edge.label.length * 6.8 + 16}
              height="18"
              rx="9"
              fill="#ffffff"
              stroke={hexToRgba(color, 0.4)}
              strokeWidth="1"
            />
            <text
              textAnchor="middle"
              y="4"
              fontSize="10.5"
              fill={TW.slate700}
              style={{ fontFamily: "Inter, sans-serif", pointerEvents: "none", userSelect: "none" }}
            >
              {edge.label}
            </text>
          </g>
        </g>
      )}
    </g>
  );
}

// ---------------- Canvas ----------------
function Canvas({ state, dispatch, onAddNodeAt, onAddContainerAt, canvasRef }) {
  const { doc, selection, mode, pendingEdgeFrom, globalAnimations, showGrid } = state;
  const svgRef = useRef(null);
  // expose to parent for SVG export
  useEffect(() => { if (canvasRef) canvasRef.current = svgRef.current; }, []);

  const [drag, setDrag] = useState(null); // describes active drag op

  // Pan handling
  const panRef = useRef({ panning: false, startX: 0, startY: 0, startVx: 0, startVy: 0, withSpace: false });
  const [spaceDown, setSpaceDown] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.code === "Space") setSpaceDown(true);
    };
    const onKeyUp = (e) => {
      if (e.code === "Space") setSpaceDown(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  // Wheel — ctrl+wheel zooms, plain wheel pans
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const handler = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const rect = el.getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;
        const factor = Math.exp(-e.deltaY * 0.0015);
        const newZoom = Math.max(0.25, Math.min(3, doc.viewport.zoom * factor));
        // Keep the point under the cursor stable
        const nx = sx - (sx - doc.viewport.x) * (newZoom / doc.viewport.zoom);
        const ny = sy - (sy - doc.viewport.y) * (newZoom / doc.viewport.zoom);
        dispatch({ type: "SET_VIEWPORT", viewport: { zoom: newZoom, x: nx, y: ny } });
      } else {
        e.preventDefault();
        dispatch({ type: "SET_VIEWPORT", viewport: { x: doc.viewport.x - e.deltaX, y: doc.viewport.y - e.deltaY } });
      }
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [doc.viewport, dispatch]);

  const startPan = (e) => {
    panRef.current = {
      panning: true,
      startX: e.clientX, startY: e.clientY,
      startVx: doc.viewport.x, startVy: doc.viewport.y,
    };
  };

  const onMouseMove = (e) => {
    if (panRef.current.panning) {
      const dx = e.clientX - panRef.current.startX;
      const dy = e.clientY - panRef.current.startY;
      dispatch({ type: "SET_VIEWPORT", viewport: { x: panRef.current.startVx + dx, y: panRef.current.startVy + dy } });
      return;
    }
    if (!drag) return;
    const pt = screenToDoc(svgRef.current, e.clientX, e.clientY, doc.viewport);
    const dx = pt.x - drag.startDoc.x;
    const dy = pt.y - drag.startDoc.y;

    if (drag.kind === "node") {
      const sdx = snap(dx) - drag.applied.dx;
      const sdy = snap(dy) - drag.applied.dy;
      if (sdx !== 0 || sdy !== 0) {
        dispatch({ type: "DRAG_NODES", nodeIds: [drag.id], dx: sdx, dy: sdy });
        drag.applied.dx += sdx;
        drag.applied.dy += sdy;
      }
    } else if (drag.kind === "container") {
      const sdx = snap(dx) - drag.applied.dx;
      const sdy = snap(dy) - drag.applied.dy;
      if (sdx !== 0 || sdy !== 0) {
        dispatch({ type: "DRAG_CONTAINER", id: drag.id, dx: sdx, dy: sdy });
        drag.applied.dx += sdx;
        drag.applied.dy += sdy;
      }
    } else if (drag.kind === "resize") {
      const newW = Math.max(120, snap(drag.startRect.w + dx));
      const newH = Math.max(80,  snap(drag.startRect.h + dy));
      if (newW !== drag.applied.w || newH !== drag.applied.h) {
        dispatch({ type: "RESIZE_CONTAINER", id: drag.id, rect: { w: newW, h: newH } });
        drag.applied.w = newW; drag.applied.h = newH;
      }
    } else if (drag.kind === "waypoint") {
      const newX = snap(pt.x);
      const newY = snap(pt.y);
      if (newX !== drag.applied.x || newY !== drag.applied.y) {
        const wps = drag.initialWaypoints.map((wp, i) =>
          i === drag.waypointIndex ? { x: newX, y: newY } : wp
        );
        dispatch({ type: "DRAG_WAYPOINT", edgeId: drag.edgeId, waypoints: wps });
        drag.applied.x = newX;
        drag.applied.y = newY;
      }
    } else if (drag.kind === "edgeLabel") {
      const newOx = drag.startOffset.x + (pt.x - drag.startDoc.x);
      const newOy = drag.startOffset.y + (pt.y - drag.startDoc.y);
      dispatch({ type: "DRAG_EDGE_LABEL", id: drag.edgeId, labelOffset: { x: newOx, y: newOy } });
    }
  };

  const onMouseUp = (e) => {
    if (panRef.current.panning) {
      panRef.current.panning = false;
      return;
    }
    if (drag) setDrag(null);
  };

  // Background click — places new node/container, or deselects.
  const onBgMouseDown = (e) => {
    // Only react to left-click directly on background svg/grid <rect>
    if (e.button === 1 || (e.button === 0 && (spaceDown || e.altKey))) {
      startPan(e);
      e.preventDefault();
      return;
    }
    if (e.button !== 0) return;

    if (mode === "addNode") {
      const pt = screenToDoc(svgRef.current, e.clientX, e.clientY, doc.viewport);
      onAddNodeAt(snap(pt.x - 80), snap(pt.y - 32));
      return;
    }
    if (mode === "addContainer") {
      const pt = screenToDoc(svgRef.current, e.clientX, e.clientY, doc.viewport);
      onAddContainerAt(snap(pt.x - 160), snap(pt.y - 80));
      return;
    }
    // Click on empty canvas — deselect
    dispatch({ type: "SET_SELECTION", selection: null });
  };

  const handleNodeMouseDown = (e, node) => {
    e.stopPropagation();
    if (e.button === 1 || spaceDown) { startPan(e); return; }
    if (mode === "addEdge") {
      // First pick = source; second pick = target
      if (!pendingEdgeFrom) {
        dispatch({ type: "SET_PENDING_EDGE_FROM", id: node.id });
      } else if (pendingEdgeFrom !== node.id) {
        const newEdge = {
          id: makeId("e"),
          from: pendingEdgeFrom,
          to: node.id,
          flowType: "data",
          label: "",
          direction: "forward",
          style: "auto",
          animated: false,
          curved: false,
        };
        dispatch({ type: "ADD_EDGE", edge: newEdge });
        dispatch({ type: "SET_SELECTION", selection: { kind: "edge", id: newEdge.id } });
        dispatch({ type: "SET_PENDING_EDGE_FROM", id: null });
        dispatch({ type: "SET_MODE", mode: "select" });
      }
      return;
    }
    dispatch({ type: "SET_SELECTION", selection: { kind: "node", id: node.id } });
    dispatch({ type: "BEGIN_DRAG" });
    const startDoc = screenToDoc(svgRef.current, e.clientX, e.clientY, doc.viewport);
    setDrag({ kind: "node", id: node.id, startDoc, applied: { dx: 0, dy: 0 } });
  };

  const handleContainerMouseDown = (e, container) => {
    e.stopPropagation();
    if (e.button === 1 || spaceDown) { startPan(e); return; }
    if (mode === "addEdge") return;
    dispatch({ type: "SET_SELECTION", selection: { kind: "container", id: container.id } });
    dispatch({ type: "BEGIN_DRAG" });
    const startDoc = screenToDoc(svgRef.current, e.clientX, e.clientY, doc.viewport);
    setDrag({ kind: "container", id: container.id, startDoc, applied: { dx: 0, dy: 0 } });
  };

  const handleResizeStart = (e, container) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    dispatch({ type: "SET_SELECTION", selection: { kind: "container", id: container.id } });
    dispatch({ type: "BEGIN_DRAG" });
    const startDoc = screenToDoc(svgRef.current, e.clientX, e.clientY, doc.viewport);
    setDrag({ kind: "resize", id: container.id, startDoc, startRect: { w: container.w, h: container.h }, applied: { w: container.w, h: container.h } });
  };

  // Build map for edge endpoint lookup
  const nodeMap = useMemo(() => {
    const m = {};
    for (const n of doc.nodes) m[n.id] = n;
    return m;
  }, [doc.nodes]);

  const handleWaypointMouseDown = (e, edgeId, waypointIndex, wp) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const edge = doc.edges.find(ed => ed.id === edgeId);
    if (!edge) return;
    dispatch({ type: "BEGIN_DRAG" });
    const startDoc = screenToDoc(svgRef.current, e.clientX, e.clientY, doc.viewport);
    setDrag({ kind: "waypoint", edgeId, waypointIndex, startDoc, initialWaypoints: [...(edge.waypoints || [])], applied: { x: wp.x, y: wp.y } });
  };

  const handleMidpointMouseDown = (e, edgeId, insertIdx, midPt) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const edge = doc.edges.find(ed => ed.id === edgeId);
    if (!edge) return;
    const newWp = { x: snap(midPt.x), y: snap(midPt.y) };
    const newWps = [...(edge.waypoints || [])];
    newWps.splice(insertIdx, 0, newWp);
    dispatch({ type: "UPDATE_EDGE", id: edgeId, patch: { waypoints: newWps } });
    const startDoc = screenToDoc(svgRef.current, e.clientX, e.clientY, doc.viewport);
    setDrag({ kind: "waypoint", edgeId, waypointIndex: insertIdx, startDoc, initialWaypoints: newWps, applied: { x: newWp.x, y: newWp.y } });
  };

  const handleDeleteWaypoint = (edgeId, waypointIndex) => {
    const edge = doc.edges.find(ed => ed.id === edgeId);
    if (!edge) return;
    const newWps = (edge.waypoints || []).filter((_, i) => i !== waypointIndex);
    dispatch({ type: "UPDATE_EDGE", id: edgeId, patch: { waypoints: newWps } });
  };

  const handleLabelDragStart = (e, edgeId, currentOffset) => {
    if (e.button !== 0) return;
    dispatch({ type: "BEGIN_DRAG" });
    const startDoc = screenToDoc(svgRef.current, e.clientX, e.clientY, doc.viewport);
    setDrag({ kind: "edgeLabel", edgeId, startDoc, startOffset: { ...currentOffset } });
  };

  const renderWaypointHandles = () => {
    if (selection?.kind !== "edge") return null;
    const edge = doc.edges.find(e => e.id === selection.id);
    if (!edge) return null;
    const fromNode = nodeMap[edge.from];
    const toNode = nodeMap[edge.to];
    if (!fromNode || !toNode) return null;
    const wps = edge.waypoints || [];
    const { a, b } = getEdgeAnchors(fromNode, toNode, wps);
    const pts = [{ x: a.x, y: a.y }, ...wps, { x: b.x, y: b.y }];
    const color = edge.color || doc.flowTypes[edge.flowType]?.color || TW.slate600;
    return (
      <g>
        {pts.slice(0, -1).map((p, i) => {
          const q = pts[i + 1];
          const mx = (p.x + q.x) / 2;
          const my = (p.y + q.y) / 2;
          return (
            <circle
              key={`mid-${i}`}
              cx={mx} cy={my} r="4"
              fill={color} fillOpacity="0.35" stroke={color} strokeWidth="1" strokeOpacity="0.7"
              style={{ cursor: "crosshair" }}
              onMouseDown={(e) => handleMidpointMouseDown(e, edge.id, i + 1, { x: mx, y: my })}
            />
          );
        })}
        {wps.map((wp, i) => (
          <circle
            key={`wp-${i}`}
            cx={wp.x} cy={wp.y} r="5"
            fill="white" stroke={color} strokeWidth="2"
            style={{ cursor: "move" }}
            onMouseDown={(e) => handleWaypointMouseDown(e, edge.id, i, wp)}
            onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteWaypoint(edge.id, i); }}
          />
        ))}
      </g>
    );
  };

  // Cursor
  const canvasCursor = panRef.current.panning ? "grabbing"
    : spaceDown ? "grab"
    : mode === "addNode" || mode === "addContainer" ? "crosshair"
    : mode === "addEdge" ? "crosshair"
    : "default";

  const { x: vx, y: vy, zoom } = doc.viewport;

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0 w-full h-full select-none"
      style={{ cursor: canvasCursor, background: "#fafbfc", userSelect: "none" }}
      onMouseDown={onBgMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      <defs>
        <pattern id="grid-fine" width={GRID} height={GRID} patternUnits="userSpaceOnUse">
          <path d={`M ${GRID} 0 L 0 0 0 ${GRID}`} fill="none" stroke="#e2e8f0" strokeWidth="0.5" />
        </pattern>
        <pattern id="grid-coarse" width={GRID*4} height={GRID*4} patternUnits="userSpaceOnUse">
          <path d={`M ${GRID*4} 0 L 0 0 0 ${GRID*4}`} fill="none" stroke="#cbd5e1" strokeWidth="0.7" />
        </pattern>
      </defs>

      {/* Grid background — drawn in SCREEN space so it doesn't get pixelated when zoomed.
          We achieve this by using two patterns scaled by zoom. */}
      {showGrid && (
        <g>
          <rect x="0" y="0" width="100%" height="100%" fill={`url(#grid-fine)`} opacity="0.6"
            transform={`translate(${vx % (GRID*zoom)}, ${vy % (GRID*zoom)}) scale(${zoom})`}
            style={{ pointerEvents: "none" }} />
        </g>
      )}

      <g transform={`translate(${vx}, ${vy}) scale(${zoom})`}>
        {/* Containers behind nodes */}
        {doc.containers.map(c => (
          <ContainerView
            key={c.id}
            container={c}
            selected={selection?.kind === "container" && selection.id === c.id}
            onMouseDown={(e) => handleContainerMouseDown(e, c)}
            onTitleMouseDown={(e) => handleContainerMouseDown(e, c)}
            onResizeStart={(e) => handleResizeStart(e, c)}
            onClick={(e) => { e.stopPropagation(); dispatch({ type: "SET_SELECTION", selection: { kind: "container", id: c.id } }); }}
            addMode={mode === "addNode" || mode === "addContainer"}
          />
        ))}

        {/* Edges above containers, below nodes — filter out edges with missing endpoints */}
        {doc.edges.map(edge => {
          const fromNode = nodeMap[edge.from];
          const toNode = nodeMap[edge.to];
          if (!fromNode || !toNode) {
            console.warn(`[diagram] Edge ${edge.id} references missing node(s): from=${edge.from} to=${edge.to} — skipping render`);
            return null;
          }
          return (
            <EdgeView
              key={edge.id}
              edge={edge}
              fromNode={fromNode}
              toNode={toNode}
              flowType={doc.flowTypes[edge.flowType]}
              selected={selection?.kind === "edge" && selection.id === edge.id}
              animationsOn={globalAnimations}
              onClick={() => dispatch({ type: "SET_SELECTION", selection: { kind: "edge", id: edge.id } })}
              onLabelDragStart={(e, currentOffset) => handleLabelDragStart(e, edge.id, currentOffset)}
            />
          );
        })}

        {/* Nodes on top */}
        {doc.nodes.map(n => (
          <NodeView
            key={n.id}
            node={n}
            type={doc.nodeTypes[n.type]}
            selected={(selection?.kind === "node" && selection.id === n.id) || pendingEdgeFrom === n.id}
            onMouseDown={(e) => handleNodeMouseDown(e, n)}
            onClick={(e) => e.stopPropagation()}
            onMeasure={(id, w, h) => dispatch({ type: "MEASURE_NODE", id, w, h })}
          />
        ))}
        {/* Waypoint handles for selected edge — above all other content */}
        {renderWaypointHandles()}
      </g>
    </svg>
  );
}

window.Canvas = Canvas;
window.GRID = GRID;
window.NodeView = NodeView;
window.ContainerView = ContainerView;
window.EdgeView = EdgeView;
window.ICON_INNER = ICON_INNER;
