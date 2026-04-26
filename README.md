# SASE Diagrammer

Interactive SASE / SD-WAN architecture diagram builder.

## Project structure

```
sase-diagrammer/
├── index.html          # Entry point — loads everything
└── src/
    ├── icons.jsx       # SVG icon definitions
    ├── types.jsx       # Default node types & flow types
    ├── seed.jsx        # Initial diagram (the SASE example)
    ├── reducer.jsx     # State management (undo/redo, selection, edits)
    ├── routing.jsx     # Edge path calculations (orthogonal & bezier)
    ├── canvas.jsx      # SVG canvas — nodes, containers, edges rendering
    ├── panels.jsx      # Right-side properties panel + Type Manager
    └── app.jsx         # Top-level App component, toolbar, JSON I/O
```

No build step. Everything is loaded via `<script>` tags from CDN:
- React 18 (development build)
- Babel Standalone (compiles JSX in the browser)
- Tailwind CSS (via CDN)

This is fine for a school project. For production you'd want a real build.

---

## Run locally

You **cannot** open `index.html` directly via `file://` — browsers block loading
external `.jsx` files that way (CORS). You need a tiny local web server.

### Option 1 — Python (built-in on macOS/Linux, easy on Windows)

```bash
cd sase-diagrammer
python3 -m http.server 8000
```

Open <http://localhost:8000> in your browser.

### Option 2 — Node.js (if you have it installed)

```bash
cd sase-diagrammer
npx serve .
```

### Option 3 — VS Code "Live Server" extension

Install the **Live Server** extension by Ritwick Dey, right-click `index.html`,
choose "Open with Live Server". Auto-reloads on save, very nice for iteration.

---

## Editing

Every file in `src/` is plain JSX. No imports/exports — each file attaches its
exports to `window` (e.g. `window.diagramReducer = reducer`) and other files
read them off `window`. This is dirty but it's what makes the no-build setup
work.

**Most useful files to edit:**

- `src/seed.jsx` — change the default diagram that loads on first open.
- `src/types.jsx` — add new default node types or flow types.
- `src/canvas.jsx` — visual rendering of nodes, containers, edges.
- `src/panels.jsx` — properties panel and Type Manager UI.
- `src/app.jsx` — toolbar buttons, JSON import/export, keyboard shortcuts.

After editing, just refresh the browser. Babel recompiles on every load.

> **Heads up:** Babel-in-browser is slow on first load (1-2 sec). That's
> normal. If the page is blank for longer than 5 sec, open DevTools → Console
> and check for syntax errors in your edits.

---

## Deploy to GitHub Pages

### One-time setup

1. Create a new repo on GitHub (e.g. `sase-diagrammer`).
2. Locally:
   ```bash
   cd sase-diagrammer
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/sase-diagrammer.git
   git push -u origin main
   ```
3. On GitHub: **Settings → Pages → Source: Deploy from a branch → Branch:
   `main` / `/ (root)` → Save**.
4. Wait ~1 minute. Your site is live at
   `https://YOUR_USERNAME.github.io/sase-diagrammer/`.

### If you want it at the root (`https://YOUR_USERNAME.github.io`)

Name the repo exactly `YOUR_USERNAME.github.io` instead. Same instructions
otherwise.

### Subsequent updates

```bash
git add .
git commit -m "Fix node alignment"
git push
```

GitHub Pages rebuilds automatically. Takes ~30-60 sec to go live.

---

## Common gotchas

**Page is blank.** Open DevTools → Console. Most likely a JSX syntax error in
one of your edits. The error message will name the file and line.

**Edits don't show up.** Hard refresh: `Ctrl+Shift+R` (or `Cmd+Shift+R` on Mac).
Babel caches aggressively.

**Tailwind classes not applying.** The CDN version of Tailwind only ships the
default palette. Arbitrary values like `bg-[#abc123]` won't work. Use the
standard color names, or use inline `style={{ backgroundColor: '#abc123' }}`
for custom colors.

**Want to use `localStorage` to persist diagrams?** Goes against the original
"in-memory only" constraint that came from the artifact environment, but it
works fine on your own GitHub Pages site. Add it in `app.jsx` near the
`useReducer` call — wrap state changes in a `useEffect` that writes to
`localStorage`, and read on init.
