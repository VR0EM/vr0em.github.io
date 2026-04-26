// Right-side properties panel + Type Manager modal.
// Defensive: every selected object is looked up by id on each render. All
// inputs use safe coercion + fallback values. The whole panel body is wrapped
// in a try/catch so a panel bug can never blank the canvas.

const { useState: useStateP, useMemo: useMemoP } = React;

function Section({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useStateP(defaultOpen);
  return (
    <div className="border-b border-slate-200">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-xs font-semibold tracking-wider uppercase text-slate-500 hover:bg-slate-50 transition-all duration-150"
      >
        <span>{title}</span>
        <Glyph d={open ? G.chevronDown : G.chevronRight} className="w-3.5 h-3.5" />
      </button>
      {open && <div className="px-4 pb-4 space-y-3">{children}</div>}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="text-[11px] font-medium text-slate-500 mb-1">{label}</div>
      {children}
    </label>
  );
}

const inputCls = "w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400 transition-all duration-150";
const monoInputCls = inputCls + " mono";
const selectCls = inputCls + " appearance-none pr-8";

// Safe integer parse — returns fallback for empty/invalid input.
function toInt(v, fallback = 0) {
  if (v === "" || v === null || v === undefined) return fallback;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

function ColorSwatch({ color, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={"w-6 h-6 rounded-full border-2 transition-all duration-150 " + (selected ? "border-slate-900 scale-110" : "border-white hover:scale-105")}
      style={{ background: color, boxShadow: "0 0 0 1px rgba(15,23,42,0.1)" }}
      title={color}
    />
  );
}

const PALETTE = [
  TW.slate500, TW.slate700,
  TW.red500, TW.orange500, TW.amber500, TW.yellow500,
  TW.lime500, TW.green500, TW.emerald500, TW.teal500,
  TW.cyan500, TW.sky500, TW.blue500, TW.indigo500,
  TW.violet500, TW.purple500, TW.fuchsia500, TW.pink500, TW.rose500,
];

function EmptyPanel({ title = "Canvas", message }) {
  return (
    <div className="p-4 text-sm">
      <div className="text-xs font-semibold tracking-wider uppercase text-slate-500 mb-3">{title}</div>
      <div className="text-slate-400">{message}</div>
    </div>
  );
}

function PanelInner({ state, dispatch }) {
  const { doc, selection } = state;

  // Look up selected by id every render — never store a stale ref.
  const selectedNode      = useMemoP(() => (selection?.kind === "node"      ? findNode(doc, selection.id)      : null), [doc, selection]);
  const selectedContainer = useMemoP(() => (selection?.kind === "container" ? findContainer(doc, selection.id) : null), [doc, selection]);
  const selectedEdge      = useMemoP(() => (selection?.kind === "edge"      ? findEdge(doc, selection.id)      : null), [doc, selection]);

  if (!selection) {
    return (
      <div className="p-4 text-sm">
        <div className="text-xs font-semibold tracking-wider uppercase text-slate-500 mb-3">Canvas</div>
        <div className="space-y-2 text-slate-600">
          <div className="flex justify-between"><span className="text-slate-500">Nodes</span><span className="mono">{doc?.nodes?.length ?? 0}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Containers</span><span className="mono">{doc?.containers?.length ?? 0}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Edges</span><span className="mono">{doc?.edges?.length ?? 0}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Custom types</span><span className="mono">{Object.keys(doc?.nodeTypes ?? {}).length}</span></div>
        </div>
        <div className="mt-6 text-xs text-slate-400 leading-relaxed">
          <div className="font-semibold text-slate-500 mb-1">Tips</div>
          <div>• Hold <span className="mono px-1 py-0.5 bg-slate-100 rounded">Space</span> + drag to pan</div>
          <div>• <span className="mono px-1 py-0.5 bg-slate-100 rounded">Ctrl</span> + scroll to zoom</div>
          <div>• Click a node, container or edge to edit it here</div>
          <div>• Use the Edge tool, then click two nodes</div>
        </div>
      </div>
    );
  }

  // If selected id no longer exists (e.g. just deleted), render empty state.
  if (selection.kind === "node" && !selectedNode)            return <EmptyPanel title="Node"      message="This node no longer exists. Click to select something else." />;
  if (selection.kind === "container" && !selectedContainer)  return <EmptyPanel title="Container" message="This container no longer exists." />;
  if (selection.kind === "edge" && !selectedEdge)            return <EmptyPanel title="Edge"      message="This edge no longer exists." />;

  if (selectedNode) {
    const node = selectedNode;
    const type = doc?.nodeTypes?.[node.type];
    const containerId = detectContainer(doc, node);
    const container = containerId ? findContainer(doc, containerId) : null;
    return (
      <div>
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
          <div className="text-[10px] tracking-widest uppercase text-slate-400 font-semibold">Node</div>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: hexToRgba(type?.color || TW.slate500, 0.14), color: type?.color || TW.slate500 }}>
              <Icon name={type?.icon || "Box"} className="w-3.5 h-3.5" />
            </div>
            <div className="text-sm font-semibold text-slate-900 truncate">{node.label ?? ""}</div>
          </div>
        </div>
        <Section title="Identity">
          <Field label="Title">
            <input type="text" value={node.label ?? ""} onChange={e => dispatch({ type: "UPDATE_NODE", id: node.id, patch: { label: e.target.value } })} className={inputCls} />
          </Field>
          <Field label="Subtitle / role">
            <input type="text" value={node.subtitle ?? ""} onChange={e => dispatch({ type: "UPDATE_NODE", id: node.id, patch: { subtitle: e.target.value } })} className={inputCls} />
          </Field>
          <Field label="IP / hostname">
            <input type="text" value={node.ip ?? ""} onChange={e => dispatch({ type: "UPDATE_NODE", id: node.id, patch: { ip: e.target.value } })} className={monoInputCls} placeholder="10.0.0.1 or host.example" />
          </Field>
        </Section>
        <Section title="Type">
          <Field label="Node type">
            <select value={doc?.nodeTypes?.[node.type] ? node.type : "generic"} onChange={e => dispatch({ type: "UPDATE_NODE", id: node.id, patch: { type: e.target.value } })} className={selectCls}>
              {Object.values(doc?.nodeTypes ?? {}).map(t => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </Field>
          <div className="text-[11px] text-slate-500">Types control color and icon. Edit them in <span className="font-medium text-slate-700">Type Manager</span> from the toolbar.</div>
        </Section>
        <Section title="Geometry">
          <div className="grid grid-cols-2 gap-2">
            <Field label="X"><input type="number" value={Number.isFinite(node.x) ? node.x : 0} onChange={e => dispatch({ type: "UPDATE_NODE", id: node.id, patch: { x: toInt(e.target.value, node.x) } })} className={monoInputCls} /></Field>
            <Field label="Y"><input type="number" value={Number.isFinite(node.y) ? node.y : 0} onChange={e => dispatch({ type: "UPDATE_NODE", id: node.id, patch: { y: toInt(e.target.value, node.y) } })} className={monoInputCls} /></Field>
            <Field label="Width"><input type="number" value={Number.isFinite(node.w) ? node.w : 240} onChange={e => dispatch({ type: "UPDATE_NODE", id: node.id, patch: { w: toInt(e.target.value, node.w) } })} onBlur={e => { const v = Math.max(20, toInt(e.target.value, 20)); if (v !== node.w) dispatch({ type: "UPDATE_NODE", id: node.id, patch: { w: v } }); }} className={monoInputCls} /></Field>
            <Field label="Height"><input type="number" value={Number.isFinite(node.h) ? node.h : 76} onChange={e => dispatch({ type: "UPDATE_NODE", id: node.id, patch: { h: toInt(e.target.value, node.h), userHeight: true } })} onBlur={e => { const v = Math.max(20, toInt(e.target.value, 20)); if (v !== node.h) dispatch({ type: "UPDATE_NODE", id: node.id, patch: { h: v, userHeight: true } }); }} className={monoInputCls} /></Field>
          </div>
          {container && (
            <div className="text-[11px] text-slate-500">
              Sits inside <span className="font-medium text-slate-700">{container.label}</span>
            </div>
          )}
        </Section>
      </div>
    );
  }

  if (selectedContainer) {
    const c = selectedContainer;
    return (
      <div>
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
          <div className="text-[10px] tracking-widest uppercase text-slate-400 font-semibold">Container</div>
          <div className="text-sm font-semibold text-slate-900 mt-1 truncate">{c.label ?? ""}</div>
        </div>
        <Section title="Identity">
          <Field label="Title">
            <input type="text" value={c.label ?? ""} onChange={e => dispatch({ type: "UPDATE_CONTAINER", id: c.id, patch: { label: e.target.value } })} className={inputCls} />
          </Field>
          <Field label="Tint">
            <div className="flex flex-wrap gap-1.5 pt-1">
              {CONTAINER_TINTS.map(t => (
                <ColorSwatch key={t.id} color={t.color} selected={c.tint === t.id} onClick={() => dispatch({ type: "UPDATE_CONTAINER", id: c.id, patch: { tint: t.id } })} />
              ))}
            </div>
          </Field>
        </Section>
        <Section title="Geometry">
          <div className="grid grid-cols-2 gap-2">
            <Field label="X"><input type="number" value={Number.isFinite(c.x) ? c.x : 0} onChange={e => dispatch({ type: "UPDATE_CONTAINER", id: c.id, patch: { x: toInt(e.target.value, c.x) } })} className={monoInputCls} /></Field>
            <Field label="Y"><input type="number" value={Number.isFinite(c.y) ? c.y : 0} onChange={e => dispatch({ type: "UPDATE_CONTAINER", id: c.id, patch: { y: toInt(e.target.value, c.y) } })} className={monoInputCls} /></Field>
            <Field label="Width"><input type="number" value={Number.isFinite(c.w) ? c.w : 320} onChange={e => dispatch({ type: "UPDATE_CONTAINER", id: c.id, patch: { w: Math.max(120, toInt(e.target.value, c.w)) } })} className={monoInputCls} /></Field>
            <Field label="Height"><input type="number" value={Number.isFinite(c.h) ? c.h : 192} onChange={e => dispatch({ type: "UPDATE_CONTAINER", id: c.id, patch: { h: Math.max(80, toInt(e.target.value, c.h)) } })} className={monoInputCls} /></Field>
          </div>
        </Section>
      </div>
    );
  }

  if (selectedEdge) {
    const e = selectedEdge;
    const flowTypes = doc?.flowTypes ?? {};
    // Defensive flowType — fall back to "data" if missing
    const flowKey = flowTypes[e.flowType] ? e.flowType : (Object.keys(flowTypes)[0] || "data");
    const flow = flowTypes[flowKey];
    const fromNode = findNode(doc, e.from);
    const toNode = findNode(doc, e.to);
    return (
      <div>
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
          <div className="text-[10px] tracking-widest uppercase text-slate-400 font-semibold">Edge</div>
          <div className="text-sm font-semibold text-slate-900 mt-1 flex items-center gap-1.5">
            <span className="truncate max-w-[80px]">{fromNode?.label ?? "?"}</span>
            <Glyph d={G.chevronRight} className="w-3 h-3 text-slate-400" />
            <span className="truncate max-w-[80px]">{toNode?.label ?? "?"}</span>
          </div>
        </div>
        <Section title="Identity">
          <Field label="Label">
            <input type="text" value={e.label ?? ""} onChange={ev => dispatch({ type: "UPDATE_EDGE", id: e.id, patch: { label: ev.target.value } })} className={inputCls} placeholder="e.g. Mirrored traffic" />
          </Field>
          <Field label="Flow type">
            <select value={flowKey} onChange={ev => dispatch({ type: "UPDATE_EDGE", id: e.id, patch: { flowType: ev.target.value } })} className={selectCls}>
              {Object.values(flowTypes).map(t => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </Field>
        </Section>
        <Section title="Direction & shape">
          <Field label="Direction">
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: "forward", label: "Forward" },
                { id: "bidirectional", label: "Both" },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => dispatch({ type: "UPDATE_EDGE", id: e.id, patch: { direction: opt.id } })}
                  className={"px-3 py-1.5 text-xs rounded-md border transition-all duration-150 " + ((e.direction ?? "forward") === opt.id ? "bg-slate-900 text-white border-slate-900" : "bg-white border-slate-200 text-slate-600 hover:border-slate-300")}
                >{opt.label}</button>
              ))}
            </div>
          </Field>
          <Field label="Routing">
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => dispatch({ type: "UPDATE_EDGE", id: e.id, patch: { curved: false } })}
                className={"px-3 py-1.5 text-xs rounded-md border transition-all duration-150 " + (!e.curved ? "bg-slate-900 text-white border-slate-900" : "bg-white border-slate-200 text-slate-600 hover:border-slate-300")}
              >Orthogonal</button>
              <button
                onClick={() => dispatch({ type: "UPDATE_EDGE", id: e.id, patch: { curved: true } })}
                className={"px-3 py-1.5 text-xs rounded-md border transition-all duration-150 " + (e.curved ? "bg-slate-900 text-white border-slate-900" : "bg-white border-slate-200 text-slate-600 hover:border-slate-300")}
              >Curved</button>
            </div>
          </Field>
          {e.waypoints && e.waypoints.length > 0 && (
            <button
              onClick={() => dispatch({ type: "UPDATE_EDGE", id: e.id, patch: { waypoints: [], labelOffset: { x: 0, y: 0 } } })}
              className="w-full px-3 py-1.5 text-[11px] font-medium text-red-600 hover:bg-red-50 rounded-md border border-red-100 transition-all duration-150"
            >Clear waypoints ({e.waypoints.length})</button>
          )}
        </Section>
        <Section title="Style">
          <Field label="Line">
            <div className="grid grid-cols-3 gap-1.5">
              {["auto", "solid", "dashed", "dotted"].map(opt => (
                <button
                  key={opt}
                  onClick={() => dispatch({ type: "UPDATE_EDGE", id: e.id, patch: { style: opt } })}
                  className={"px-2 py-1.5 text-[11px] rounded-md border transition-all duration-150 capitalize " + ((e.style ?? "auto") === opt ? "bg-slate-900 text-white border-slate-900" : "bg-white border-slate-200 text-slate-600 hover:border-slate-300")}
                >{opt}</button>
              ))}
            </div>
          </Field>
          <Field label="Color override">
            <div className="flex items-center gap-2">
              <div className="flex flex-wrap gap-1.5 flex-1">
                {[null, ...PALETTE].map((c, i) => (
                  <button
                    key={i}
                    onClick={() => dispatch({ type: "UPDATE_EDGE", id: e.id, patch: { color: c } })}
                    className={"w-5 h-5 rounded-full border-2 transition-all duration-150 " + (((e.color ?? null) === c) ? "border-slate-900 scale-110" : "border-white hover:scale-105")}
                    style={c ? { background: c, boxShadow: "0 0 0 1px rgba(15,23,42,0.1)" } : { background: "linear-gradient(45deg, transparent 45%, #ef4444 45%, #ef4444 55%, transparent 55%), #ffffff", boxShadow: "0 0 0 1px rgba(15,23,42,0.15)" }}
                    title={c || "Use flow type default"}
                  />
                ))}
              </div>
            </div>
            <div className="text-[11px] text-slate-400 mt-1.5">Default: <span style={{ color: flow?.color }} className="font-medium">{flow?.label ?? "—"}</span></div>
          </Field>
          <label className="flex items-center justify-between cursor-pointer pt-1">
            <span className="text-[11px] font-medium text-slate-500">Animated</span>
            <input
              type="checkbox"
              checked={!!(e.animated ?? flow?.animated ?? false)}
              onChange={ev => dispatch({ type: "UPDATE_EDGE", id: e.id, patch: { animated: ev.target.checked } })}
              className="w-4 h-4 accent-slate-900"
            />
          </label>
        </Section>
      </div>
    );
  }

  return null;
}

// Local error boundary for the panel — a panel bug must NEVER kill the canvas.
class PanelBoundary extends React.Component {
  constructor(p) { super(p); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err, info) { console.error("[panel boundary]", err, info); }
  componentDidUpdate(prev) {
    // Reset on selection change so the user isn't stuck on a panel error after picking something else
    if (prev.selectionKey !== this.props.selectionKey && this.state.err) this.setState({ err: null });
  }
  render() {
    if (this.state.err) {
      return (
        <div className="p-4 text-sm">
          <div className="text-xs font-semibold tracking-wider uppercase text-red-600 mb-2">Panel error</div>
          <div className="text-slate-700 mb-3">{String(this.state.err.message || this.state.err)}</div>
          <button onClick={() => this.setState({ err: null })} className="px-3 py-1.5 text-xs font-medium bg-slate-900 text-white rounded-md">Reset panel</button>
        </div>
      );
    }
    return this.props.children;
  }
}

function Properties({ state, dispatch }) {
  const selKey = state.selection ? state.selection.kind + ":" + state.selection.id : "none";
  return (
    <PanelBoundary selectionKey={selKey}>
      <PanelInner state={state} dispatch={dispatch} />
    </PanelBoundary>
  );
}

// ---------------- Type Manager Modal ----------------
function TypeManager({ doc, dispatch, onClose }) {
  const [editingId, setEditingId] = useStateP(null);
  const editing = editingId ? doc?.nodeTypes?.[editingId] : null;

  const startNew = () => {
    const id = makeId("t");
    const def = { id, label: "New type", color: TW.slate500, icon: "Box" };
    dispatch({ type: "ADD_NODE_TYPE", typeDef: def });
    setEditingId(id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(15,23,42,0.45)" }} onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-[720px] max-h-[80vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div>
            <div className="text-xs font-semibold tracking-wider uppercase text-slate-400">Diagram</div>
            <div className="text-base font-semibold text-slate-900">Type Manager</div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-slate-100 transition-all duration-150">
            <Glyph d={G.x} />
          </button>
        </div>
        <div className="flex-1 flex overflow-hidden">
          <div className="w-1/2 border-r border-slate-200 overflow-y-auto thin-scroll">
            <div className="p-3">
              <button onClick={startNew} className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md bg-slate-900 text-white hover:bg-slate-800 transition-all duration-150">
                <Glyph d={G.plus} className="w-3.5 h-3.5" /> New custom type
              </button>
            </div>
            <div className="px-2 pb-3">
              {Object.values(doc?.nodeTypes ?? {}).map(t => (
                <button
                  key={t.id}
                  onClick={() => setEditingId(t.id)}
                  className={"w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md transition-all duration-150 " + (editingId === t.id ? "bg-slate-100" : "hover:bg-slate-50")}
                >
                  <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: hexToRgba(t.color, 0.14), color: t.color }}>
                    <Icon name={t.icon} className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="text-sm font-medium text-slate-900 truncate">{t.label}</div>
                    <div className="text-[10px] mono text-slate-400 truncate">{t.id}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div className="w-1/2 overflow-y-auto thin-scroll">
            {editing ? (
              <div className="p-5 space-y-4">
                <Field label="Label">
                  <input type="text" value={editing.label ?? ""} onChange={e => dispatch({ type: "UPDATE_NODE_TYPE", id: editing.id, patch: { label: e.target.value } })} className={inputCls} />
                </Field>
                <Field label="Color">
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {PALETTE.map(c => (
                      <ColorSwatch key={c} color={c} selected={editing.color === c} onClick={() => dispatch({ type: "UPDATE_NODE_TYPE", id: editing.id, patch: { color: c } })} />
                    ))}
                  </div>
                </Field>
                <Field label="Icon (lucide name)">
                  <div className="grid grid-cols-6 gap-1.5">
                    {ICON_NAMES.map(n => (
                      <button
                        key={n}
                        onClick={() => dispatch({ type: "UPDATE_NODE_TYPE", id: editing.id, patch: { icon: n } })}
                        className={"aspect-square flex items-center justify-center rounded-md border transition-all duration-150 " + (editing.icon === n ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 text-slate-600 hover:border-slate-400")}
                        title={n}
                      >
                        <Icon name={n} className="w-4 h-4" />
                      </button>
                    ))}
                  </div>
                </Field>
                <div className="pt-2 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] mono text-slate-400">{editing.id}</div>
                    {editing.id !== "generic" && (
                      <button
                        onClick={() => { dispatch({ type: "DELETE_NODE_TYPE", id: editing.id }); setEditingId(null); }}
                        className="px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-md transition-all duration-150"
                      >Delete type</button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-slate-400 p-10 text-center">
                Select a type on the left to edit, or create a new one.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

window.Properties = Properties;
window.TypeManager = TypeManager;
window.PALETTE = PALETTE;
