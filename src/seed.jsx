// Seed diagram — minimal tutorial example demonstrating the tool's capabilities.
// Layout: two side-by-side containers (Client Side / Server Side) + one standalone node.
// Design canvas: 1280×720. All positions on 16px grid.

function makeId(prefix = "id") {
  return prefix + "_" + Math.random().toString(36).slice(2, 9);
}

const SEED_DIAGRAM = {
  version: 1,
  viewport: { x: -48, y: 64, zoom: 1 },
  nodeTypes: { ...DEFAULT_NODE_TYPES },
  flowTypes: { ...DEFAULT_FLOW_TYPES },
  containers: [
    { id: "c_client", label: "Client Side",  x: 112, y: 64, w: 384, h: 288, tint: "blue"    },
    { id: "c_server", label: "Server Side",  x: 592, y: 64, w: 384, h: 288, tint: "emerald" },
  ],
  nodes: [
    { id: "n_workstation", type: "vpnclient", x: 224, y: 128, w: 160, h: 76, label: "Workstation",   subtitle: "Windows 11",       ip: "" },
    { id: "n_vpnclient",   type: "ztna",      x: 224, y: 240, w: 160, h: 76, label: "VPN Client",    subtitle: "TailScale agent",  ip: "" },
    { id: "n_authgw",      type: "idp",       x: 704, y: 128, w: 160, h: 76, label: "Auth Gateway",  subtitle: "OIDC / SAML",      ip: "" },
    { id: "n_appserver",   type: "app",       x: 704, y: 240, w: 160, h: 76, label: "App Server",    subtitle: "Internal service", ip: "" },
    { id: "n_internet",    type: "external",  x: 464, y: 432, w: 160, h: 76, label: "Internet",      subtitle: "Public egress",    ip: "" },
  ],
  edges: [
    // Solid data edge — within left container
    { id: "e_data",    from: "n_workstation", to: "n_vpnclient",  flowType: "data",    label: "Local traffic",  direction: "forward",       style: "auto", animated: false, curved: false, waypoints: [], labelOffset: { x: 0, y: 0 } },
    // Dashed animated VPN tunnel — crosses containers
    { id: "e_vpn",     from: "n_vpnclient",   to: "n_authgw",     flowType: "vpn",     label: "VPN tunnel",     direction: "forward",       style: "auto", animated: true,  curved: false, waypoints: [], labelOffset: { x: 0, y: 0 } },
    // Bidirectional control plane — within right container
    { id: "e_ctrl",    from: "n_authgw",      to: "n_appserver",  flowType: "control", label: "Control plane",  direction: "bidirectional", style: "auto", animated: false, curved: false, waypoints: [], labelOffset: { x: 0, y: 0 } },
    // Dotted log edge — to standalone bottom node
    { id: "e_log",     from: "n_appserver",   to: "n_internet",   flowType: "log",     label: "Egress log",     direction: "forward",       style: "auto", animated: false, curved: false, waypoints: [], labelOffset: { x: 0, y: 0 } },
  ],
};

window.SEED_DIAGRAM = SEED_DIAGRAM;
window.makeId = makeId;
