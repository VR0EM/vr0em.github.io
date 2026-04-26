// Seed diagram — modeled on the SD-WAN edge architecture described in the brief.
// Layout is original; positions are picked to read clearly at the default zoom.

function makeId(prefix = "id") {
  return prefix + "_" + Math.random().toString(36).slice(2, 9);
}

const SEED_DIAGRAM = {
  version: 1,
  viewport: { x: 0, y: 0, zoom: 1 },
  nodeTypes: { ...DEFAULT_NODE_TYPES },
  flowTypes: { ...DEFAULT_FLOW_TYPES },
  containers: [
    { id: "c_external", label: "External / Cloud",        x: 32,   y: 64,  w: 384, h: 432, tint: "blue"   },
    { id: "c_cloudvps", label: "Cloud VPS",               x: 240,  y: 192, w: 160, h: 144, tint: "indigo" },
    { id: "c_internal", label: "Internal / Bedrijf",      x: 32,   y: 528, w: 384, h: 240, tint: "emerald" },
    { id: "c_proxmox",  label: "Proxmox Host — Bletchley",x: 480,  y: 32,  w: 800, h: 800, tint: "slate"  },
    { id: "c_pop",      label: "VM 1 — PoP Node",         x: 512,  y: 528, w: 432, h: 272, tint: "orange" },
    { id: "c_icap",     label: "VM 2 — ICAP",             x: 992,  y: 64,  w: 256, h: 144, tint: "teal"   },
    { id: "c_ndr",      label: "VM 3 — NDR Sensor",       x: 656,  y: 240, w: 432, h: 240, tint: "violet" },
    { id: "c_siem",     label: "VM 4 — SIEM",             x: 1120, y: 240, w: 144, h: 240, tint: "amber"  },
  ],
  nodes: [
    // External / Cloud
    { id: "n_idp",      type: "idp",      x: 80,   y: 144, w: 160, h: 76, label: "Identity Provider",  subtitle: "OIDC / SAML",          ip: "idp.corp.example" },
    { id: "n_headscale",type: "ztna",     x: 256,  y: 240, w: 144, h: 76, label: "HeadScale",          subtitle: "ZTNA control plane",  ip: "hs.tail.example" },
    // Internal / Bedrijf
    { id: "n_client",   type: "vpnclient",x: 64,   y: 600, w: 160, h: 76, label: "Client",             subtitle: "TailScale agent",     ip: "10.64.0.12" },
    { id: "n_apps",     type: "app",      x: 240,  y: 600, w: 160, h: 76, label: "Internal Apps",      subtitle: "JIT / connector",     ip: "10.10.0.0/24" },
    // PoP Node
    { id: "n_opnsense", type: "firewall", x: 528,  y: 624, w: 176, h: 76, label: "OPNsense",           subtitle: "FWaaS / routing",     ip: "fw01" },
    { id: "n_squid",    type: "swg",      x: 768,  y: 568, w: 160, h: 76, label: "Squid",              subtitle: "SWG / web proxy",     ip: "10.20.0.5:3128" },
    { id: "n_suricata", type: "ids",      x: 768,  y: 656, w: 160, h: 76, label: "Suricata",           subtitle: "IDS / IPS",           ip: "10.20.0.6" },
    { id: "n_unbound",  type: "dns",      x: 768,  y: 744, w: 160, h: 76, label: "Unbound",            subtitle: "DNS resolver",        ip: "10.20.0.7:53" },
    // ICAP
    { id: "n_icap",     type: "icap",     x: 1008, y: 112, w: 224, h: 76, label: "WebSafety + ClamAV", subtitle: "ICAP scan",           ip: "10.30.0.4:1344" },
    // NDR
    { id: "n_zeek",     type: "ndr",      x: 672,  y: 320, w: 160, h: 76, label: "Zeek",               subtitle: "Passive NDR sensor",  ip: "" },
    { id: "n_rita",     type: "ndr",      x: 880,  y: 304, w: 192, h: 76, label: "RITA",               subtitle: "Beacon detection",    ip: "" },
    { id: "n_dnsipc",   type: "dns",      x: 880,  y: 392, w: 192, h: 76, label: "Dnstop",             subtitle: "DNS firehose tap",    ip: "" },
    // SIEM
    { id: "n_siem",     type: "siem",     x: 1136, y: 320, w: 112, h: 144, label: "SIEM",              subtitle: "Log collector",       ip: "10.40.0.10" },
    // Internet egress
    { id: "n_internet", type: "external", x: 624,  y: 880, w: 176, h: 76, label: "Internet",           subtitle: "Outbound only",       ip: "" },
  ],
  edges: [
    { id: "e1",  from: "n_idp",      to: "n_headscale", flowType: "auth",          label: "Identity / auth context", direction: "forward",       style: "dashed", animated: false, curved: false },
    { id: "e2",  from: "n_client",   to: "n_headscale", flowType: "vpn",           label: "VPN tunnel",              direction: "bidirectional", style: "dashed", animated: true,  curved: false },
    { id: "e3",  from: "n_headscale",to: "n_opnsense",  flowType: "control",       label: "Route enforcement",       direction: "forward",       style: "dashed", animated: false, curved: false },
    { id: "e4",  from: "n_apps",     to: "n_opnsense",  flowType: "data",          label: "East-west traffic",       direction: "bidirectional", style: "solid",  animated: false, curved: false },
    { id: "e5",  from: "n_opnsense", to: "n_squid",     flowType: "data",          label: "HTTP(S) → SWG",           direction: "forward",       style: "solid",  animated: true,  curved: false },
    { id: "e6",  from: "n_squid",    to: "n_icap",      flowType: "icap",          label: "ICAP req / resp",         direction: "bidirectional", style: "solid",  animated: true,  curved: false },
    { id: "e7",  from: "n_opnsense", to: "n_suricata",  flowType: "mirrored-oob",  label: "Mirrored traffic",        direction: "forward",       style: "dotted", animated: true,  curved: false },
    { id: "e8",  from: "n_opnsense", to: "n_zeek",      flowType: "mirrored-oob",  label: "Mirrored to NDR",         direction: "forward",       style: "dotted", animated: true,  curved: false },
    { id: "e9",  from: "n_zeek",     to: "n_rita",      flowType: "data",          label: "Conn logs",               direction: "forward",       style: "solid",  animated: false, curved: false },
    { id: "e10", from: "n_zeek",     to: "n_dnsipc",    flowType: "dns",           label: "DNS firehose",            direction: "forward",       style: "dashed", animated: false, curved: false },
    { id: "e11", from: "n_opnsense", to: "n_unbound",   flowType: "dns",           label: "DNS",                     direction: "bidirectional", style: "dashed", animated: false, curved: false },
    { id: "e12", from: "n_opnsense", to: "n_internet",  flowType: "data",          label: "Clean egress",            direction: "forward",       style: "solid",  animated: true,  curved: false },
    { id: "e13", from: "n_suricata", to: "n_siem",      flowType: "log",           label: "IDS alerts",              direction: "forward",       style: "dotted", animated: false, curved: false },
    { id: "e14", from: "n_rita",     to: "n_siem",      flowType: "log",           label: "NDR findings",            direction: "forward",       style: "dotted", animated: false, curved: false },
    { id: "e15", from: "n_icap",     to: "n_siem",      flowType: "log",           label: "AV verdicts",             direction: "forward",       style: "dotted", animated: false, curved: false },
    { id: "e16", from: "n_squid",    to: "n_siem",      flowType: "log",           label: "Proxy access logs",       direction: "forward",       style: "dotted", animated: false, curved: false },
  ],
};

window.SEED_DIAGRAM = SEED_DIAGRAM;
window.makeId = makeId;
