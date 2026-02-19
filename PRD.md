# Product Requirements Document: CollabBoard

## Core Objective
A high-performance, real-time collaborative whiteboard with AI-assisted brainstorming capabilities. Built on Firebase (Blaze plan) with a focus on a polished, Figma-like canvas experience.

## Tech Stack
- **Frontend:** Next.js 16 (App Router), React 19, TypeScript
- **Canvas:** Konva / react-konva (HTML5 Canvas)
- **Backend/Sync:** Firebase Firestore (persistent elements) + Firebase Realtime Database (ephemeral: cursors, active drags)
- **Auth:** Firebase Anonymous Authentication
- **Hosting:** Firebase App Hosting (backend SSR) + Firebase Hosting (static fallback)
- **AI:** Vercel AI SDK + GPT-4o-mini ("Magic" button to cluster sticky notes into themes)
- **Styling:** Tailwind CSS

## Canvas Element Types
All elements are stored as documents in `boards/{boardId}/elements` in Firestore.

### 1. Sticky Notes (`type: "sticky-note"`)
- Freely draggable, resizable rectangles with colored backgrounds
- Double-click to open inline HTML textarea editor
- Fields: `id, type, text, color, x, y, width, height, createdBy, createdAt, updatedAt`

### 2. Shapes (`type: "shape"`)
- Rect, circle (ellipse), triangle
- Draggable, resizable via Konva Transformer
- Fields: `id, type, shapeType, x, y, width, height, fill, stroke, strokeWidth, createdBy, createdAt, updatedAt`

### 3. Text Elements (`type: "text"`)
- Standalone floating text nodes
- Click to select; double-click to open inline HTML editor
- Supports: bold, italic, font size, font family, text color
- Text formatting toolbar appears above selected text element
- Fields: `id, type, text, x, y, width, height, fontSize, fontFamily, bold, italic, fill, createdBy, createdAt, updatedAt`

### 4. Frames (`type: "frame"`)
- Labeled grouping containers (like Figma frames)
- Title bar with semi-bold text, tinted background, separator line
- Double-click title to open inline HTML title editor
- Long titles truncated with ellipsis in Konva; editor shows full text
- Fields: `id, type, title, x, y, width, height, fill, stroke, createdBy, createdAt, updatedAt`

### 5. Connectors (`type: "connector"`)
- Lines/arrows between sticky notes and shapes
- Attach to the closest of 4 cardinal anchor points (top/right/bottom/left edge midpoints) on each connected element
- Connectors follow connected elements in real-time during drag
- Inline label editor (double-click connector or label to edit)
- Style options: line vs arrow, dashed, curved (quadratic bezier), bidirectional, stroke width, stroke color
- Clicking a connector selects it and shows the ConnectorStyleBar toolbar
- Fields: `id, type, fromId, toId, fromType, toType, style, stroke, strokeWidth, dashed, curved, bidirectional, label, createdBy, createdAt, updatedAt`

## Core Canvas Features

### Pan & Zoom
- Scroll to pan, Ctrl+Scroll to zoom
- Pinch-to-zoom on touch devices
- Zoom controls UI (bottom-right): zoom in, zoom out, percentage display, fit-to-screen
- Fit-to-screen: computes union bounding box of all elements and zooms/pans to show all
- `usePanZoom` hook: manages `scale`, `stageX`, `stageY`, `screenToBoard()`, `fitToContent(bbox)`

### Selection & Editing
- Click to select, Shift+Click to multi-select
- Drag on empty canvas to box-select
- Konva `Transformer` handles resize handles for selected elements
- Multi-select: move, duplicate, copy/paste, delete
- Context menu (right-click): color picker, duplicate, copy, paste, delete

### Undo / Redo
- 50-step local history stack via `useUndoRedo` hook
- Captures full board snapshot (notes, shapes, text, frames) before each mutation
- On restore: writes all elements back to Firestore
- Keyboard: Ctrl+Z / Ctrl+Y

### Snap to Grid
- `GRID_SIZE = 20px` in board space
- Toggled from header "Snap" button
- Applied on `dragEnd` for all element types (notes, shapes, frames, text)
- `snapPos(x, y)` utility in `src/features/whiteboard/snapGrid.ts`

### Grid Overlay
- Toggled from header "Grid" button
- Rendered as a Konva Layer (`GridLayer.tsx`) with lines spaced 20px apart
- Updates with pan/zoom

### Export
- Header "Export" button → `exportBoardAsPng(stage)` → Konva `stage.toDataURL()`
- Exports at device pixel ratio for retina quality

### Browser Zoom Resilience
- `ResizeObserver` + `window.visualViewport.resize` + `window.resize` listeners in `page.tsx`
- Canvas size uses `Math.ceil` to prevent 1px gaps
- `pixelRatio` state tracks `window.devicePixelRatio` and is passed to Konva `Stage`
- `key={pixelRatio}` forces Stage remount on DPR change → eliminates blurriness

## Real-time Collaboration
- **Firestore:** Persistent element storage. Each element type queried separately with `where("type", "==", ...)`
- **RTDB:** Ephemeral data — cursors (`cursors/{boardId}/{userId}`) and active note drags (`notes/{boardId}`)
- **Remote cursors:** Other users' cursors rendered as colored dots with name labels
- **Remote drags:** `useRemoteNotes` / `useRemoteShapes` subscribe to RTDB for other users' live drag positions
- **Conflict resolution:** Local drag overrides take priority over remote snapshots (checked via `localNoteOverrides.has(id)` guard). Remote updates only apply when no local override exists for that element.

## Sync Architecture (Critical Details)
- `persistedNotes` = Firestore listener (source of truth after save)
- `remoteNotes` = RTDB listener (other users' live positions)
- `localNoteOverrides` = Map of in-progress drag positions for current user's elements
- `noteMap` construction order: persistedNotes → apply localOverride if exists → remoteNotes (skipped if localOverride exists) → optimisticNotes
- Cleanup effects clear `localOverrides` on Firestore update, but **skip** the element currently being dragged (tracked via `draggingElementIdRef` updated by `useLayoutEffect`)

## UI Structure

### Board Page (`src/app/[boardId]/page.tsx`)
- Header: board name (editable), Undo, Redo, Export, Grid toggle, Snap toggle, user display name, Sign Out, New Board
- Toolbar (left side): Select, Sticky Note, Rect, Circle, Triangle, Text, Frame, Connector tools
- Canvas area: `absolute inset-0`, contains `WhiteboardCanvas`
- Canvas size tracked with `ResizeObserver` + `visualViewport` + `window.resize`

### WhiteboardCanvas (`src/features/whiteboard/WhiteboardCanvas.tsx`)
- `forwardRef` with `WhiteboardCanvasHandle` exposing: `getNotes`, `createNotesFromAI`, `clearCanvas`, `deleteSelection`, `exportImage`, `undo`, `redo`, `showShortcuts`
- Konva `Stage` with multiple `Layer`s rendered in order:
  1. `GridLayer` (conditional, non-interactive)
  2. `FramesLayer`
  3. `StickyNotesLayer`
  4. `ShapesLayer`
  5. `TextElementsLayer`
  6. `ConnectorsLayer`
  7. Selection box layer
  8. Remote cursors layer
- HTML overlays (position: absolute within canvas container):
  - `FrameTitleEditorOverlay` — appears over frame title on double-click
  - Standalone text editor (textarea) — appears over text element on double-click
  - `ConnectorLabelEditor` — appears over connector midpoint on double-click; hides Konva label while open
  - `ConnectorStyleBar` — appears at top-center when connector is selected
  - `TextFormatBar` — appears above selected text element
  - `ZoomControls` — bottom-right corner
  - `KeyboardShortcutsModal` — full-screen modal, triggered by `?` key

## Keyboard Shortcuts
| Key | Action |
|-----|--------|
| `?` | Toggle keyboard shortcuts modal |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` | Redo |
| `Ctrl+E` | Export PNG |
| `Delete` / `Backspace` | Delete selected elements or selected connector |
| `Escape` | Deselect / close modal |
| `Ctrl+C` | Copy selection |
| `Ctrl+V` | Paste |
| `Ctrl+D` | Duplicate |
| `Ctrl+G` | Toggle grid |
| `Ctrl+Shift+S` | Toggle snap |

## File Structure
```
src/
  app/
    page.tsx                        # Home / board list
    [boardId]/page.tsx              # Board page (sizing, header, toolbar)
  components/
    ColorPaletteMenu.tsx
    ConnectorStyleBar.tsx           # Connector style floating toolbar
    KeyboardShortcutsModal.tsx      # ? modal
    TextFormatBar.tsx               # Text element formatting toolbar
    ZoomControls.tsx                # Zoom in/out/fit-to-screen UI
  features/
    connectors/
      ConnectorsLayer.tsx           # Konva layer; anchor routing, selection, styles
      index.ts
      types.ts                      # ConnectorElement, ConnectorDoc
      usePersistedConnectors.ts     # Firestore CRUD + createDefaultConnector
    frames/
      FrameNode.tsx                 # Konva frame with title bar, separator
      FramesLayer.tsx               # Manages all frames; snap on drag
      index.ts
      types.ts
      usePersistedFrames.ts
    pan-zoom/
      usePanZoom.ts                 # scale, stageX/Y, fitToContent, pinch zoom
    shapes/
      ShapeNode.tsx
      ShapesLayer.tsx
      index.ts
      types.ts
      usePersistedShapes.ts
      useRemoteShapes.ts            # RTDB listener for other users' shape drags
    sticky-notes/
      StickyNote.tsx
      StickyNotesLayer.tsx
      index.ts
      types.ts
      usePersistedNotes.ts
      useRemoteNotes.ts             # RTDB listener for other users' note drags
    text-elements/
      TextElementsLayer.tsx
      TextNode.tsx
      index.ts
      types.ts
      usePersistedTextElements.ts
    toolbar/
      Toolbar.tsx
      types.ts
    whiteboard/
      exportBoard.ts
      GridLayer.tsx
      snapGrid.ts                   # GRID_SIZE=20, snapPos(), snapToGrid()
      useUndoRedo.ts                # 50-step local history
      WhiteboardCanvas.tsx          # Main canvas component (~1900 lines)
  lib/
    firebase.ts                     # Firebase app, db, auth, getFirebaseDatabase()
```

## Known Decisions / Non-Obvious Patterns
- Connectors use board-space coordinates throughout; `ConnectorsLayer` applies its own `x/y/scaleX/scaleY` props matching the stage transform.
- `FrameTitleEditorOverlay` and `ConnectorLabelEditor` are rendered as `position: absolute` HTML elements inside the canvas container div (not `createPortal`), so they naturally inherit the container's coordinate space. Their positions are computed as `stageX + boardX * scale`.
- The `ConnectorLabelEditor` mirrors the Konva label's exact dimensions: width = `max(chars*8+8, 80) * scale`, height = `20 * scale`, font = `12 * scale`.
- When a connector is being label-edited, its Konva label Group is hidden (`conn.id !== editingConnectorId`) so the HTML input overlays it seamlessly.
- `dragBoundFunc` in StickyNote/ShapeNode receives and returns **absolute screen coordinates**; `node.x()` in `onDragMove` returns **board-space (local layer) coordinates**.
- The `remoteNotes` loop in `noteMap` construction skips elements with a `localNoteOverrides` entry to prevent Firebase RTDB snapshots from clobbering in-progress drag positions.

## Pending / Future Work
- [ ] **Image upload** — place and resize images on the canvas
- [ ] **Real-time collaboration cursors** — show other users' cursors with names (RTDB infrastructure exists)
- [ ] **More shape types** — diamond, hexagon, star, speech bubble
- [ ] **Minimap** — small overview panel for large boards
- [ ] **Layers / Z-order panel** — list elements, reorder, lock/hide
- [ ] **Templates** — pre-built layouts (flowchart, kanban, mind map)
- [ ] **Pen/drawing tool** — freehand strokes (was in original PRD, not yet re-implemented after canvas refactor)
- [ ] **AI Magic button** — cluster sticky notes into themes via GPT-4o-mini (Vercel AI SDK)
