// Reducer — pure transitions over the diagram doc.
// All mutations go through snap() (deep clone) and produce a new doc.

const HISTORY_LIMIT = 50;

const initialState = {
  doc: SEED_DIAGRAM,
  past: [],
  future: [],
  selection: null,           // { kind: "node"|"container"|"edge", id } — id-only, never a direct ref
  pendingEdgeFrom: null,
  mode: "select",
  newNodeType: "generic",
  globalAnimations: true,
  showGrid: true,
  debugLog: false,
};

function snap(doc) { return JSON.parse(JSON.stringify(doc)); }

function pushHistory(state, nextDoc) {
  const past = [...state.past, snap(state.doc)].slice(-HISTORY_LIMIT);
  return { ...state, doc: nextDoc, past, future: [] };
}

function findNode(doc, id) { return doc?.nodes?.find(n => n.id === id) || null; }
function findContainer(doc, id) { return doc?.containers?.find(c => c.id === id) || null; }
function findEdge(doc, id) { return doc?.edges?.find(e => e.id === id) || null; }

function detectContainer(doc, node) {
  const cx = node.x + node.w / 2;
  const cy = node.y + node.h / 2;
  let best = null;
  let bestArea = Infinity;
  for (const c of doc.containers) {
    if (cx >= c.x && cx <= c.x + c.w && cy >= c.y && cy <= c.y + c.h) {
      const area = c.w * c.h;
      if (area < bestArea) { best = c; bestArea = area; }
    }
  }
  return best ? best.id : null;
}

function reducer(state, action) {
  if (state.debugLog && !action.__internal) {
    try { console.log("[diagram]", action.type, action); } catch (_) {}
  }
  switch (action.type) {
    case "SET_MODE":
      return { ...state, mode: action.mode, pendingEdgeFrom: null };
    case "SET_SELECTION":
      return { ...state, selection: action.selection };
    case "SET_NEW_NODE_TYPE":
      return { ...state, newNodeType: action.typeId };
    case "TOGGLE_ANIMATIONS":
      return { ...state, globalAnimations: !state.globalAnimations };
    case "TOGGLE_GRID":
      return { ...state, showGrid: !state.showGrid };
    case "TOGGLE_DEBUG":
      return { ...state, debugLog: !state.debugLog };
    case "SET_VIEWPORT": {
      const next = { ...state.doc, viewport: { ...state.doc.viewport, ...action.viewport } };
      return { ...state, doc: next };
    }
    case "SET_PENDING_EDGE_FROM":
      return { ...state, pendingEdgeFrom: action.id };

    case "ADD_NODE": {
      const next = { ...state.doc, nodes: [...state.doc.nodes, action.node] };
      return pushHistory(state, next);
    }
    case "ADD_CONTAINER": {
      const next = { ...state.doc, containers: [...state.doc.containers, action.container] };
      return pushHistory(state, next);
    }
    case "ADD_EDGE": {
      const next = { ...state.doc, edges: [...state.doc.edges, action.edge] };
      return pushHistory(state, next);
    }
    case "UPDATE_NODE": {
      const idx = state.doc.nodes.findIndex(x => x.id === action.id);
      if (idx === -1) return state;
      const next = { ...state.doc, nodes: state.doc.nodes.map((n, i) => i === idx ? { ...n, ...action.patch } : n) };
      return pushHistory(state, next);
    }
    case "MEASURE_NODE": {
      // Auto-measurement from the renderer. Must NOT push history (would flood undo stack
      // and break redo after unrelated edits). Mutates only w/h on the existing node.
      const idx = state.doc.nodes.findIndex(x => x.id === action.id);
      if (idx === -1) return state;
      const cur = state.doc.nodes[idx];
      if (cur.w === action.w && cur.h === action.h) return state;
      const next = { ...state.doc, nodes: state.doc.nodes.map((n, i) => i === idx ? { ...n, w: action.w, h: action.h } : n) };
      return { ...state, doc: next };
    }
    case "UPDATE_CONTAINER": {
      const idx = state.doc.containers.findIndex(x => x.id === action.id);
      if (idx === -1) return state;
      const next = { ...state.doc, containers: state.doc.containers.map((c, i) => i === idx ? { ...c, ...action.patch } : c) };
      return pushHistory(state, next);
    }
    case "UPDATE_EDGE": {
      const idx = state.doc.edges.findIndex(x => x.id === action.id);
      if (idx === -1) return state;
      const next = { ...state.doc, edges: state.doc.edges.map((e, i) => i === idx ? { ...e, ...action.patch } : e) };
      return pushHistory(state, next);
    }
    case "DELETE_SELECTED": {
      if (!state.selection) return state;
      const { kind, id } = state.selection;
      let next = state.doc;
      if (kind === "node") {
        next = {
          ...state.doc,
          nodes: state.doc.nodes.filter(n => n.id !== id),
          edges: state.doc.edges.filter(e => e.from !== id && e.to !== id),
        };
      } else if (kind === "container") {
        next = { ...state.doc, containers: state.doc.containers.filter(c => c.id !== id) };
      } else if (kind === "edge") {
        next = { ...state.doc, edges: state.doc.edges.filter(e => e.id !== id) };
      } else return state;
      return { ...pushHistory(state, next), selection: null };
    }
    case "BEGIN_DRAG": {
      const past = [...state.past, snap(state.doc)].slice(-HISTORY_LIMIT);
      return { ...state, past, future: [] };
    }
    case "DRAG_NODES": {
      const next = { ...state.doc, nodes: state.doc.nodes.map(n =>
        action.nodeIds.includes(n.id) ? { ...n, x: n.x + action.dx, y: n.y + action.dy } : n
      ) };
      return { ...state, doc: next };
    }
    case "DRAG_CONTAINER": {
      const c = findContainer(state.doc, action.id);
      if (!c) return state;
      const containedNodeIds = state.doc.nodes
        .filter(n => detectContainer(state.doc, n) === c.id)
        .map(n => n.id);
      const next = {
        ...state.doc,
        containers: state.doc.containers.map(x => x.id === c.id ? { ...x, x: x.x + action.dx, y: x.y + action.dy } : x),
        nodes: state.doc.nodes.map(n => containedNodeIds.includes(n.id) ? { ...n, x: n.x + action.dx, y: n.y + action.dy } : n),
      };
      return { ...state, doc: next };
    }
    case "RESIZE_CONTAINER": {
      const next = {
        ...state.doc,
        containers: state.doc.containers.map(x => x.id === action.id ? { ...x, ...action.rect } : x),
      };
      return { ...state, doc: next };
    }
    case "UNDO": {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      const newPast = state.past.slice(0, -1);
      const future = [snap(state.doc), ...state.future].slice(0, HISTORY_LIMIT);
      return { ...state, doc: previous, past: newPast, future, selection: null };
    }
    case "REDO": {
      if (state.future.length === 0) return state;
      const nextDoc = state.future[0];
      const newFuture = state.future.slice(1);
      const past = [...state.past, snap(state.doc)].slice(-HISTORY_LIMIT);
      return { ...state, doc: nextDoc, past, future: newFuture, selection: null };
    }
    case "ADD_NODE_TYPE": {
      const next = { ...state.doc, nodeTypes: { ...state.doc.nodeTypes, [action.typeDef.id]: action.typeDef } };
      return pushHistory(state, next);
    }
    case "UPDATE_NODE_TYPE": {
      const cur = state.doc.nodeTypes[action.id];
      if (!cur) return state;
      const next = { ...state.doc, nodeTypes: { ...state.doc.nodeTypes, [action.id]: { ...cur, ...action.patch } } };
      return pushHistory(state, next);
    }
    case "DELETE_NODE_TYPE": {
      const { [action.id]: _, ...rest } = state.doc.nodeTypes;
      const next = {
        ...state.doc,
        nodeTypes: rest,
        nodes: state.doc.nodes.map(n => n.type === action.id ? { ...n, type: "generic" } : n),
      };
      return pushHistory(state, next);
    }
    case "REPLACE_DOC":
      return { ...initialState, doc: action.doc };
    default:
      return state;
  }
}

window.diagramReducer = reducer;
window.diagramInitialState = initialState;
window.findNode = findNode;
window.findContainer = findContainer;
window.findEdge = findEdge;
window.detectContainer = detectContainer;
