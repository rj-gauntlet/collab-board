# Current Project Status
_Last updated: Feb 2026. Use this alongside PRD.md for full context._

## COMPLETED FEATURES

### Canvas Foundation
- [x] Infinite canvas with pan (scroll/drag) and zoom (Ctrl+Scroll, pinch)
- [x] `usePanZoom` hook: `scale`, `stageX`, `stageY`, `screenToBoard()`, `zoomIn/Out`, `resetView`, `fitToContent(bbox)`
- [x] Fit-to-screen: computes union bounding box of all elements, zooms/pans to show all
- [x] Browser zoom resilience: `ResizeObserver` + `visualViewport.resize` + `window.resize` listeners; `Math.ceil` sizing
- [x] `pixelRatio` state tracks `window.devicePixelRatio`; passed to Konva `Stage` with `key={pixelRatio}` to force remount on DPR change → no blurriness
- [x] Zoom controls UI (bottom-right corner): +/-, percentage, fit-to-screen button

### Element Types
- [x] **Sticky Notes** — create, drag, resize, color, double-click to edit inline
- [x] **Shapes** — rect, circle, triangle; create, drag, resize, color
- [x] **Text Elements** — standalone floating text; drag, resize; double-click to edit inline; formatting toolbar (bold, italic, font size/family, color)
- [x] **Frames** — labeled grouping containers; styled title bar (tinted background + separator line); semi-bold title; long titles truncated with ellipsis; double-click title to edit inline
- [x] **Connectors** — lines/arrows between notes and shapes; anchor-point routing (4 cardinal points per element, closest pair selected); real-time drag following; inline label editor; style options (line/arrow, dashed, curved, bidirectional, stroke width, color); click to select → ConnectorStyleBar

### Editing & Interaction
- [x] Select tool: click to select, Shift+Click multi-select, drag box-select
- [x] Konva `Transformer` for resize handles on selected elements
- [x] Right-click context menu: color picker, duplicate, copy, paste, delete
- [x] Copy/Paste (Ctrl+C / Ctrl+V) — clones elements with offset
- [x] Duplicate (Ctrl+D)
- [x] Delete (Delete/Backspace)
- [x] Undo/Redo (Ctrl+Z / Ctrl+Y) — 50-step local history, full Firestore restore on undo

### View Controls
- [x] Grid overlay (header "Grid" toggle)
- [x] Snap-to-grid (header "Snap" toggle) — snaps all element types on drag end, `GRID_SIZE = 20px`
- [x] Export board as PNG (header "Export" button) — Konva `stage.toDataURL()`, retina quality

### Keyboard Shortcuts
- [x] All shortcuts handled in `WhiteboardCanvas` keydown listener
- [x] Keyboard shortcuts help modal — press `?` anywhere to open/close
- [x] Shortcuts: `Ctrl+Z`, `Ctrl+Y`, `Ctrl+C`, `Ctrl+V`, `Ctrl+D`, `Delete`, `Escape`, `?`

### Real-time Collaboration Infrastructure
- [x] Firestore: persistent storage for all element types
- [x] RTDB: ephemeral cursors (`cursors/{boardId}/{userId}`) and live drag positions (`notes/{boardId}`)
- [x] `useRemoteNotes` + `useRemoteShapes` — RTDB listeners for other users' drag positions
- [x] Local drag override system: `localNoteOverrides` / `localShapeOverrides` Maps take priority over remote snapshots during drag
- [x] Bug fix: RTDB remote snapshots no longer clobber local drag position (guard: `if (localNoteOverrides.has(id)) continue`)
- [x] Bug fix: Firestore cleanup effects skip dragging element (via `draggingElementIdRef` + `useLayoutEffect`)

### Auth & Board Management
- [x] Firebase Anonymous Authentication
- [x] Board list on home page; create new board
- [x] Board name editing in header
- [x] Board-not-found handling for invalid/deleted boards

## GIT LOG (recent)
```
d7e55dc  feat: connector styles, keyboard shortcuts modal, updated docs
25b7be9  fix: connectors now follow dragged elements in real-time
38693b1  fix: connector label editor overlays label exactly; transparent-then-opaque background
3bcceba  feat: canvas feature set — frames, text, connectors, undo/redo, zoom, snap, export
e21371c  feat: multi-select, duplicate/copy-paste, delete selection
```

## UNCOMMITTED CHANGES
None — all changes are committed as of the migration.

## NOT YET IMPLEMENTED (Pending)

### HIGH PRIORITY
- [ ] **AI Board Agent** — natural language chat panel that creates/modifies/arranges board elements via GPT-4o-mini function calling (Vercel AI SDK). Full spec in PRD.md. Acceptance tests defined — must support creation, manipulation, layout, and complex template commands.

### NORMAL PRIORITY
- [ ] **Image upload** — place/resize images on canvas
- [ ] **Real-time cursors** — show other users' cursors with name labels (RTDB infra exists, just needs rendering)
- [ ] **More shape types** — diamond, hexagon, star, speech bubble
- [ ] **Minimap** — small board overview panel
- [ ] **Layers / Z-order panel** — list, reorder, lock, hide elements
- [ ] **Templates** — pre-built layouts (may be delivered via AI Agent)
- [ ] **Pen/drawing tool** — freehand strokes (was in original PRD; not yet re-implemented after canvas refactor)

## IMPORTANT PATTERNS TO KNOW

### Coordinate Systems
- All element `x/y` are in **board space** (Konva Layer local coordinates)
- All Konva Layers share the same transform: `x={stageX} y={stageY} scaleX={scale} scaleY={scale}`
- HTML overlays (editors, toolbars) use `position: absolute` within the canvas container div
- Convert board → screen: `screenX = stageX + boardX * scale`

### HTML Editors Over Konva Canvas
- `FrameTitleEditorOverlay`, `ConnectorLabelEditor`, standalone text `<textarea>` are all `position: absolute` inside the canvas container — NOT portals
- When editing, the corresponding Konva node is hidden (e.g., `conn.id !== editingConnectorId`) so the HTML input appears to replace it
- `ConnectorLabelEditor` mirrors exact Konva label dimensions scaled by `scale`

### Connector Rendering (ConnectorsLayer.tsx)
- Straight: `points=[from.x, from.y, to.x, to.y]`, `tension=0`
- Curved: adds perpendicular control point at midpoint (25% of length offset), `tension=0.5`
- Has an invisible wide Arrow for hit detection (easier clicking), a selection glow Arrow, and the visible Arrow
- Label midpoint for curved: quadratic bezier formula `(p0 + 2*p1 + p2) / 4`

### State Management for Real-time Drag + Connectors
The `noteMap`/`shapeMap` construction in `WhiteboardCanvas.tsx` follows this priority:
1. Start with `persistedNotes` (Firestore)
2. Apply `localNoteOverrides` if present (current user's drag position)
3. Apply `remoteNotes` (RTDB) — **only if no local override for that ID**
4. Apply `optimisticNotes` (newly created, not yet in Firestore)

This ensures connectors always see the live drag position, not the stale database position.

## ENVIRONMENT
- Node.js + npm
- Firebase project: `collab-board-rj`
- `.env.local` contains Firebase config (not committed)
- Dev server: `npm run dev` → http://localhost:3000
- Build: `npm run build:done`
- Deploy: `firebase deploy --only hosting` (static) or full `firebase deploy`
