// Top-level App — toolbar + canvas + side panel + JSON/SVG IO.

const { useReducer, useEffect: useEffectA, useRef: useRefA, useState: useStateA, useMemo: useMemoA } = React;

function ToolbarButton({ active, onClick, title, children, danger, disabled }) {
  const base = "flex items-center justify-center w-9 h-9 rounded-md transition-all duration-150 ";
  const cls = disabled
    ? base + "text-slate-300 cursor-not-allowed"
    : active
      ? base + "bg-slate-900 text-white"
      : danger
        ? base + "text-slate-600 hover:bg-red-50 hover:text-red-600"
        : base + "text-slate-600 hover:bg-slate-100 hover:text-slate-900";
  return (
    <button onClick={onClick} title={title} className={cls} disabled={disabled}>
      {children}
    </button>
  );
}

function Divider() { return <div className="w-px h-6 bg-slate-200 mx-1" />; }

function Toolbar({ state, dispatch, onOpenTypes, onExportJSON, onImportJSON, onQuickSave, onExportSVG, onFitToScreen, onZoom }) {
  const { mode, doc, past, future, globalAnimations, showGrid, pendingEdgeFrom } = state;
  const fileInput = useRefA(null);

  return (
    <div className="flex items-center gap-1 px-3 py-2 bg-white border-b border-slate-200">
      <div className="flex items-center gap-1.5 pr-3">
        <div className="w-7 h-7 rounded-md bg-slate-900 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 7h16M4 12h16M4 17h16" />
            <circle cx="8" cy="7" r="2" fill="currentColor" />
            <circle cx="16" cy="12" r="2" fill="currentColor" />
            <circle cx="10" cy="17" r="2" fill="currentColor" />
          </svg>
        </div>
        <div className="leading-tight">
          <div className="text-[13px] font-semibold text-slate-900">SASE Diagrammer</div>
          <div className="text-[10px] text-slate-400 -mt-0.5">SD-WAN edge architecture</div>
        </div>
      </div>

      <Divider />

      <ToolbarButton active={mode === "select"} onClick={() => dispatch({ type: "SET_MODE", mode: "select" })} title="Select (V)">
        <Glyph d={G.cursor} />
      </ToolbarButton>
      <ToolbarButton active={mode === "addNode"} onClick={() => dispatch({ type: "SET_MODE", mode: "addNode" })} title="Add Node — click on canvas">
        <Glyph d={G.node} />
      </ToolbarButton>
      <ToolbarButton active={mode === "addContainer"} onClick={() => dispatch({ type: "SET_MODE", mode: "addContainer" })} title="Add Container — click on canvas">
        <Glyph d={G.container} />
      </ToolbarButton>
      <ToolbarButton active={mode === "addEdge"} onClick={() => dispatch({ type: "SET_MODE", mode: "addEdge" })} title="Add Edge — click source then target">
        <Glyph d={G.edge} />
      </ToolbarButton>

      {mode === "addEdge" && (
        <div className="ml-2 px-2.5 py-1 text-[11px] rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-medium">
          {pendingEdgeFrom ? "Click target node…" : "Click source node…"}
        </div>
      )}

      <Divider />

      <ToolbarButton onClick={() => dispatch({ type: "UNDO" })} disabled={past.length === 0} title="Undo (⌘Z)">
        <Glyph d={G.undo} />
      </ToolbarButton>
      <ToolbarButton onClick={() => dispatch({ type: "REDO" })} disabled={future.length === 0} title="Redo (⌘⇧Z)">
        <Glyph d={G.redo} />
      </ToolbarButton>
      <ToolbarButton onClick={() => dispatch({ type: "DELETE_SELECTED" })} disabled={!state.selection} title="Delete selected (Del)" danger>
        <Glyph d={G.trash} />
      </ToolbarButton>

      <Divider />

      <ToolbarButton active={showGrid} onClick={() => dispatch({ type: "TOGGLE_GRID" })} title="Toggle grid (G)">
        <Glyph d={G.grid} />
      </ToolbarButton>
      <ToolbarButton active={globalAnimations} onClick={() => dispatch({ type: "TOGGLE_ANIMATIONS" })} title="Toggle animations">
        <Glyph d={globalAnimations ? G.pause : G.play} />
      </ToolbarButton>

      <Divider />

      <ToolbarButton active={state.debugLog} onClick={() => dispatch({ type: "TOGGLE_DEBUG" })} title="Toggle debug log">
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2l1 2"/><path d="M15 2l-1 2"/><path d="M5 8h14"/><path d="M6 8v10a4 4 0 0 0 4 4h4a4 4 0 0 0 4-4V8"/><path d="M9 14h6"/></svg>
      </ToolbarButton>

      <Divider />

      <ToolbarButton onClick={() => onZoom(1.2)} title="Zoom in"><Glyph d={G.zoomIn} /></ToolbarButton>
      <div className="px-2 text-xs mono text-slate-500 tabular-nums w-12 text-center">
        {Math.round(doc.viewport.zoom * 100)}%
      </div>
      <ToolbarButton onClick={() => onZoom(1/1.2)} title="Zoom out"><Glyph d={G.zoomOut} /></ToolbarButton>
      <ToolbarButton onClick={onFitToScreen} title="Fit to screen"><Glyph d={G.fit} /></ToolbarButton>

      <Divider />

      <button onClick={onOpenTypes} className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-md transition-all duration-150">
        Type Manager
      </button>

      <div className="flex-1" />

      <button onClick={onQuickSave} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-md transition-all duration-150" title="Quick Save — downloads current JSON">
        <Glyph d={G.save} className="w-3.5 h-3.5" /> Quick Save
      </button>
      <button onClick={() => fileInput.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-md transition-all duration-150">
        <Glyph d={G.upload} className="w-3.5 h-3.5" /> Import JSON
      </button>
      <input ref={fileInput} type="file" accept=".json,application/json" className="hidden" onChange={(e) => {
        const f = e.target.files?.[0]; if (f) onImportJSON(f); e.target.value = "";
      }} />
      <button onClick={onExportJSON} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-md transition-all duration-150">
        <Glyph d={G.download} className="w-3.5 h-3.5" /> Export JSON
      </button>
      <button onClick={onExportSVG} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-all duration-150">
        <Glyph d={G.image} className="w-3.5 h-3.5" /> Export SVG
      </button>
    </div>
  );
}

// Validate imported JSON and return either { ok: true, doc } or { ok: false, error }.
function validateDoc(data) {
  if (!data || typeof data !== "object") return { ok: false, error: "File is not a JSON object." };
  if (data.version !== 1) return { ok: false, error: "Unsupported document version. Expected version: 1." };
  for (const k of ["nodes", "containers", "edges"]) {
    if (!Array.isArray(data[k])) return { ok: false, error: `Missing or invalid array: "${k}".` };
  }
  if (!data.nodeTypes || typeof data.nodeTypes !== "object") return { ok: false, error: `Missing object: "nodeTypes".` };
  if (!data.flowTypes || typeof data.flowTypes !== "object") return { ok: false, error: `Missing object: "flowTypes".` };
  if (!data.viewport) data.viewport = { x: 0, y: 0, zoom: 1 };
  // Sanity: every edge endpoint must resolve
  const ids = new Set(data.nodes.map(n => n.id));
  for (const e of data.edges) {
    if (!ids.has(e.from) || !ids.has(e.to)) return { ok: false, error: `Edge "${e.id}" references missing node(s).` };
  }
  return { ok: true, doc: data };
}

function Toast({ message, kind, onClose }) {
  if (!message) return null;
  const color = kind === "error" ? "bg-red-600" : kind === "success" ? "bg-emerald-600" : "bg-slate-900";
  return (
    <div className={"fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-lg text-white text-sm shadow-lg flex items-center gap-3 z-50 " + color}>
      <span>{message}</span>
      <button onClick={onClose} className="opacity-70 hover:opacity-100"><Glyph d={G.x} className="w-3.5 h-3.5" /></button>
    </div>
  );
}

function App() {
  const [state, dispatch] = useReducer(diagramReducer, diagramInitialState);
  const [showTypes, setShowTypes] = useStateA(false);
  const [panelCollapsed, setPanelCollapsed] = useStateA(false);
  const [toast, setToast] = useStateA(null);
  const canvasSvgRef = useRefA(null);
  const containerRef = useRefA(null);
  const lastGoodDocRef = useRefA(state.doc);

  // Keep a snapshot of the last successfully-rendered doc for boundary recovery.
  useEffectA(() => { lastGoodDocRef.current = state.doc; }, [state.doc]);
  useEffectA(() => {
    window.__diagramResetSelection = () => dispatch({ type: "SET_SELECTION", selection: null });
    window.__diagramRestoreSnapshot = () => dispatch({ type: "REPLACE_DOC", doc: lastGoodDocRef.current });
    return () => { delete window.__diagramResetSelection; delete window.__diagramRestoreSnapshot; };
  }, []);

  const setT = (message, kind = "info") => {
    setToast({ message, kind });
    setTimeout(() => setToast(null), 3500);
  };

  // Keyboard shortcuts
  useEffectA(() => {
    const onKey = (e) => {
      const tag = e.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) dispatch({ type: "REDO" }); else dispatch({ type: "UNDO" });
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "y") {
        e.preventDefault(); dispatch({ type: "REDO" }); return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (state.selection) { e.preventDefault(); dispatch({ type: "DELETE_SELECTED" }); }
      }
      if (e.key === "v" || e.key === "V") dispatch({ type: "SET_MODE", mode: "select" });
      if (e.key === "g" || e.key === "G") dispatch({ type: "TOGGLE_GRID" });
      if (e.key === "Escape") {
        dispatch({ type: "SET_MODE", mode: "select" });
        dispatch({ type: "SET_SELECTION", selection: null });
        dispatch({ type: "SET_PENDING_EDGE_FROM", id: null });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state.selection]);

  // --- Toolbar handlers ---
  const handleAddNodeAt = (x, y) => {
    const node = {
      id: makeId("n"),
      type: state.newNodeType || "generic",
      x, y, w: 240, h: 76,
      label: "New node",
      subtitle: "",
      ip: "",
    };
    dispatch({ type: "ADD_NODE", node });
    dispatch({ type: "SET_SELECTION", selection: { kind: "node", id: node.id } });
    dispatch({ type: "SET_MODE", mode: "select" });
  };
  const handleAddContainerAt = (x, y) => {
    const tints = CONTAINER_TINTS;
    const used = new Set(state.doc.containers.map(c => c.tint));
    const tint = (tints.find(t => !used.has(t.id)) || tints[0]).id;
    const container = { id: makeId("c"), x, y, w: 320, h: 192, label: "New container", tint };
    dispatch({ type: "ADD_CONTAINER", container });
    dispatch({ type: "SET_SELECTION", selection: { kind: "container", id: container.id } });
    dispatch({ type: "SET_MODE", mode: "select" });
  };

  const onExportJSON = () => {
    const data = JSON.stringify(state.doc, null, 2);
    downloadBlob(new Blob([data], { type: "application/json" }), "sase-diagram.json");
    setT("Exported diagram as JSON", "success");
  };

  const onQuickSave = () => {
    onExportJSON();
  };

  const onImportJSON = async (file) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const result = validateDoc(data);
      if (!result.ok) { setT("Import failed: " + result.error, "error"); return; }
      dispatch({ type: "REPLACE_DOC", doc: result.doc });
      setT("Imported diagram", "success");
    } catch (err) {
      setT("Import failed: " + err.message, "error");
    }
  };

  const onZoom = (factor) => {
    const wrap = containerRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const newZoom = Math.max(0.25, Math.min(3, state.doc.viewport.zoom * factor));
    const nx = cx - (cx - state.doc.viewport.x) * (newZoom / state.doc.viewport.zoom);
    const ny = cy - (cy - state.doc.viewport.y) * (newZoom / state.doc.viewport.zoom);
    dispatch({ type: "SET_VIEWPORT", viewport: { zoom: newZoom, x: nx, y: ny } });
  };

  const onFitToScreen = () => {
    const wrap = containerRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    const items = [...state.doc.nodes, ...state.doc.containers];
    if (items.length === 0) return;
    const minX = Math.min(...items.map(i => i.x));
    const minY = Math.min(...items.map(i => i.y));
    const maxX = Math.max(...items.map(i => i.x + i.w));
    const maxY = Math.max(...items.map(i => i.y + i.h));
    const padding = 40;
    const w = maxX - minX + padding * 2;
    const h = maxY - minY + padding * 2;
    const zoom = Math.min(rect.width / w, rect.height / h, 2);
    const x = (rect.width  - (maxX - minX) * zoom) / 2 - minX * zoom;
    const y = (rect.height - (maxY - minY) * zoom) / 2 - minY * zoom;
    dispatch({ type: "SET_VIEWPORT", viewport: { zoom, x, y } });
  };

  // SVG export — render the diagram into a clean standalone SVG.
  const onExportSVG = () => {
    const doc = state.doc;
    const items = [...doc.nodes, ...doc.containers];
    if (items.length === 0) { setT("Nothing to export", "error"); return; }
    const minX = Math.min(...items.map(i => i.x));
    const minY = Math.min(...items.map(i => i.y));
    const maxX = Math.max(...items.map(i => i.x + i.w));
    const maxY = Math.max(...items.map(i => i.y + i.h));
    const pad = 32;
    const w = maxX - minX + pad * 2;
    const h = maxY - minY + pad * 2;

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    svg.setAttribute("viewBox", `${minX - pad} ${minY - pad} ${w} ${h}`);
    svg.setAttribute("width", w);
    svg.setAttribute("height", h);
    // Render off-screen via React, then serialize
    const tempContainer = document.createElement("div");
    tempContainer.style.position = "absolute";
    tempContainer.style.left = "-99999px";
    document.body.appendChild(tempContainer);

    const Diagram = () => {
      const nodeMap = {};
      for (const n of doc.nodes) nodeMap[n.id] = n;
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox={`${minX - pad} ${minY - pad} ${w} ${h}`} width={w} height={h}>
          <rect x={minX - pad} y={minY - pad} width={w} height={h} fill="#fafbfc" />
          {doc.containers.map(c => (
            <ContainerView key={c.id} container={c} selected={false} onMouseDown={() => {}} onTitleMouseDown={() => {}} onResizeStart={() => {}} onClick={() => {}} />
          ))}
          {doc.edges.map(edge => (
            <EdgeView
              key={edge.id}
              edge={edge}
              fromNode={nodeMap[edge.from]}
              toNode={nodeMap[edge.to]}
              flowType={doc.flowTypes[edge.flowType]}
              selected={false}
              animationsOn={true}
              onClick={() => {}}
            />
          ))}
          {doc.nodes.map(n => (
            <NodeView key={n.id} node={n} type={doc.nodeTypes[n.type]} selected={false} onMouseDown={() => {}} onClick={() => {}} />
          ))}
        </svg>
      );
    };
    const root = ReactDOM.createRoot(tempContainer);
    root.render(<Diagram />);
    setTimeout(() => {
      const out = tempContainer.querySelector("svg");
      if (!out) { setT("SVG export failed", "error"); return; }
      const serialized = '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(out);
      downloadBlob(new Blob([serialized], { type: "image/svg+xml" }), "sase-diagram.svg");
      root.unmount();
      tempContainer.remove();
      setT("Exported diagram as SVG", "success");
    }, 80);
  };

  return (
    <div className="h-full flex flex-col">
      <Toolbar
        state={state}
        dispatch={dispatch}
        onOpenTypes={() => setShowTypes(true)}
        onExportJSON={onExportJSON}
        onImportJSON={onImportJSON}
        onQuickSave={onQuickSave}
        onExportSVG={onExportSVG}
        onFitToScreen={onFitToScreen}
        onZoom={onZoom}
      />
      <div className="flex-1 flex overflow-hidden">
        <div ref={containerRef} className="flex-1 relative overflow-hidden">
          <Canvas
            state={state}
            dispatch={dispatch}
            onAddNodeAt={handleAddNodeAt}
            onAddContainerAt={handleAddContainerAt}
            canvasRef={canvasSvgRef}
          />
          {/* Floating legend, bottom-left */}
          <Legend doc={state.doc} />
        </div>
        <aside className={"flex-shrink-0 border-l border-slate-200 bg-white relative " + (panelCollapsed ? "w-8" : "w-80")}>
          <button
            onClick={() => setPanelCollapsed(v => !v)}
            className="absolute top-3 -left-3.5 z-10 w-7 h-7 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-400 hover:text-slate-700 hover:border-slate-400 transition-all duration-150"
            title={panelCollapsed ? "Expand panel" : "Collapse panel"}
          >
            <Glyph d={panelCollapsed ? G.chevronLeft : G.chevronRight} className="w-3.5 h-3.5" />
          </button>
          {!panelCollapsed && (
            <div className="overflow-y-auto thin-scroll h-full">
              <Properties state={state} dispatch={dispatch} />
            </div>
          )}
        </aside>
      </div>
      {showTypes && <TypeManager doc={state.doc} dispatch={dispatch} onClose={() => setShowTypes(false)} />}
      <Toast message={toast?.message} kind={toast?.kind} onClose={() => setToast(null)} />
    </div>
  );
}

function Legend({ doc }) {
  const [open, setOpen] = useStateA(true);
  return (
    <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-md border border-slate-200 overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="w-full px-3 py-2 flex items-center gap-2 text-[10px] font-semibold tracking-wider uppercase text-slate-500 hover:bg-slate-50">
        <Glyph d={open ? G.chevronDown : G.chevronRight} className="w-3 h-3" />
        Flow legend
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-1.5 max-w-[220px]">
          {Object.values(doc.flowTypes).map(f => (
            <div key={f.id} className="flex items-center gap-2 text-[11px] text-slate-600">
              <svg width="32" height="8" className="flex-shrink-0">
                <line x1="0" y1="4" x2="32" y2="4" stroke={f.color} strokeWidth="2" strokeDasharray={DASH_PATTERNS[f.dash] || "0"} strokeLinecap="round" />
              </svg>
              <span>{f.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Top-level error boundary — keeps a snapshot of the last good doc so the user
// can recover their work after a crash.
class AppBoundary extends React.Component {
  constructor(p) { super(p); this.state = { err: null, info: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err, info) { this.setState({ info }); console.error("[app boundary]", err, info); }
  reset = (mode) => {
    if (mode === "selection" && window.__diagramResetSelection) window.__diagramResetSelection();
    if (mode === "snapshot" && window.__diagramRestoreSnapshot) window.__diagramRestoreSnapshot();
    this.setState({ err: null, info: null });
  };
  render() {
    if (this.state.err) {
      const stack = (this.state.err?.stack || "") + "\n\n" + (this.state.info?.componentStack || "");
      return (
        <div className="h-full flex items-center justify-center p-8 bg-slate-50">
          <div className="max-w-2xl w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-red-50">
              <div className="text-xs font-semibold tracking-wider uppercase text-red-700">Something broke</div>
              <div className="text-base font-semibold text-slate-900 mt-1">{String(this.state.err.message || this.state.err)}</div>
            </div>
            <div className="px-6 py-4">
              <details className="text-xs">
                <summary className="cursor-pointer text-slate-500 hover:text-slate-700">Stack trace</summary>
                <pre className="mt-2 p-3 bg-slate-900 text-slate-100 rounded-md overflow-auto mono text-[11px] leading-relaxed max-h-64">{stack}</pre>
              </details>
              <div className="flex gap-2 mt-4">
                <button onClick={() => this.reset("selection")} className="px-3 py-2 text-sm font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-all duration-150">Reset selection</button>
                <button onClick={() => this.reset("snapshot")} className="px-3 py-2 text-sm font-medium bg-slate-900 hover:bg-slate-800 text-white rounded-md transition-all duration-150">Reload from last snapshot</button>
              </div>
              <div className="mt-3 text-[11px] text-slate-400">Your work is preserved in memory. Both buttons recover the canvas without a page reload.</div>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Snapshot helper — App stores its last-known-good doc on window so the boundary can restore it.
function AppShell() {
  return (
    <AppBoundary>
      <App />
    </AppBoundary>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<AppShell />);
