// Default node-type presets and flow-type presets.
// Colors are HEX strings sourced from the Tailwind palette so we can apply them
// directly via inline style (containers/nodes need accent fills/strokes that
// Tailwind's safelist can't reasonably cover for arbitrary user-defined types).

const TW = {
  slate50:  "#f8fafc", slate100: "#f1f5f9", slate200: "#e2e8f0", slate300: "#cbd5e1",
  slate400: "#94a3b8", slate500: "#64748b", slate600: "#475569", slate700: "#334155",
  slate800: "#1e293b", slate900: "#0f172a",
  red500: "#ef4444", red600: "#dc2626",
  orange500: "#f97316", orange600: "#ea580c",
  amber500: "#f59e0b", amber600: "#d97706",
  yellow500: "#eab308",
  lime500: "#84cc16",
  green500: "#22c55e", green600: "#16a34a",
  emerald500: "#10b981", emerald600: "#059669",
  teal500: "#14b8a6", teal600: "#0d9488",
  cyan500: "#06b6d4", cyan600: "#0891b2",
  sky500:  "#0ea5e9", sky600:  "#0284c7",
  blue500: "#3b82f6", blue600: "#2563eb",
  indigo500: "#6366f1", indigo600: "#4f46e5",
  violet500: "#8b5cf6", violet600: "#7c3aed",
  purple500: "#a855f7", purple600: "#9333ea",
  fuchsia500: "#d946ef",
  pink500: "#ec4899", pink600: "#db2777",
  rose500: "#f43f5e",
};

const DEFAULT_NODE_TYPES = {
  firewall:    { id: "firewall",    label: "Firewall (FWaaS)",   color: TW.orange500, icon: "Shield" },
  ids:         { id: "ids",         label: "IDS / IPS",          color: TW.red500,    icon: "ShieldAlert" },
  swg:         { id: "swg",         label: "Proxy / SWG",        color: TW.amber500,  icon: "Filter" },
  ndr:         { id: "ndr",         label: "NDR Sensor",         color: TW.violet500, icon: "Radar" },
  icap:        { id: "icap",        label: "ICAP / AV",          color: TW.teal500,   icon: "ShieldCheck" },
  dns:         { id: "dns",         label: "DNS Resolver",       color: TW.cyan500,   icon: "Globe" },
  siem:        { id: "siem",        label: "SIEM / Log Sink",    color: TW.yellow500, icon: "Database" },
  idp:         { id: "idp",         label: "Identity Provider",  color: TW.indigo500, icon: "KeyRound" },
  ztna:        { id: "ztna",        label: "ZTNA Controller",    color: TW.blue500,   icon: "Lock" },
  vpnclient:   { id: "vpnclient",   label: "VPN Client",         color: TW.emerald500,icon: "Laptop" },
  app:         { id: "app",         label: "Internal App",       color: TW.green500,  icon: "Server" },
  external:    { id: "external",    label: "Internet / External",color: TW.slate500,  icon: "Cloud" },
  generic:     { id: "generic",     label: "Generic VM",         color: TW.slate600,  icon: "Box" },
};

// Flow types — each defines color + dash pattern + default animation.
// User can override per-edge via the properties panel.
const DEFAULT_FLOW_TYPES = {
  data:         { id: "data",         label: "Data",              color: TW.slate700,   dash: "none",   animated: false },
  control:      { id: "control",      label: "Control plane",     color: TW.indigo600,  dash: "dashed", animated: false },
  vpn:          { id: "vpn",          label: "VPN tunnel",        color: TW.violet600,  dash: "dashed", animated: true  },
  "mirrored-oob":{id:"mirrored-oob",  label: "Mirrored (out-of-band)", color: TW.purple500, dash: "dotted", animated: true  },
  icap:         { id: "icap",         label: "ICAP req/resp",     color: TW.teal600,    dash: "none",   animated: true  },
  log:          { id: "log",          label: "Log / telemetry",   color: TW.amber600,   dash: "dotted", animated: false },
  auth:         { id: "auth",         label: "Auth / identity",   color: TW.blue600,    dash: "dashed", animated: false },
  dns:          { id: "dns",          label: "DNS query",         color: TW.cyan600,    dash: "dashed", animated: false },
};

const CONTAINER_TINTS = [
  { id: "slate",  color: TW.slate500  },
  { id: "blue",   color: TW.blue500   },
  { id: "indigo", color: TW.indigo500 },
  { id: "violet", color: TW.violet500 },
  { id: "teal",   color: TW.teal500   },
  { id: "emerald",color: TW.emerald500},
  { id: "amber",  color: TW.amber500  },
  { id: "orange", color: TW.orange500 },
  { id: "rose",   color: TW.rose500   },
  { id: "cyan",   color: TW.cyan500   },
];

// Convert a hex string to "rgba(r,g,b,a)" for tinted backgrounds.
function hexToRgba(hex, alpha = 1) {
  const m = hex.replace("#", "");
  const r = parseInt(m.substring(0, 2), 16);
  const g = parseInt(m.substring(2, 4), 16);
  const b = parseInt(m.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// SVG dash patterns for each style
const DASH_PATTERNS = {
  none:   "0",
  solid:  "0",
  dashed: "8 6",
  dotted: "2 5",
};

window.TW = TW;
window.DEFAULT_NODE_TYPES = DEFAULT_NODE_TYPES;
window.DEFAULT_FLOW_TYPES = DEFAULT_FLOW_TYPES;
window.CONTAINER_TINTS = CONTAINER_TINTS;
window.hexToRgba = hexToRgba;
window.DASH_PATTERNS = DASH_PATTERNS;
