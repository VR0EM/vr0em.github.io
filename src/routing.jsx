// Edge routing — orthogonal elbow paths with a simple "avoid endpoint boxes"
// strategy, plus an alternate cubic-bezier mode. We don't do real A* pathfinding;
// the brief explicitly says don't over-engineer this.

// Compute a connection point on the perimeter of a node closest to a target point.
function anchorPoint(node, targetX, targetY) {
  const cx = node.x + node.w / 2;
  const cy = node.y + node.h / 2;
  const dx = targetX - cx;
  const dy = targetY - cy;
  // Decide which side based on the dominant axis ratio vs node aspect
  const adx = Math.abs(dx);
  const ady = Math.abs(dy);
  const slope = node.h / node.w;
  if (ady / Math.max(adx, 0.001) > slope) {
    // top or bottom
    const y = dy > 0 ? node.y + node.h : node.y;
    const x = cx + (dx / Math.max(ady, 0.001)) * (node.h / 2);
    const side = dy > 0 ? "bottom" : "top";
    return { x, y, side };
  } else {
    const x = dx > 0 ? node.x + node.w : node.x;
    const y = cy + (dy / Math.max(adx, 0.001)) * (node.w / 2);
    const side = dx > 0 ? "right" : "left";
    return { x, y, side };
  }
}

// Build an orthogonal path between two anchor points, with a small offset
// from the anchor side so the line leaves the box cleanly.
function orthogonalPath(a, b) {
  const off = 18;
  const ax = a.x + (a.side === "left" ? -off : a.side === "right" ? off : 0);
  const ay = a.y + (a.side === "top"  ? -off : a.side === "bottom"? off : 0);
  const bx = b.x + (b.side === "left" ? -off : b.side === "right" ? off : 0);
  const by = b.y + (b.side === "top"  ? -off : b.side === "bottom"? off : 0);

  const aHorizontal = a.side === "left" || a.side === "right";
  const bHorizontal = b.side === "left" || b.side === "right";

  const points = [{ x: a.x, y: a.y }, { x: ax, y: ay }];

  if (aHorizontal && bHorizontal) {
    const midX = (ax + bx) / 2;
    points.push({ x: midX, y: ay });
    points.push({ x: midX, y: by });
  } else if (!aHorizontal && !bHorizontal) {
    const midY = (ay + by) / 2;
    points.push({ x: ax, y: midY });
    points.push({ x: bx, y: midY });
  } else if (aHorizontal && !bHorizontal) {
    points.push({ x: bx, y: ay });
  } else {
    points.push({ x: ax, y: by });
  }
  points.push({ x: bx, y: by });
  points.push({ x: b.x, y: b.y });

  return points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(" ");
}

function bezierPath(a, b) {
  // Pull control points out from each anchor along its outward side
  const pull = Math.max(60, Math.hypot(b.x - a.x, b.y - a.y) * 0.4);
  const cv = (side) => {
    if (side === "left")   return [-pull, 0];
    if (side === "right")  return [ pull, 0];
    if (side === "top")    return [0, -pull];
    return [0, pull];
  };
  const [c1x, c1y] = cv(a.side);
  const [c2x, c2y] = cv(b.side);
  return `M ${a.x} ${a.y} C ${a.x + c1x} ${a.y + c1y}, ${b.x + c2x} ${b.y + c2y}, ${b.x} ${b.y}`;
}

// Compute anchor points from both ends, pointing toward the first/last waypoint
// (or toward each other if no waypoints). Used by buildEdgePath and EdgeView.
function getEdgeAnchors(fromNode, toNode, waypoints) {
  const wps = waypoints || [];
  const aTarget = wps.length > 0 ? wps[0] : { x: toNode.x + toNode.w / 2, y: toNode.y + toNode.h / 2 };
  const bTarget = wps.length > 0 ? wps[wps.length - 1] : { x: fromNode.x + fromNode.w / 2, y: fromNode.y + fromNode.h / 2 };
  return {
    a: anchorPoint(fromNode, aTarget.x, aTarget.y),
    b: anchorPoint(toNode, bTarget.x, bTarget.y),
  };
}

function buildEdgePath(fromNode, toNode, curved, waypoints) {
  const wps = waypoints || [];
  const { a, b } = getEdgeAnchors(fromNode, toNode, wps);
  if (wps.length === 0) {
    return curved ? bezierPath(a, b) : orthogonalPath(a, b);
  }
  // Multi-segment path through user waypoints.
  // Ortho: polyline through each point (user places corners deliberately).
  // Curved: cubic bezier through each segment.
  const pts = [{ x: a.x, y: a.y }, ...wps, { x: b.x, y: b.y }];
  if (curved) {
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i - 1], q = pts[i];
      const pull = Math.max(40, Math.hypot(q.x - p.x, q.y - p.y) * 0.35);
      const len = Math.hypot(q.x - p.x, q.y - p.y) || 1;
      const ux = (q.x - p.x) / len, uy = (q.y - p.y) / len;
      d += ` C ${p.x + ux * pull} ${p.y + uy * pull}, ${q.x - ux * pull} ${q.y - uy * pull}, ${q.x} ${q.y}`;
    }
    return d;
  }
  return pts.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(" ");
}

// Midpoint for label placement. With waypoints, uses the middle segment's midpoint.
function pathMidpoint(fromNode, toNode, curved, waypoints) {
  const wps = waypoints || [];
  const { a, b } = getEdgeAnchors(fromNode, toNode, wps);
  const pts = [{ x: a.x, y: a.y }, ...wps, { x: b.x, y: b.y }];
  const mid = Math.floor((pts.length - 1) / 2);
  return { x: (pts[mid].x + pts[mid + 1].x) / 2, y: (pts[mid].y + pts[mid + 1].y) / 2 };
}

window.anchorPoint = anchorPoint;
window.getEdgeAnchors = getEdgeAnchors;
window.buildEdgePath = buildEdgePath;
window.pathMidpoint = pathMidpoint;
