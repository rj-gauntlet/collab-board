"use client";

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
  useImperativeHandle,
  forwardRef,
  useRef,
} from "react";
import { createPortal } from "react-dom";
import Konva from "konva";
import { Stage, Layer, Rect } from "react-konva";
import { useSyncCursor } from "@/features/cursors/useSyncCursor";
import { RemoteCursors } from "@/features/cursors/RemoteCursors";
import { clearBoard } from "./clearBoard";
import {
  StickyNotesLayer,
  usePersistedNotes,
  persistNote,
  deleteNote,
  createDefaultNote,
} from "@/features/sticky-notes";
import { useRemoteNotes } from "@/features/sticky-notes/useRemoteNotes";
import { useSyncDragging } from "@/features/sticky-notes/useSyncDragging";
import {
  ShapesLayer,
  usePersistedShapes,
  persistShape,
  deleteShape,
  createDefaultShape,
} from "@/features/shapes";
import { useRemoteShapes } from "@/features/shapes/useRemoteShapes";
import {
  ConnectorsLayer,
  usePersistedConnectors,
  createDefaultConnector,
  persistConnector,
  deleteConnector,
} from "@/features/connectors";
import {
  TextElementsLayer,
  usePersistedTextElements,
  createDefaultTextElement,
  persistTextElement,
  deleteTextElement,
} from "@/features/text-elements";
import {
  FramesLayer,
  usePersistedFrames,
  createDefaultFrame,
  persistFrame,
  deleteFrame,
  FRAME_TITLE_BAR_HEIGHT,
} from "@/features/frames";
import { usePanZoom } from "@/features/pan-zoom";
import {
  ColorPaletteMenu,
  getShapeStrokeForFill,
} from "@/components/ColorPaletteMenu";
import { ZoomControls } from "@/components/ZoomControls";
import { TextFormatBar } from "@/components/TextFormatBar";
import { ConnectorStyleBar } from "@/components/ConnectorStyleBar";
import { KeyboardShortcutsModal } from "@/components/KeyboardShortcutsModal";
import { GridLayer } from "./GridLayer";
import { exportBoardAsPng } from "./exportBoard";
import { snapPos, GRID_SIZE } from "./snapGrid";
import { useUndoRedo, type BoardSnapshot } from "./useUndoRedo";
import type { StickyNoteElement } from "@/features/sticky-notes";
import type { Tool } from "@/features/toolbar";
import type { ShapeElement } from "@/features/shapes";
import type { TextElement } from "@/features/text-elements";
import type { FrameElement } from "@/features/frames";
import type { ConnectorElement } from "@/features/connectors";
import type { BoardStateSummary } from "@/features/ai-agent/board-agent-types";

const FRAME_BODY_PADDING = 8;

/** If (x,y) is inside a frame's title bar zone, return y adjusted to the content area below the title bar. */
function clampYBelowFrameTitleBar(
  x: number,
  y: number,
  frames: FrameElement[]
): { x: number; y: number } {
  let adjustedY = y;
  for (const f of frames) {
    const inFrame = x >= f.x && x < f.x + f.width && y >= f.y && y < f.y + f.height;
    const inTitleBar = inFrame && y < f.y + FRAME_TITLE_BAR_HEIGHT;
    if (inTitleBar) {
      adjustedY = Math.max(adjustedY, f.y + FRAME_TITLE_BAR_HEIGHT + FRAME_BODY_PADDING);
    }
  }
  return { x, y: adjustedY };
}

export interface WhiteboardCanvasHandle {
  getNotes: () => StickyNoteElement[];
  getBoardState: () => BoardStateSummary[];
  createNotesFromAI: (
    notes: Array<{ text: string; color?: string; x?: number; y?: number; width?: number; height?: number }>
  ) => void;
  createStickyNotesGridFromAI: (rows: number, columns: number, options?: { labels?: string[]; startX?: number; startY?: number; spacing?: number }) => void;
  createShapesFromAI: (items: Array<{ shapeType: "rect" | "circle" | "triangle"; fill?: string; x?: number; y?: number; width?: number; height?: number }>) => void;
  createFramesFromAI: (items: Array<{ title: string; x?: number; y?: number; width?: number; height?: number }>) => void;
  createConnectorsFromAI: (items: Array<{
    fromId: string;
    toId: string;
    label?: string;
    style?: "line" | "arrow";
    stroke?: string;
    strokeWidth?: number;
    dashed?: boolean;
    curved?: boolean;
    bidirectional?: boolean;
  }>) => void;
  moveElementsByAgent: (ids: string[], dx: number, dy: number) => void;
  updateElementsByAgent: (updates: Array<{
    id: string;
    text?: string;
    title?: string;
    color?: string;
    fill?: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    stroke?: string;
    strokeWidth?: number;
    dashed?: boolean;
    curved?: boolean;
    bidirectional?: boolean;
    label?: string;
    style?: "line" | "arrow";
  }>) => void;
  deleteElementsByAgent: (ids: string[]) => void;
  arrangeGridByAgent: (ids: string[], columns?: number, spacing?: number) => void;
  resizeFrameToFitByAgent: (frameId: string, padding?: number) => void;
  distributeElementsByAgent: (ids: string[], direction: "horizontal" | "vertical", spacing?: number) => void;
  clearCanvas: () => Promise<void>;
  /** Create a flowchart: one frame, sticky notes with optional labels (default: Start, Step 1, Step 2, End), and arrows between them. */
  createFlowchart: (labels?: string[]) => void;
  deleteSelection: () => void;
  exportImage: () => void;
  undo: () => void;
  redo: () => void;
  showShortcuts: () => void;
}

const SHAPE_TOOLS = ["rect", "triangle", "circle"] as const;
function isShapeTool(t: Tool): t is "rect" | "triangle" | "circle" {
  return SHAPE_TOOLS.includes(t as (typeof SHAPE_TOOLS)[number]);
}

interface WhiteboardCanvasProps {
  boardId: string;
  userId: string;
  displayName?: string | null;
  width: number;
  height: number;
  /** Pass window.devicePixelRatio so the canvas buffer stays crisp across browser zoom changes. */
  pixelRatio?: number;
  activeTool: Tool;
  snapEnabled?: boolean;
  gridVisible?: boolean;
  onSelectionChange?: (selectedCount: number) => void;
}

function isClickOnStickyNote(target: Konva.Node | null): boolean {
  let node: Konva.Node | null = target;
  while (node) {
    if (node.name() === "sticky-note") return true;
    node = node.getParent();
  }
  return false;
}

function isClickOnShape(target: Konva.Node | null): boolean {
  let node: Konva.Node | null = target;
  while (node) {
    if (node.name() === "shape") return true;
    node = node.getParent();
  }
  return false;
}

function isClickOnTransformer(target: Konva.Node | null): boolean {
  let node: Konva.Node | null = target;
  while (node) {
    if (node.name() === "transformer") return true;
    node = node.getParent();
  }
  return false;
}

type ClickedElementType = "note" | "shape";
function getClickedElement(
  target: Konva.Node | null
): { id: string; type: ClickedElementType } | null {
  let node: Konva.Node | null = target;
  while (node) {
    const name = node.name();
    if (name === "sticky-note" || name === "shape") {
      const id = node.getAttr("data-elementId") as string | undefined;
      if (id)
        return {
          id,
          type: name === "sticky-note" ? "note" : "shape",
        };
      return null;
    }
    node = node.getParent();
  }
  return null;
}

function isClickOnTextElement(target: Konva.Node | null): boolean {
  let node: Konva.Node | null = target;
  while (node) {
    if (node.name() === "text-element") return true;
    node = node.getParent();
  }
  return false;
}

function isClickOnFrame(target: Konva.Node | null): boolean {
  let node: Konva.Node | null = target;
  while (node) {
    if (node.name() === "frame") return true;
    node = node.getParent();
  }
  return false;
}

export const WhiteboardCanvas = forwardRef<
  WhiteboardCanvasHandle,
  WhiteboardCanvasProps
>(function WhiteboardCanvas(
  { boardId, userId, displayName, width, height, pixelRatio = 1, activeTool, snapEnabled = false, gridVisible = false, onSelectionChange },
  ref
) {
  const stageRef = useRef<Konva.Stage>(null);
  const [optimisticNotes, setOptimisticNotes] = useState<StickyNoteElement[]>([]);
  const [localNoteOverrides, setLocalNoteOverrides] = useState<
    Map<string, StickyNoteElement>
  >(new Map());
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionBox, setSelectionBox] = useState<{
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  } | null>(null);
  const [optimisticShapes, setOptimisticShapes] = useState<
    import("@/features/shapes").ShapeElement[]
  >([]);
  const [localShapeOverrides, setLocalShapeOverrides] = useState<
    Map<string, import("@/features/shapes").ShapeElement>
  >(new Map());
  const [connectorFrom, setConnectorFrom] = useState<{
    id: string;
    type: "note" | "shape";
  } | null>(null);
  const [connectorPreviewTo, setConnectorPreviewTo] = useState<{ x: number; y: number } | null>(null);
  const [draggingState, setDraggingState] = useState<{
    isDragging: boolean;
    elementId: string | null;
    x: number;
    y: number;
  }>({ isDragging: false, elementId: null, x: 0, y: 0 });
  // Ref so cleanup effects can read the current dragging element without stale closures.
  const draggingElementIdRef = useRef<string | null>(null);
  // useLayoutEffect runs synchronously after every render, before passive effects,
  // so the ref is always current by the time Firestore cleanup effects fire.
  useLayoutEffect(() => {
    draggingElementIdRef.current = draggingState.elementId;
  }, [draggingState.elementId]);

  type ContextMenu =
    | { type: "note"; note: StickyNoteElement; clientX: number; clientY: number }
    | { type: "shape"; shape: ShapeElement; clientX: number; clientY: number }
    | { type: "text"; text: TextElement; clientX: number; clientY: number }
    | { type: "frame"; frame: FrameElement; clientX: number; clientY: number };
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);

  const [optimisticTextElements, setOptimisticTextElements] = useState<TextElement[]>([]);
  const [localTextOverrides, setLocalTextOverrides] = useState<Map<string, TextElement>>(new Map());
  const [optimisticFrames, setOptimisticFrames] = useState<FrameElement[]>([]);
  const [localFrameOverrides, setLocalFrameOverrides] = useState<Map<string, FrameElement>>(new Map());
  const [clipboardNotes, setClipboardNotes] = useState<StickyNoteElement[]>([]);
  const [clipboardShapes, setClipboardShapes] = useState<ShapeElement[]>([]);
  const [clipboardTextElements, setClipboardTextElements] = useState<TextElement[]>([]);
  const [clipboardFrames, setClipboardFrames] = useState<FrameElement[]>([]);
  const [editingFrameTitle, setEditingFrameTitle] = useState<{
    frameId: string;
    initialTitle: string;
  } | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [editingConnectorLabel, setEditingConnectorLabel] = useState<{
    connectorId: string;
    boardMidX: number;
    boardMidY: number;
    label: string;
  } | null>(null);
  const [selectedConnectorId, setSelectedConnectorId] = useState<string | null>(null);
  const [restoredSnapshot, setRestoredSnapshot] = useState<BoardSnapshot | null>(null);

  const {
    scale,
    stageX,
    stageY,
    screenToBoard,
    handleWheel,
    handlePanStart,
    handlePanMove,
    handlePanEnd,
    resetView,
    fitToContent,
    zoomIn,
    zoomOut,
    handlePinch,
    handlePinchEnd,
  } = usePanZoom(width, height);

  const { syncCursor } = useSyncCursor(boardId, userId, displayName);

  const persistedNotes = usePersistedNotes(boardId);
  const remoteNotes = useRemoteNotes(boardId);

  const persistedShapes = usePersistedShapes(boardId);
  const remoteShapes = useRemoteShapes(boardId);
  const connectors = usePersistedConnectors(boardId);
  const persistedTextElements = usePersistedTextElements(boardId);
  const persistedFrames = usePersistedFrames(boardId);

  useSyncDragging(
    boardId,
    userId,
    draggingState.isDragging,
    draggingState.elementId,
    draggingState.x,
    draggingState.y
  );

  useEffect(() => {
    if (activeTool !== "connector") {
      setConnectorFrom(null);
      setConnectorPreviewTo(null);
    }
  }, [activeTool]);

  // ── Refs (populated after derived-state computation each render) ────────────
  const notesRef = useRef<StickyNoteElement[]>([]);
  const shapesRef = useRef<ShapeElement[]>([]);
  const textElementsRef = useRef<TextElement[]>([]);
  const framesRef = useRef<FrameElement[]>([]);
  const connectorsRef = useRef<ConnectorElement[]>([]);

  // ── Undo / Redo (must be defined before any callback that calls captureSnapshot) ──
  const handleRestore = useCallback((snapshot: BoardSnapshot) => {
    const currentNotes = notesRef.current;
    const currentShapes = shapesRef.current;
    const currentText = textElementsRef.current;
    const currentFrames = framesRef.current;
    const snapshotNoteIds = new Set(snapshot.notes.map((n) => n.id));
    const snapshotShapeIds = new Set(snapshot.shapes.map((s) => s.id));
    const snapshotTextIds = new Set(snapshot.textElements.map((t) => t.id));
    const snapshotFrameIds = new Set(snapshot.frames.map((f) => f.id));

    currentNotes.forEach((n) => {
      if (!snapshotNoteIds.has(n.id)) deleteNote(boardId, n.id).catch(console.error);
    });
    currentShapes.forEach((s) => {
      if (!snapshotShapeIds.has(s.id)) deleteShape(boardId, s.id).catch(console.error);
    });
    currentText.forEach((t) => {
      if (!snapshotTextIds.has(t.id)) deleteTextElement(boardId, t.id).catch(console.error);
    });
    currentFrames.forEach((f) => {
      if (!snapshotFrameIds.has(f.id)) deleteFrame(boardId, f.id).catch(console.error);
    });

    snapshot.notes.forEach((n) => persistNote(boardId, n).catch(console.error));
    snapshot.shapes.forEach((s) => persistShape(boardId, s).catch(console.error));
    snapshot.textElements.forEach((t) => persistTextElement(boardId, t).catch(console.error));
    snapshot.frames.forEach((f) => persistFrame(boardId, f).catch(console.error));

    setOptimisticNotes([]);
    setOptimisticShapes([]);
    setOptimisticTextElements([]);
    setOptimisticFrames([]);
    setLocalNoteOverrides(() => {
      const m = new Map<string, StickyNoteElement>();
      snapshot.notes.forEach((n) => m.set(n.id, n));
      return m;
    });
    setLocalShapeOverrides(() => {
      const m = new Map<string, ShapeElement>();
      snapshot.shapes.forEach((s) => m.set(s.id, s));
      return m;
    });
    setLocalTextOverrides(() => {
      const m = new Map<string, TextElement>();
      snapshot.textElements.forEach((t) => m.set(t.id, t));
      return m;
    });
    setLocalFrameOverrides(() => {
      const m = new Map<string, FrameElement>();
      snapshot.frames.forEach((f) => m.set(f.id, f));
      return m;
    });
    setRestoredSnapshot(snapshot);
  }, [boardId]);

  const { push: pushSnapshot, undo: undoAction, redo: redoAction } = useUndoRedo(handleRestore);

  const getCurrentSnapshot = useCallback((): BoardSnapshot => ({
    notes: notesRef.current,
    shapes: shapesRef.current,
    textElements: textElementsRef.current,
    frames: framesRef.current,
  }), []);

  const captureSnapshot = useCallback(() => {
    setRestoredSnapshot(null);
    pushSnapshot(getCurrentSnapshot());
  }, [pushSnapshot, getCurrentSnapshot]);

  const handleNoteUpdate = useCallback((note: StickyNoteElement) => {
    setLocalNoteOverrides((prev) => {
      const next = new Map(prev);
      next.set(note.id, note);
      return next;
    });
  }, []);

  const handleCreateNote = useCallback(
    (x: number, y: number) => {
      captureSnapshot();
      const note = createDefaultNote(x, y, userId);
      setOptimisticNotes((prev) => [...prev, note]);
      persistNote(boardId, note).catch((err) => {
        console.error("Failed to create note:", err);
        setOptimisticNotes((prev) => prev.filter((n) => n.id !== note.id));
      });
    },
    [boardId, userId, captureSnapshot]
  );

  const handleCreateShape = useCallback(
    (x: number, y: number) => {
      captureSnapshot();
      const kind = isShapeTool(activeTool) ? activeTool : "rect";
      const shape = createDefaultShape(x, y, userId, kind);
      setOptimisticShapes((prev) => [...prev, shape]);
      persistShape(boardId, shape).catch((err) => {
        console.error("Failed to create shape:", err);
        setOptimisticShapes((prev) => prev.filter((s) => s.id !== shape.id));
      });
    },
    [boardId, userId, activeTool, captureSnapshot]
  );

  const handleShapeUpdate = useCallback(
    (shape: import("@/features/shapes").ShapeElement) => {
      setLocalShapeOverrides((prev) => {
        const next = new Map(prev);
        next.set(shape.id, shape);
        return next;
      });
    },
    []
  );

  const handleNoteContextMenu = useCallback(
    (note: StickyNoteElement, evt: MouseEvent) => {
      evt.preventDefault();
      setContextMenu({ type: "note", note, clientX: evt.clientX, clientY: evt.clientY });
    },
    []
  );

  const handleShapeContextMenu = useCallback(
    (shape: ShapeElement, evt: MouseEvent) => {
      evt.preventDefault();
      setContextMenu({ type: "shape", shape, clientX: evt.clientX, clientY: evt.clientY });
    },
    []
  );

  const handleCreateText = useCallback(
    (x: number, y: number) => {
      captureSnapshot();
      const text = createDefaultTextElement(x, y, userId);
      setOptimisticTextElements((prev) => [...prev, text]);
      persistTextElement(boardId, text).catch((err) => {
        console.error("Failed to create text:", err);
        setOptimisticTextElements((prev) => prev.filter((t) => t.id !== text.id));
      });
    },
    [boardId, userId, captureSnapshot]
  );

  const handleTextUpdate = useCallback((text: TextElement) => {
    setLocalTextOverrides((prev) => {
      const next = new Map(prev);
      next.set(text.id, text);
      return next;
    });
  }, []);

  const handleSelectText = useCallback((id: string, addToSelection: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (addToSelection) {
        if (next.has(id)) next.delete(id);
        else next.add(id);
      } else {
        next.clear();
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleTextContextMenu = useCallback(
    (text: TextElement, evt: MouseEvent) => {
      evt.preventDefault();
      setContextMenu({ type: "text", text, clientX: evt.clientX, clientY: evt.clientY });
    },
    []
  );

  const handleCreateFrame = useCallback(
    (x: number, y: number) => {
      captureSnapshot();
      const frame = createDefaultFrame(x, y, userId);
      setOptimisticFrames((prev) => [...prev, frame]);
      persistFrame(boardId, frame).catch((err) => {
        console.error("Failed to create frame:", err);
        setOptimisticFrames((prev) => prev.filter((f) => f.id !== frame.id));
      });
    },
    [boardId, userId, captureSnapshot]
  );

  const handleFrameUpdate = useCallback((frame: FrameElement) => {
    setLocalFrameOverrides((prev) => {
      const next = new Map(prev);
      next.set(frame.id, frame);
      return next;
    });
  }, []);

  const handleSelectFrame = useCallback((id: string, addToSelection: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (addToSelection) {
        if (next.has(id)) next.delete(id);
        else next.add(id);
      } else {
        next.clear();
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleFrameContextMenu = useCallback(
    (frame: FrameElement, evt: MouseEvent) => {
      evt.preventDefault();
      setContextMenu({ type: "frame", frame, clientX: evt.clientX, clientY: evt.clientY });
    },
    []
  );

  const deleteByIds = useCallback((ids: Set<string>) => {
    captureSnapshot();
    for (const id of ids) {
      const asNote = notesRef.current.some((n) => n.id === id);
      if (asNote) {
        deleteNote(boardId, id).catch((err) =>
          console.error("Failed to delete note:", err)
        );
        setOptimisticNotes((prev) => prev.filter((n) => n.id !== id));
        setLocalNoteOverrides((prev) => {
          const next = new Map(prev);
          next.delete(id);
          return next;
        });
        setEditingNoteId((eid) => (eid === id ? null : eid));
      } else {
        const asShape = shapesRef.current.some((s) => s.id === id);
        const asText = textElementsRef.current.some((t) => t.id === id);
        if (asShape) {
          deleteShape(boardId, id).catch((err) =>
            console.error("Failed to delete shape:", err)
          );
          setOptimisticShapes((prev) => prev.filter((s) => s.id !== id));
          setLocalShapeOverrides((prev) => {
            const next = new Map(prev);
            next.delete(id);
            return next;
          });
        } else if (asText) {
          deleteTextElement(boardId, id).catch((err) =>
            console.error("Failed to delete text:", err)
          );
          setOptimisticTextElements((prev) => prev.filter((t) => t.id !== id));
          setLocalTextOverrides((prev) => {
            const next = new Map(prev);
            next.delete(id);
            return next;
          });
        } else {
          const asFrame = framesRef.current.some((f) => f.id === id);
          const asConnector = connectorsRef.current.some((c) => c.id === id);
          if (asFrame) {
            deleteFrame(boardId, id).catch((err) =>
              console.error("Failed to delete frame:", err)
            );
            setOptimisticFrames((prev) => prev.filter((f) => f.id !== id));
            setLocalFrameOverrides((prev) => {
              const next = new Map(prev);
              next.delete(id);
              return next;
            });
          } else if (asConnector) {
            deleteConnector(boardId, id).catch((err) =>
              console.error("Failed to delete connector:", err)
            );
            setSelectedConnectorId((prev) => (prev === id ? null : prev));
          }
        }
      }
    }
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.delete(id);
      return next;
    });
  }, [boardId]);

  const handleDelete = useCallback(() => {
    if (!contextMenu) return;
    const contextItemId =
      contextMenu.type === "note"
        ? contextMenu.note.id
        : contextMenu.type === "shape"
          ? contextMenu.shape.id
          : contextMenu.type === "text"
            ? contextMenu.text.id
            : contextMenu.frame.id;
    const deleteIds = selectedIds.has(contextItemId)
      ? new Set(selectedIds)
      : new Set<string>([contextItemId]);
    deleteByIds(deleteIds);
    setContextMenu(null);
  }, [contextMenu, selectedIds, deleteByIds]);

  const handleDeleteSelection = useCallback(() => {
    if (selectedIds.size === 0) return;
    deleteByIds(new Set(selectedIds));
  }, [selectedIds, deleteByIds]);

  const handleColorSelect = useCallback(
    (color: string) => {
      if (!contextMenu) return;
      if (contextMenu.type === "note") {
        const updated: StickyNoteElement = {
          ...contextMenu.note,
          color,
          updatedAt: Date.now(),
        };
        handleNoteUpdate(updated);
        persistNote(boardId, updated).catch((err) =>
          console.error("Failed to persist note color:", err)
        );
      } else if (contextMenu.type === "shape") {
        const updated: ShapeElement = {
          ...contextMenu.shape,
          fill: color,
          stroke: getShapeStrokeForFill(color),
          updatedAt: Date.now(),
        };
        handleShapeUpdate(updated);
        persistShape(boardId, updated).catch((err) =>
          console.error("Failed to persist shape color:", err)
        );
      } else if (contextMenu.type === "text") {
        const updated: TextElement = {
          ...contextMenu.text,
          fill: color,
          updatedAt: Date.now(),
        };
        handleTextUpdate(updated);
        persistTextElement(boardId, updated).catch((err) =>
          console.error("Failed to persist text color:", err)
        );
      } else {
        const updated: FrameElement = {
          ...contextMenu.frame,
          fill: color,
          updatedAt: Date.now(),
        };
        handleFrameUpdate(updated);
        persistFrame(boardId, updated).catch((err) =>
          console.error("Failed to persist frame color:", err)
        );
      }
      setContextMenu(null);
    },
    [contextMenu, boardId, handleNoteUpdate, handleShapeUpdate, handleTextUpdate, handleFrameUpdate]
  );

  const clearCanvas = useCallback(async () => {
    await clearBoard(boardId);
    setOptimisticNotes([]);
    setOptimisticShapes([]);
    setOptimisticTextElements([]);
    setOptimisticFrames([]);
    setLocalNoteOverrides(new Map());
    setLocalShapeOverrides(new Map());
    setLocalTextOverrides(new Map());
    setLocalFrameOverrides(new Map());
  }, [boardId]);

  const createNotesFromAI = useCallback(
    (aiNotes: Array<{ text: string; color?: string; x?: number; y?: number; width?: number; height?: number }>) => {
      const frames = framesRef.current;
      let offsetY = 0;
      const newNotes: StickyNoteElement[] = [];
      for (const aiNote of aiNotes) {
        const x = aiNote.x ?? 100;
        const y = aiNote.y ?? 100 + offsetY;
        const { x: x2, y: y2 } = clampYBelowFrameTitleBar(x, y, frames);
        offsetY += (aiNote.height ?? 120) + 20;
        const note = createDefaultNote(x2, y2, userId);
        const fullNote: StickyNoteElement = {
          ...note,
          text: aiNote.text,
          color: aiNote.color ?? note.color,
          ...(aiNote.width != null && { width: aiNote.width }),
          ...(aiNote.height != null && { height: aiNote.height }),
        };
        newNotes.push(fullNote);
      }
      if (newNotes.length === 0) return;
      setOptimisticNotes((prev) => [...prev, ...newNotes]);
      for (const fullNote of newNotes) {
        persistNote(boardId, fullNote).catch((err) => {
          console.error("Failed to create AI note:", err);
          setOptimisticNotes((prev) => prev.filter((n) => n.id !== fullNote.id));
        });
      }
    },
    [boardId, userId]
  );

  const NOTE_GRID_WIDTH = 160;
  const NOTE_GRID_HEIGHT = 120;
  const DEFAULT_GRID_SPACING = 24;

  const createStickyNotesGridFromAI = useCallback(
    (rows: number, columns: number, options?: { labels?: string[]; startX?: number; startY?: number; spacing?: number }) => {
      const startX = options?.startX ?? 100;
      const startY = options?.startY ?? 100;
      const spacing = options?.spacing ?? DEFAULT_GRID_SPACING;
      const labels = options?.labels;
      const stepX = NOTE_GRID_WIDTH + spacing;
      const stepY = NOTE_GRID_HEIGHT + spacing;
      const items: Array<{ text: string; x: number; y: number; width: number; height: number }> = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < columns; c++) {
          const i = r * columns + c;
          const text = Array.isArray(labels) && labels[i] !== undefined ? String(labels[i]) : "";
          items.push({
            text,
            x: startX + c * stepX,
            y: startY + r * stepY,
            width: NOTE_GRID_WIDTH,
            height: NOTE_GRID_HEIGHT,
          });
        }
      }
      if (items.length > 0) {
        createNotesFromAI(items);
      }
    },
    [createNotesFromAI]
  );

  const getBoardState = useCallback((): BoardStateSummary[] => {
    const frames = framesRef.current;
    const isInsideFrame = (cx: number, cy: number, frame: FrameElement) =>
      cx >= frame.x && cx <= frame.x + frame.width && cy >= frame.y && cy <= frame.y + frame.height;
    const getParentFrameId = (x: number, y: number, w: number, h: number): string | undefined => {
      const cx = x + w / 2;
      const cy = y + h / 2;
      return frames.find((f) => isInsideFrame(cx, cy, f))?.id;
    };

    const summaries: BoardStateSummary[] = [];
    for (const n of notesRef.current) {
      summaries.push({
        id: n.id,
        type: "sticky-note",
        text: n.text,
        x: n.x,
        y: n.y,
        width: n.width,
        height: n.height,
        color: n.color,
        parentFrameId: getParentFrameId(n.x, n.y, n.width, n.height),
      });
    }
    for (const s of shapesRef.current) {
      summaries.push({
        id: s.id,
        type: "shape",
        x: s.x,
        y: s.y,
        width: s.width,
        height: s.height,
        fill: s.fill,
        kind: s.kind,
        parentFrameId: getParentFrameId(s.x, s.y, s.width, s.height),
      });
    }
    for (const t of textElementsRef.current) {
      const textH = 24;
      summaries.push({
        id: t.id,
        type: "text",
        text: t.text,
        x: t.x,
        y: t.y,
        width: t.width,
        height: textH,
        color: t.fill,
        parentFrameId: getParentFrameId(t.x, t.y, t.width, textH),
      });
    }
    for (const f of frames) {
      summaries.push({
        id: f.id,
        type: "frame",
        title: f.title,
        x: f.x,
        y: f.y,
        width: f.width,
        height: f.height,
      });
    }
    for (const c of connectorsRef.current) {
      summaries.push({
        id: c.id,
        type: "connector",
        fromId: c.fromId,
        toId: c.toId,
        ...(c.label != null && c.label !== "" && { label: c.label }),
        ...(c.style != null && { style: c.style }),
        ...(c.stroke != null && { stroke: c.stroke }),
        ...(c.strokeWidth != null && { strokeWidth: c.strokeWidth }),
        ...(c.dashed != null && { dashed: c.dashed }),
        ...(c.curved != null && { curved: c.curved }),
        ...(c.bidirectional != null && { bidirectional: c.bidirectional }),
      });
    }
    return summaries;
  }, []);

  const createShapesFromAI = useCallback(
    (items: Array<{ shapeType: "rect" | "circle" | "triangle"; fill?: string; x?: number; y?: number; width?: number; height?: number }>) => {
      const frames = framesRef.current;
      const newShapes: ShapeElement[] = [];
      for (const item of items) {
        const x = item.x ?? 100;
        const y = item.y ?? 100;
        const { x: x2, y: y2 } = clampYBelowFrameTitleBar(x, y, frames);
        const kind = item.shapeType === "circle" ? "circle" : item.shapeType === "triangle" ? "triangle" : "rect";
        const shape = createDefaultShape(x2, y2, userId, kind);
        const full: ShapeElement = {
          ...shape,
          ...(item.fill != null && { fill: item.fill }),
          ...(item.width != null && { width: item.width }),
          ...(item.height != null && { height: item.height }),
        };
        newShapes.push(full);
      }
      if (newShapes.length === 0) return;
      setOptimisticShapes((prev) => [...prev, ...newShapes]);
      for (const full of newShapes) {
        persistShape(boardId, full).catch((err) => {
          console.error("Failed to create AI shape:", err);
          setOptimisticShapes((prev) => prev.filter((s) => s.id !== full.id));
        });
      }
    },
    [boardId, userId]
  );

  const createFramesFromAI = useCallback(
    (items: Array<{ title: string; x?: number; y?: number; width?: number; height?: number }>) => {
      const newFrames: FrameElement[] = [];
      for (const item of items) {
        const x = item.x ?? 100;
        const y = item.y ?? 100;
        const frame = createDefaultFrame(x, y, userId);
        const full: FrameElement = {
          ...frame,
          title: item.title,
          ...(item.width != null && { width: item.width }),
          ...(item.height != null && { height: item.height }),
        };
        newFrames.push(full);
      }
      if (newFrames.length === 0) return;
      setOptimisticFrames((prev) => [...prev, ...newFrames]);
      for (const full of newFrames) {
        persistFrame(boardId, full).catch((err) => {
          console.error("Failed to create AI frame:", err);
          setOptimisticFrames((prev) => prev.filter((f) => f.id !== full.id));
        });
      }
    },
    [boardId, userId]
  );

  const DEFAULT_FLOWCHART_LABELS = ["Start", "Step 1", "Step 2", "End"];

  const createFlowchart = useCallback((labels?: string[]) => {
    captureSnapshot();
    const nodeLabels = (labels && labels.length >= 2 ? labels : DEFAULT_FLOWCHART_LABELS).map((t) => t.trim()).filter(Boolean);
    if (nodeLabels.length < 2) return;

    const PAD = 24;
    const TITLE_BAR = 28;
    const NOTE_W = 140;
    const NOTE_H = 80;
    const GAP = 20;
    const FRAME_WIDTH = 320;
    const FRAME_HEIGHT = TITLE_BAR + PAD * 2 + nodeLabels.length * NOTE_H + (nodeLabels.length - 1) * GAP;

    const boardCenterX = (-stageX + width / 2) / scale;
    const boardCenterY = (-stageY + height / 2) / scale;
    const frameX = boardCenterX - FRAME_WIDTH / 2;
    const frameY = boardCenterY - FRAME_HEIGHT / 2;

    const frame = createDefaultFrame(frameX, frameY, userId);
    frame.width = FRAME_WIDTH;
    frame.height = FRAME_HEIGHT;
    frame.title = "Flowchart";

    const noteY = (i: number) => frameY + TITLE_BAR + PAD + i * (NOTE_H + GAP);
    const noteX = frameX + PAD;

    const notes = nodeLabels.map((text, i) => ({
      ...createDefaultNote(noteX, noteY(i), userId),
      text,
      width: NOTE_W,
      height: NOTE_H,
    }));

    setOptimisticFrames((prev) => [...prev, frame]);
    setOptimisticNotes((prev) => [...prev, ...notes]);

    persistFrame(boardId, frame).catch((err) => {
      console.error("Failed to create flowchart frame:", err);
      setOptimisticFrames((prev) => prev.filter((f) => f.id !== frame.id));
    });
    for (const note of notes) {
      persistNote(boardId, note).catch((err) => {
        console.error("Failed to create flowchart note:", err);
        setOptimisticNotes((prev) => prev.filter((n) => n.id !== note.id));
      });
    }

    for (let i = 0; i < notes.length - 1; i++) {
      const conn = createDefaultConnector(notes[i].id, notes[i + 1].id, "note", "note", userId, "arrow");
      persistConnector(boardId, conn).catch((err) => console.error("Failed to create flowchart connector:", err));
    }
  }, [
    boardId,
    userId,
    captureSnapshot,
    stageX,
    stageY,
    scale,
    width,
    height,
  ]);

  const createConnectorsFromAI = useCallback(
    (items: Array<{
      fromId: string;
      toId: string;
      label?: string;
      style?: "line" | "arrow";
      stroke?: string;
      strokeWidth?: number;
      dashed?: boolean;
      curved?: boolean;
      bidirectional?: boolean;
    }>) => {
      const noteIds = new Set(notesRef.current.map((n) => n.id));
      const shapeIds = new Set(shapesRef.current.map((s) => s.id));
      const inferType = (id: string): ConnectorElement["fromType"] =>
        shapeIds.has(id) ? "shape" : "note";
      for (const item of items) {
        const connector = createDefaultConnector(
          item.fromId,
          item.toId,
          inferType(item.fromId),
          inferType(item.toId),
          userId,
          item.style ?? "arrow"
        );
        const full: ConnectorElement = {
          ...connector,
          ...(item.label != null && { label: item.label }),
          ...(item.stroke != null && { stroke: item.stroke }),
          ...(item.strokeWidth != null && { strokeWidth: item.strokeWidth }),
          ...(item.dashed != null && { dashed: item.dashed }),
          ...(item.curved != null && { curved: item.curved }),
          ...(item.bidirectional != null && { bidirectional: item.bidirectional }),
        };
        persistConnector(boardId, full).catch((err) =>
          console.error("Failed to create AI connector:", err)
        );
      }
    },
    [boardId, userId]
  );

  const moveElementsByAgent = useCallback(
    (ids: string[], dx: number, dy: number) => {
      captureSnapshot();
      for (const n of notesRef.current) {
        if (ids.includes(n.id)) {
          const updated = { ...n, x: n.x + dx, y: n.y + dy, updatedAt: Date.now() };
          handleNoteUpdate(updated);
          persistNote(boardId, updated).catch(console.error);
        }
      }
      for (const s of shapesRef.current) {
        if (ids.includes(s.id)) {
          const updated = { ...s, x: s.x + dx, y: s.y + dy, updatedAt: Date.now() };
          handleShapeUpdate(updated);
          persistShape(boardId, updated).catch(console.error);
        }
      }
      for (const t of textElementsRef.current) {
        if (ids.includes(t.id)) {
          const updated = { ...t, x: t.x + dx, y: t.y + dy, updatedAt: Date.now() };
          handleTextUpdate(updated);
          persistTextElement(boardId, updated).catch(console.error);
        }
      }
      for (const f of framesRef.current) {
        if (ids.includes(f.id)) {
          const updated = { ...f, x: f.x + dx, y: f.y + dy, updatedAt: Date.now() };
          handleFrameUpdate(updated);
          persistFrame(boardId, updated).catch(console.error);
        }
      }
    },
    [boardId, captureSnapshot, handleNoteUpdate, handleShapeUpdate, handleTextUpdate, handleFrameUpdate]
  );

  const updateElementsByAgent = useCallback(
    (updates: Array<{
      id: string;
      text?: string;
      title?: string;
      color?: string;
      fill?: string;
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      stroke?: string;
      strokeWidth?: number;
      dashed?: boolean;
      curved?: boolean;
      bidirectional?: boolean;
      label?: string;
      style?: "line" | "arrow";
    }>) => {
      const frames = framesRef.current;
      for (const u of updates) {
        const connector = connectorsRef.current.find((c) => c.id === u.id);
        if (connector) {
          const updated: ConnectorElement = {
            ...connector,
            ...(u.stroke !== undefined && { stroke: u.stroke }),
            ...(u.strokeWidth !== undefined && { strokeWidth: u.strokeWidth }),
            ...(u.dashed !== undefined && { dashed: u.dashed }),
            ...(u.curved !== undefined && { curved: u.curved }),
            ...(u.bidirectional !== undefined && { bidirectional: u.bidirectional }),
            ...(u.label !== undefined && { label: u.label }),
            ...(u.style !== undefined && { style: u.style }),
            updatedAt: Date.now(),
          };
          persistConnector(boardId, updated).catch(console.error);
          continue;
        }
        const note = notesRef.current.find((n) => n.id === u.id);
        if (note) {
          const updated = { ...note, ...u, updatedAt: Date.now() };
          if (u.text !== undefined) (updated as StickyNoteElement).text = u.text;
          if (u.color !== undefined) (updated as StickyNoteElement).color = u.color;
          if (u.x != null && u.y != null) {
            const clamped = clampYBelowFrameTitleBar(updated.x, updated.y, frames);
            (updated as StickyNoteElement).x = clamped.x;
            (updated as StickyNoteElement).y = clamped.y;
          }
          handleNoteUpdate(updated as StickyNoteElement);
          persistNote(boardId, updated as StickyNoteElement).catch(console.error);
          continue;
        }
        const shape = shapesRef.current.find((s) => s.id === u.id);
        if (shape) {
          const updated = { ...shape, ...u, updatedAt: Date.now() };
          if (u.fill !== undefined) (updated as ShapeElement).fill = u.fill;
          if (u.x != null && u.y != null) {
            const clamped = clampYBelowFrameTitleBar(updated.x, updated.y, frames);
            (updated as ShapeElement).x = clamped.x;
            (updated as ShapeElement).y = clamped.y;
          }
          handleShapeUpdate(updated as ShapeElement);
          persistShape(boardId, updated as ShapeElement).catch(console.error);
          continue;
        }
        const text = textElementsRef.current.find((t) => t.id === u.id);
        if (text) {
          const updated = { ...text, ...u, updatedAt: Date.now() };
          if (u.text !== undefined) (updated as TextElement).text = u.text;
          if (u.fill !== undefined) (updated as TextElement).fill = u.fill;
          if (u.x != null && u.y != null) {
            const clamped = clampYBelowFrameTitleBar(updated.x, updated.y, frames);
            (updated as TextElement).x = clamped.x;
            (updated as TextElement).y = clamped.y;
          }
          handleTextUpdate(updated as TextElement);
          persistTextElement(boardId, updated as TextElement).catch(console.error);
          continue;
        }
        const frame = framesRef.current.find((f) => f.id === u.id);
        if (frame) {
          const updated = { ...frame, ...u, updatedAt: Date.now() };
          if (u.title !== undefined) (updated as FrameElement).title = u.title;
          handleFrameUpdate(updated as FrameElement);
          persistFrame(boardId, updated as FrameElement).catch(console.error);
        }
      }
    },
    [boardId, handleNoteUpdate, handleShapeUpdate, handleTextUpdate, handleFrameUpdate]
  );

  const deleteElementsByAgent = useCallback(
    (ids: string[]) => {
      deleteByIds(new Set(ids));
    },
    [deleteByIds]
  );

  const arrangeGridByAgent = useCallback(
    (ids: string[], columns = 2, spacing = 24) => {
      const elements: Array<{ id: string; x: number; y: number; width: number; height: number }> = [];
      for (const n of notesRef.current) {
        if (ids.includes(n.id)) elements.push({ id: n.id, x: n.x, y: n.y, width: n.width, height: n.height });
      }
      for (const s of shapesRef.current) {
        if (ids.includes(s.id)) elements.push({ id: s.id, x: s.x, y: s.y, width: s.width, height: s.height });
      }
      for (const t of textElementsRef.current) {
        if (ids.includes(t.id)) elements.push({ id: t.id, x: t.x, y: t.y, width: t.width, height: 24 });
      }
      for (const f of framesRef.current) {
        if (ids.includes(f.id)) elements.push({ id: f.id, x: f.x, y: f.y, width: f.width, height: f.height });
      }
      if (elements.length === 0) return;
      const originX = Math.min(...elements.map((e) => e.x));
      const originY = Math.min(...elements.map((e) => e.y));
      const rows = Math.ceil(elements.length / columns);
      const rowHeights: number[] = [];
      for (let row = 0; row < rows; row++) {
        let maxH = 0;
        for (let col = 0; col < columns; col++) {
          const idx = row * columns + col;
          if (idx >= elements.length) break;
          if (elements[idx].height > maxH) maxH = elements[idx].height;
        }
        rowHeights.push(maxH + spacing);
      }
      let yOffset = 0;
      for (let row = 0; row < rows; row++) {
        let colX = 0;
        for (let col = 0; col < columns; col++) {
          const idx = row * columns + col;
          if (idx >= elements.length) break;
          const el = elements[idx];
          const targetX = originX + colX;
          const targetY = originY + yOffset;
          moveElementsByAgent([el.id], targetX - el.x, targetY - el.y);
          colX += el.width + spacing;
        }
        yOffset += rowHeights[row];
      }
    },
    [moveElementsByAgent]
  );

  const resizeFrameToFitByAgent = useCallback(
    (frameId: string, padding = 16) => {
      const frame = framesRef.current.find((f) => f.id === frameId);
      if (!frame) return;
      const fx = frame.x;
      const fy = frame.y;
      const fRight = frame.x + frame.width;
      const fBottom = frame.y + frame.height;
      const isInside = (x: number, y: number, w: number, h: number) => {
        const cx = x + w / 2;
        const cy = y + h / 2;
        return cx >= fx && cx <= fRight && cy >= fy && cy <= fBottom;
      };
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      const expand = (x: number, y: number, w: number, h: number) => {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x + w > maxX) maxX = x + w;
        if (y + h > maxY) maxY = y + h;
      };
      for (const n of notesRef.current) {
        if (isInside(n.x, n.y, n.width, n.height)) expand(n.x, n.y, n.width, n.height);
      }
      for (const s of shapesRef.current) {
        if (isInside(s.x, s.y, s.width, s.height)) expand(s.x, s.y, s.width, s.height);
      }
      for (const t of textElementsRef.current) {
        const h = t.fontSize * 2;
        if (isInside(t.x, t.y, t.width, h)) expand(t.x, t.y, t.width, h);
      }
      if (!isFinite(minX)) return;
      const x = minX - padding;
      const y = minY - padding;
      const width = maxX - minX + 2 * padding;
      const height = maxY - minY + 2 * padding;
      const updated: FrameElement = { ...frame, x, y, width, height, updatedAt: Date.now() };
      handleFrameUpdate(updated);
      persistFrame(boardId, updated).catch(console.error);
    },
    [boardId, handleFrameUpdate]
  );

  const distributeElementsByAgent = useCallback(
    (ids: string[], direction: "horizontal" | "vertical", spacing = 24) => {
      const elements: Array<{ id: string; x: number; y: number; width: number; height: number }> = [];
      for (const n of notesRef.current) {
        if (ids.includes(n.id)) elements.push({ id: n.id, x: n.x, y: n.y, width: n.width, height: n.height });
      }
      for (const s of shapesRef.current) {
        if (ids.includes(s.id)) elements.push({ id: s.id, x: s.x, y: s.y, width: s.width, height: s.height });
      }
      for (const t of textElementsRef.current) {
        if (ids.includes(t.id)) elements.push({ id: t.id, x: t.x, y: t.y, width: t.width, height: 24 });
      }
      for (const f of framesRef.current) {
        if (ids.includes(f.id)) elements.push({ id: f.id, x: f.x, y: f.y, width: f.width, height: f.height });
      }
      if (elements.length === 0) return;
      const sorted = [...elements].sort((a, b) =>
        direction === "horizontal" ? a.x - b.x : a.y - b.y
      );
      if (direction === "horizontal") {
        const totalWidth = sorted.reduce((acc, el) => acc + el.width, 0) + (sorted.length - 1) * spacing;
        const startX = Math.min(...sorted.map((e) => e.x));
        let xOffset = 0;
        for (const el of sorted) {
          const targetX = startX + xOffset;
          moveElementsByAgent([el.id], targetX - el.x, 0);
          xOffset += el.width + spacing;
        }
      } else {
        const totalHeight = sorted.reduce((acc, el) => acc + el.height, 0) + (sorted.length - 1) * spacing;
        const startY = Math.min(...sorted.map((e) => e.y));
        let yOffset = 0;
        for (const el of sorted) {
          const targetY = startY + yOffset;
          moveElementsByAgent([el.id], 0, targetY - el.y);
          yOffset += el.height + spacing;
        }
      }
    },
    [moveElementsByAgent]
  );

  const persistedNoteIds = new Set(persistedNotes.map((n) => n.id));
  useEffect(() => {
    setOptimisticNotes((prev) => prev.filter((n) => !persistedNoteIds.has(n.id)));
  }, [persistedNotes]);

  const persistedShapeIds = new Set(persistedShapes.map((s) => s.id));
  useEffect(() => {
    setOptimisticShapes((prev) =>
      prev.filter((s) => !persistedShapeIds.has(s.id))
    );
  }, [persistedShapes]);

  useEffect(() => {
    setLocalNoteOverrides((prev) => {
      const next = new Map(prev);
      for (const note of persistedNotes) {
        // Don't clear the override for the element currently being dragged —
        // the local position must stay authoritative until the drag ends.
        if (note.id !== draggingElementIdRef.current) next.delete(note.id);
      }
      return next;
    });
  }, [persistedNotes]);

  useEffect(() => {
    setLocalShapeOverrides((prev) => {
      const next = new Map(prev);
      for (const shape of persistedShapes) {
        if (shape.id !== draggingElementIdRef.current) next.delete(shape.id);
      }
      return next;
    });
  }, [persistedShapes]);

  const persistedTextIds = new Set(persistedTextElements.map((t) => t.id));
  useEffect(() => {
    setOptimisticTextElements((prev) =>
      prev.filter((t) => !persistedTextIds.has(t.id))
    );
  }, [persistedTextElements]);

  useEffect(() => {
    setLocalTextOverrides((prev) => {
      const next = new Map(prev);
      for (const t of persistedTextElements) {
        if (t.id !== draggingElementIdRef.current) next.delete(t.id);
      }
      return next;
    });
  }, [persistedTextElements]);

  const persistedFrameIds = new Set(persistedFrames.map((f) => f.id));
  useEffect(() => {
    setOptimisticFrames((prev) =>
      prev.filter((f) => !persistedFrameIds.has(f.id))
    );
  }, [persistedFrames]);

  useEffect(() => {
    setLocalFrameOverrides((prev) => {
      const next = new Map(prev);
      for (const f of persistedFrames) {
        if (f.id !== draggingElementIdRef.current) next.delete(f.id);
      }
      return next;
    });
  }, [persistedFrames]);

  let notes: StickyNoteElement[];
  let shapes: ShapeElement[];
  let textElements: TextElement[];
  let frames: FrameElement[];

  if (restoredSnapshot) {
    notes = [...restoredSnapshot.notes].sort((a, b) => a.createdAt - b.createdAt);
    shapes = [...restoredSnapshot.shapes].sort((a, b) => a.createdAt - b.createdAt);
    textElements = [...restoredSnapshot.textElements].sort((a, b) => a.createdAt - b.createdAt);
    frames = [...restoredSnapshot.frames].sort((a, b) => a.createdAt - b.createdAt);
    notesRef.current = notes;
    shapesRef.current = shapes;
    textElementsRef.current = textElements;
    framesRef.current = frames;
  } else {
    const noteMap = new Map<string, StickyNoteElement>();
    for (const n of persistedNotes) {
      noteMap.set(n.id, localNoteOverrides.get(n.id) ?? n);
    }
    for (const n of remoteNotes) {
      if (localNoteOverrides.has(n.id)) continue;
      const existing = noteMap.get(n.id);
      if (!existing || n.updatedAt >= existing.updatedAt) {
        noteMap.set(n.id, n);
      }
    }
    for (const n of optimisticNotes) {
      const existing = noteMap.get(n.id);
      if (!existing || n.updatedAt >= existing.updatedAt) {
        noteMap.set(n.id, n);
      }
    }
    notes = Array.from(noteMap.values()).sort(
      (a, b) => a.createdAt - b.createdAt
    );
    notesRef.current = notes;

    const shapeMap = new Map<string, import("@/features/shapes").ShapeElement>();
    for (const s of persistedShapes) {
      shapeMap.set(s.id, localShapeOverrides.get(s.id) ?? s);
    }
    for (const s of remoteShapes) {
      if (localShapeOverrides.has(s.id)) continue;
      const existing = shapeMap.get(s.id);
      if (!existing || s.updatedAt >= existing.updatedAt) {
        shapeMap.set(s.id, s);
      }
    }
    for (const s of optimisticShapes) {
      const existing = shapeMap.get(s.id);
      if (!existing || s.updatedAt >= existing.updatedAt) {
        shapeMap.set(s.id, s);
      }
    }
    shapes = Array.from(shapeMap.values()).sort(
      (a, b) => a.createdAt - b.createdAt
    );
    shapesRef.current = shapes;

    const textMap = new Map<string, TextElement>();
    for (const t of persistedTextElements) {
      textMap.set(t.id, localTextOverrides.get(t.id) ?? t);
    }
    for (const t of optimisticTextElements) {
      const existing = textMap.get(t.id);
      if (!existing || t.updatedAt >= existing.updatedAt) {
        textMap.set(t.id, t);
      }
    }
    textElements = Array.from(textMap.values()).sort(
      (a, b) => a.createdAt - b.createdAt
    );
    textElementsRef.current = textElements;

    const frameMap = new Map<string, FrameElement>();
    for (const f of persistedFrames) {
      frameMap.set(f.id, localFrameOverrides.get(f.id) ?? f);
    }
    for (const f of optimisticFrames) {
      const existing = frameMap.get(f.id);
      if (!existing || f.updatedAt >= existing.updatedAt) {
        frameMap.set(f.id, f);
      }
    }
    frames = Array.from(frameMap.values()).sort(
      (a, b) => a.createdAt - b.createdAt
    );
    framesRef.current = frames;
  }

  useEffect(() => {
    connectorsRef.current = connectors;
  }, [connectors]);

  useEffect(() => {
    if (!restoredSnapshot) return;
    const noteIds = new Set(persistedNotes.map((n) => n.id));
    const snapshotNoteIds = new Set(restoredSnapshot.notes.map((n) => n.id));
    const shapeIds = new Set(persistedShapes.map((s) => s.id));
    const snapshotShapeIds = new Set(restoredSnapshot.shapes.map((s) => s.id));
    const textIds = new Set(persistedTextElements.map((t) => t.id));
    const snapshotTextIds = new Set(restoredSnapshot.textElements.map((t) => t.id));
    const frameIds = new Set(persistedFrames.map((f) => f.id));
    const snapshotFrameIds = new Set(restoredSnapshot.frames.map((f) => f.id));
    const notesMatch =
      noteIds.size === snapshotNoteIds.size &&
      [...snapshotNoteIds].every((id) => noteIds.has(id));
    const shapesMatch =
      shapeIds.size === snapshotShapeIds.size &&
      [...snapshotShapeIds].every((id) => shapeIds.has(id));
    const textMatch =
      textIds.size === snapshotTextIds.size &&
      [...snapshotTextIds].every((id) => textIds.has(id));
    const framesMatch =
      frameIds.size === snapshotFrameIds.size &&
      [...snapshotFrameIds].every((id) => frameIds.has(id));
    if (notesMatch && shapesMatch && textMatch && framesMatch) {
      setRestoredSnapshot(null);
    }
  }, [
    restoredSnapshot,
    persistedNotes,
    persistedShapes,
    persistedTextElements,
    persistedFrames,
  ]);

  function nextId(): string {
    return typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  const handleDuplicate = useCallback(() => {
    const notes = notesRef.current;
    const shapesList = shapesRef.current;
    const textList = textElementsRef.current;
    const framesList = framesRef.current;
    const offset = 20;
    const newNoteIds: string[] = [];
    const newShapeIds: string[] = [];
    const newTextIds: string[] = [];
    const newFrameIds: string[] = [];
    for (const id of selectedIds) {
      const note = notes.find((n) => n.id === id);
      if (note) {
        const clone: StickyNoteElement = {
          ...note,
          id: nextId(),
          x: note.x + offset,
          y: note.y + offset,
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        setOptimisticNotes((prev) => [...prev, clone]);
        persistNote(boardId, clone).catch((err) => {
          console.error("Failed to duplicate note:", err);
          setOptimisticNotes((prev) => prev.filter((n) => n.id !== clone.id));
        });
        newNoteIds.push(clone.id);
        continue;
      }
      const shape = shapesList.find((s) => s.id === id);
      if (shape) {
        const clone: ShapeElement = {
          ...shape,
          id: nextId(),
          x: shape.x + offset,
          y: shape.y + offset,
          createdBy: userId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        setOptimisticShapes((prev) => [...prev, clone]);
        persistShape(boardId, clone).catch((err) => {
          console.error("Failed to duplicate shape:", err);
          setOptimisticShapes((prev) => prev.filter((s) => s.id !== clone.id));
        });
        newShapeIds.push(clone.id);
      } else {
        const textEl = textList.find((t) => t.id === id);
        if (textEl) {
          const clone: TextElement = {
            ...textEl,
            id: nextId(),
            x: textEl.x + offset,
            y: textEl.y + offset,
            createdBy: userId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          setOptimisticTextElements((prev) => [...prev, clone]);
          persistTextElement(boardId, clone).catch((err) => {
            console.error("Failed to duplicate text:", err);
            setOptimisticTextElements((prev) => prev.filter((t) => t.id !== clone.id));
          });
          newTextIds.push(clone.id);
        } else {
          const frameEl = framesList.find((f) => f.id === id);
          if (frameEl) {
            const clone: FrameElement = {
              ...frameEl,
              id: nextId(),
              x: frameEl.x + offset,
              y: frameEl.y + offset,
              createdBy: userId,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            };
            setOptimisticFrames((prev) => [...prev, clone]);
            persistFrame(boardId, clone).catch((err) => {
              console.error("Failed to duplicate frame:", err);
              setOptimisticFrames((prev) => prev.filter((f) => f.id !== clone.id));
            });
            newFrameIds.push(clone.id);
          }
        }
      }
    }
    setSelectedIds(new Set([...newNoteIds, ...newShapeIds, ...newTextIds, ...newFrameIds]));
    setContextMenu(null);
  }, [boardId, userId, selectedIds]);

  const handleCopy = useCallback(() => {
    const notes = notesRef.current;
    const shapesList = shapesRef.current;
    const textList = textElementsRef.current;
    const framesList = framesRef.current;
    setClipboardNotes(notes.filter((n) => selectedIds.has(n.id)));
    setClipboardShapes(shapesList.filter((s) => selectedIds.has(s.id)));
    setClipboardTextElements(textList.filter((t) => selectedIds.has(t.id)));
    setClipboardFrames(framesList.filter((f) => selectedIds.has(f.id)));
    setContextMenu(null);
  }, [selectedIds]);

  const handlePaste = useCallback(() => {
    const offset = 40;
    const newIds: string[] = [];
    for (const note of clipboardNotes) {
      const clone: StickyNoteElement = {
        ...note,
        id: nextId(),
        x: note.x + offset,
        y: note.y + offset,
        createdBy: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setOptimisticNotes((prev) => [...prev, clone]);
      persistNote(boardId, clone).catch((err) => {
        console.error("Failed to paste note:", err);
        setOptimisticNotes((prev) => prev.filter((n) => n.id !== clone.id));
      });
      newIds.push(clone.id);
    }
    for (const shape of clipboardShapes) {
      const clone: ShapeElement = {
        ...shape,
        id: nextId(),
        x: shape.x + offset,
        y: shape.y + offset,
        createdBy: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setOptimisticShapes((prev) => [...prev, clone]);
      persistShape(boardId, clone).catch((err) => {
        console.error("Failed to paste shape:", err);
        setOptimisticShapes((prev) => prev.filter((s) => s.id !== clone.id));
      });
      newIds.push(clone.id);
    }
    for (const textEl of clipboardTextElements) {
      const clone: TextElement = {
        ...textEl,
        id: nextId(),
        x: textEl.x + offset,
        y: textEl.y + offset,
        createdBy: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setOptimisticTextElements((prev) => [...prev, clone]);
      persistTextElement(boardId, clone).catch((err) => {
        console.error("Failed to paste text:", err);
        setOptimisticTextElements((prev) => prev.filter((t) => t.id !== clone.id));
      });
      newIds.push(clone.id);
    }
    for (const frameEl of clipboardFrames) {
      const clone: FrameElement = {
        ...frameEl,
        id: nextId(),
        x: frameEl.x + offset,
        y: frameEl.y + offset,
        createdBy: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setOptimisticFrames((prev) => [...prev, clone]);
      persistFrame(boardId, clone).catch((err) => {
        console.error("Failed to paste frame:", err);
        setOptimisticFrames((prev) => prev.filter((f) => f.id !== clone.id));
      });
      newIds.push(clone.id);
    }
    if (newIds.length > 0) setSelectedIds(new Set(newIds));
    setContextMenu(null);
  }, [boardId, userId, clipboardNotes, clipboardShapes, clipboardTextElements, clipboardFrames]);

  useEffect(() => {
    onSelectionChange?.(selectedIds.size);
  }, [selectedIds.size, onSelectionChange]);

  useImperativeHandle(
    ref,
    () => ({
      getNotes: () => notesRef.current,
      getBoardState,
      createNotesFromAI,
      createStickyNotesGridFromAI,
      createShapesFromAI,
      createFramesFromAI,
      createConnectorsFromAI,
      moveElementsByAgent,
      updateElementsByAgent,
      deleteElementsByAgent,
      arrangeGridByAgent,
      resizeFrameToFitByAgent,
      distributeElementsByAgent,
      clearCanvas,
      createFlowchart,
      deleteSelection: handleDeleteSelection,
      exportImage: () => {
        const stage = stageRef.current;
        if (stage) exportBoardAsPng(stage);
      },
      undo: () => undoAction(getCurrentSnapshot),
      redo: redoAction,
      showShortcuts: () => setShowShortcuts(true),
    }),
    [
      getBoardState,
      createNotesFromAI,
      createStickyNotesGridFromAI,
      createShapesFromAI,
      createFramesFromAI,
      createConnectorsFromAI,
      moveElementsByAgent,
      updateElementsByAgent,
      deleteElementsByAgent,
      arrangeGridByAgent,
      resizeFrameToFitByAgent,
      distributeElementsByAgent,
      clearCanvas,
      createFlowchart,
      handleDeleteSelection,
      undoAction,
      redoAction,
      getCurrentSnapshot,
    ]
  );

  const handleSelectNote = useCallback((id: string, addToSelection: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (addToSelection) {
        if (next.has(id)) next.delete(id);
        else next.add(id);
      } else {
        next.clear();
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleSelectShape = useCallback((id: string, addToSelection: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (addToSelection) {
        if (next.has(id)) next.delete(id);
        else next.add(id);
      } else {
        next.clear();
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleStageMouseDown = useCallback(
    (evt: Konva.KonvaEventObject<MouseEvent>) => {
      const target = evt.target;
      const stage = target.getStage();
      const pos = stage?.getPointerPosition();

      if (activeTool === "hand") {
        handlePanStart(evt);
        return;
      }

      const clickOnEmpty =
        target === stage ||
        (!isClickOnStickyNote(target) &&
          !isClickOnShape(target) &&
          !isClickOnTextElement(target) &&
          !isClickOnTransformer(target));

      if (clickOnEmpty && pos) {
        const { x, y } = screenToBoard(pos.x, pos.y);
        setSelectedConnectorId(null);
        if (activeTool === "select") {
          setSelectionBox({ startX: x, startY: y, endX: x, endY: y });
          setSelectedIds(new Set());
        } else if (activeTool === "connector") {
          setConnectorFrom(null);
          setConnectorPreviewTo(null);
          setSelectedIds(new Set());
          setSelectionBox(null);
        } else {
          setSelectedIds(new Set());
          setSelectionBox(null);
        }
      }

      if (activeTool === "connector") {
        const el = getClickedElement(target);
        if (el) {
          if (connectorFrom) {
            if (connectorFrom.id !== el.id) {
              const connector = createDefaultConnector(
                connectorFrom.id,
                el.id,
                connectorFrom.type,
                el.type,
                userId,
                "arrow"
              );
              persistConnector(boardId, connector).catch((err) =>
                console.error("Failed to create connector:", err)
              );
            }
            setConnectorFrom(null);
            setConnectorPreviewTo(null);
          } else {
            setConnectorFrom({ id: el.id, type: el.type });
          }
          return;
        }
        return;
      }

      if (isClickOnStickyNote(target)) return;
      if (isClickOnShape(target)) return;
      if (isClickOnTextElement(target)) return;
      if (isClickOnFrame(target)) return;
      if (isClickOnTransformer(target)) return;

      if (activeTool === "frame" && pos) {
        const { x, y } = screenToBoard(pos.x, pos.y);
        handleCreateFrame(x, y);
      } else if (activeTool === "text" && pos) {
        const { x, y } = screenToBoard(pos.x, pos.y);
        handleCreateText(x, y);
      } else if (activeTool === "sticky-note" && pos) {
        const { x, y } = screenToBoard(pos.x, pos.y);
        handleCreateNote(x, y);
      } else if (isShapeTool(activeTool) && pos) {
        const { x, y } = screenToBoard(pos.x, pos.y);
        handleCreateShape(x, y);
      }
    },
    [
      activeTool,
      connectorFrom,
      boardId,
      userId,
      handleCreateNote,
      handleCreateShape,
      handleCreateText,
      handleCreateFrame,
      handlePanStart,
      screenToBoard,
    ]
  );

  const handleMouseMoveWithCursor = useCallback(
    (evt: Konva.KonvaEventObject<MouseEvent>) => {
      const stage = evt.target.getStage();
      const pos = stage?.getPointerPosition();
      if (pos) {
        const { x, y } = screenToBoard(pos.x, pos.y);
        syncCursor(x, y);
        if (activeTool === "connector" && connectorFrom) {
          setConnectorPreviewTo({ x, y });
        }
      }
      if (selectionBox && pos) {
        const { x, y } = screenToBoard(pos.x, pos.y);
        setSelectionBox((prev) =>
          prev ? { ...prev, endX: x, endY: y } : null
        );
      }
      if (activeTool === "hand") {
        handlePanMove(evt);
      }
    },
    [activeTool, connectorFrom, syncCursor, handlePanMove, screenToBoard, selectionBox]
  );

  const handleStageMouseUp = useCallback(() => {
    if (selectionBox) {
      const left = Math.min(selectionBox.startX, selectionBox.endX);
      const right = Math.max(selectionBox.startX, selectionBox.endX);
      const top = Math.min(selectionBox.startY, selectionBox.endY);
      const bottom = Math.max(selectionBox.startY, selectionBox.endY);
      const ids = new Set<string>();
      for (const note of notes) {
        const nRight = note.x + note.width;
        const nBottom = note.y + note.height;
        if (!(right < note.x || left > nRight || bottom < note.y || top > nBottom)) {
          ids.add(note.id);
        }
      }
      for (const shape of shapes) {
        const sRight = shape.x + shape.width;
        const sBottom = shape.y + shape.height;
        if (!(right < shape.x || left > sRight || bottom < shape.y || top > sBottom)) {
          ids.add(shape.id);
        }
      }
      for (const textEl of textElements) {
        const tRight = textEl.x + textEl.width;
        const tBottom = textEl.y + 30;
        if (!(right < textEl.x || left > tRight || bottom < textEl.y || top > tBottom)) {
          ids.add(textEl.id);
        }
      }
      for (const frame of frames) {
        const fRight = frame.x + frame.width;
        const fBottom = frame.y + frame.height;
        if (!(right < frame.x || left > fRight || bottom < frame.y || top > fBottom)) {
          ids.add(frame.id);
        }
      }
      setSelectedIds(ids);
      setSelectionBox(null);
    }
    handlePanEnd();
  }, [handlePanEnd, selectionBox, notes, shapes, textElements, frames]);

  const cursorStyle =
    activeTool === "hand"
      ? "grab"
      : activeTool === "select" || activeTool === "connector" || activeTool === "text" || activeTool === "frame"
        ? "crosshair"
        : isShapeTool(activeTool)
          ? "crosshair"
          : "default";

  const containerRef = useRef<HTMLDivElement>(null);

  const handleStageTouchMove = useCallback(
    (e: Konva.KonvaEventObject<TouchEvent>) => {
      const touches = e.evt.touches;
      if (touches.length === 2) {
        handlePinch(
          { x: touches[0].clientX, y: touches[0].clientY },
          { x: touches[1].clientX, y: touches[1].clientY }
        );
      }
    },
    [handlePinch]
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const preventScroll = (e: WheelEvent) => e.preventDefault();
    el.addEventListener("wheel", preventScroll, { passive: false });
    return () => el.removeEventListener("wheel", preventScroll);
  }, []);

  const [showShortcuts, setShowShortcuts] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inInput = target?.closest("input, textarea, [contenteditable=true]");
      if (inInput) return;

      // Shortcuts modal
      if (e.key === "?") { e.preventDefault(); setShowShortcuts((v) => !v); return; }
      if (e.key === "Escape") {
        setShowShortcuts(false);
        setSelectedConnectorId(null);
        setConnectorFrom(null);
        setConnectorPreviewTo(null);
        return;
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        // Delete selected connector
        if (selectedConnectorId) {
          e.preventDefault();
          deleteConnector(boardId, selectedConnectorId).catch(console.error);
          setSelectedConnectorId(null);
          return;
        }
        if (selectedIds.size > 0) {
          e.preventDefault();
          handleDeleteSelection();
        }
        return;
      }
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key === "d") {
        e.preventDefault();
        if (selectedIds.size > 0) handleDuplicate();
      }
      if (ctrl && e.key === "c") {
        if (selectedIds.size > 0) {
          e.preventDefault();
          handleCopy();
        }
      }
      if (ctrl && e.key === "v") {
        if (clipboardNotes.length > 0 || clipboardShapes.length > 0 || clipboardTextElements.length > 0 || clipboardFrames.length > 0) {
          e.preventDefault();
          handlePaste();
        }
      }
      if (ctrl && e.key === "z") {
        e.preventDefault();
        undoAction(getCurrentSnapshot);
      }
      if (ctrl && (e.key === "y" || (e.shiftKey && e.key === "Z"))) {
        e.preventDefault();
        redoAction();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedIds.size, selectedConnectorId, boardId, clipboardNotes.length, clipboardShapes.length, clipboardTextElements.length, clipboardFrames.length, handleDuplicate, handleCopy, handlePaste, handleDeleteSelection, undoAction, redoAction, getCurrentSnapshot]);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-[#fff8e1]"
      tabIndex={0}
      role="application"
      aria-label="Whiteboard canvas"
    >
      <Stage
        key={pixelRatio}
        ref={stageRef}
        width={width}
        height={height}
        pixelRatio={pixelRatio}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleMouseMoveWithCursor}
        onMouseUp={handleStageMouseUp}
        onMouseLeave={handleStageMouseUp}
        onWheel={handleWheel}
        onTouchMove={handleStageTouchMove}
        onTouchEnd={handlePinchEnd}
        style={{ cursor: cursorStyle }}
      >
        {gridVisible && (
          <GridLayer
            width={width}
            height={height}
            stageX={stageX}
            stageY={stageY}
            scale={scale}
          />
        )}
        <FramesLayer
          boardId={boardId}
          userId={userId}
          frames={frames}
          selectedIds={selectedIds}
          onSelectFrame={handleSelectFrame}
          onFrameUpdate={handleFrameUpdate}
          onRequestEditTitle={(frameId, initialTitle) =>
            setEditingFrameTitle({ frameId, initialTitle })
          }
          onFrameContextMenu={handleFrameContextMenu}
          onDragStart={(elementId) =>
            setDraggingState({ isDragging: true, elementId, x: 0, y: 0 })
          }
          onDragEnd={() =>
            setDraggingState({ isDragging: false, elementId: null, x: 0, y: 0 })
          }
          snapEnabled={snapEnabled}
          x={stageX}
          y={stageY}
          scaleX={scale}
          scaleY={scale}
        />
        <StickyNotesLayer
          boardId={boardId}
          userId={userId}
          notes={notes}
          connectorFromId={connectorFrom?.id ?? undefined}
          editingNoteId={editingNoteId}
          onEditingNoteIdChange={setEditingNoteId}
          selectedIds={selectedIds}
          onSelectNote={handleSelectNote}
          onNoteUpdate={handleNoteUpdate}
          onNoteContextMenu={handleNoteContextMenu}
          onDragStart={(elementId) =>
            setDraggingState({ isDragging: true, elementId, x: 0, y: 0 })
          }
          onDragMove={(elementId, x, y) => {
            setDraggingState((prev) => ({ ...prev, isDragging: true, elementId, x, y }));
            setLocalNoteOverrides((prev) => {
              const existing = prev.get(elementId) ?? notesRef.current.find((n) => n.id === elementId);
              if (!existing) return prev;
              const next = new Map(prev);
              next.set(elementId, { ...existing, x, y });
              return next;
            });
          }}
          onDragEnd={() =>
            setDraggingState({ isDragging: false, elementId: null, x: 0, y: 0 })
          }
          snapEnabled={snapEnabled}
          x={stageX}
          y={stageY}
          scaleX={scale}
          scaleY={scale}
        />
        <ShapesLayer
          boardId={boardId}
          userId={userId}
          shapes={shapes}
          connectorFromId={connectorFrom?.id ?? undefined}
          selectedIds={selectedIds}
          onSelectShape={handleSelectShape}
          onShapeUpdate={handleShapeUpdate}
          onShapeContextMenu={handleShapeContextMenu}
          onDragStart={(elementId) =>
            setDraggingState({ isDragging: true, elementId, x: 0, y: 0 })
          }
          onDragMove={(elementId, x, y) => {
            setDraggingState((prev) => ({ ...prev, isDragging: true, elementId, x, y }));
            setLocalShapeOverrides((prev) => {
              const existing = prev.get(elementId) ?? shapesRef.current.find((s) => s.id === elementId);
              if (!existing) return prev;
              const next = new Map(prev);
              next.set(elementId, { ...existing, x, y });
              return next;
            });
          }}
          onDragEnd={() =>
            setDraggingState({ isDragging: false, elementId: null, x: 0, y: 0 })
          }
          snapEnabled={snapEnabled}
          x={stageX}
          y={stageY}
          scaleX={scale}
          scaleY={scale}
        />
        <TextElementsLayer
          boardId={boardId}
          userId={userId}
          textElements={textElements}
          selectedIds={selectedIds}
          onSelectText={handleSelectText}
          onTextUpdate={handleTextUpdate}
          onRequestEditText={(id) => setEditingTextId(id)}
          onTextContextMenu={handleTextContextMenu}
          onDragStart={(elementId) =>
            setDraggingState({ isDragging: true, elementId, x: 0, y: 0 })
          }
          onDragMove={(elementId, x, y) => {
            setLocalTextOverrides((prev) => {
              const existing =
                prev.get(elementId) ??
                textElementsRef.current.find((t) => t.id === elementId);
              if (!existing) return prev;
              const next = new Map(prev);
              next.set(elementId, { ...existing, x, y });
              return next;
            });
          }}
          onDragEnd={() =>
            setDraggingState({ isDragging: false, elementId: null, x: 0, y: 0 })
          }
          snapEnabled={snapEnabled}
          x={stageX}
          y={stageY}
          scaleX={scale}
          scaleY={scale}
        />
        <ConnectorsLayer
          connectors={connectors}
          notes={notes}
          shapes={shapes}
          connectorFrom={connectorFrom}
          connectorPreviewTo={connectorPreviewTo}
          onRequestEditLabel={(connectorId, boardMidX, boardMidY, label) =>
            setEditingConnectorLabel({ connectorId, boardMidX, boardMidY, label })
          }
          editingConnectorId={editingConnectorLabel?.connectorId}
          selectedConnectorId={selectedConnectorId ?? undefined}
          onSelectConnector={(id) => { setSelectedConnectorId(id); setSelectedIds(new Set()); }}
          x={stageX}
          y={stageY}
          scaleX={scale}
          scaleY={scale}
        />
        {selectionBox && (
          <Layer x={stageX} y={stageY} scaleX={scale} scaleY={scale} listening={false}>
            <Rect
              x={Math.min(selectionBox.startX, selectionBox.endX)}
              y={Math.min(selectionBox.startY, selectionBox.endY)}
              width={Math.abs(selectionBox.endX - selectionBox.startX)}
              height={Math.abs(selectionBox.endY - selectionBox.startY)}
              stroke="#ff8f00"
              strokeWidth={2 / scale}
              dash={[4 / scale, 4 / scale]}
              fill="rgba(255, 143, 0, 0.1)"
            />
          </Layer>
        )}
        <RemoteCursors
          boardId={boardId}
          excludeUserId={userId}
          x={stageX}
          y={stageY}
          scaleX={scale}
          scaleY={scale}
        />
      </Stage>
      <TextElementsOverlay
        textElements={textElements}
        selectedIds={selectedIds}
        editingId={editingTextId}
        stageX={stageX}
        stageY={stageY}
        scale={scale}
        onEditCommit={(id, newText, newWidth) => {
          const te = textElements.find((t) => t.id === id);
          if (te) {
            const updated = {
              ...te,
              text: newText,
              ...(newWidth != null ? { width: newWidth } : {}),
              updatedAt: Date.now(),
            };
            handleTextUpdate(updated);
            persistTextElement(boardId, updated).catch((err) =>
              console.error("Failed to persist text:", err)
            );
          }
          setEditingTextId(null);
        }}
        onEditCancel={() => setEditingTextId(null)}
      />
      {/* Frame title inline editor — overlaid exactly on the title area */}
      {editingFrameTitle && (() => {
        const FRAME_PADDING = 8;
        const FRAME_TITLE_H = 28;
        const frame = frames.find((f) => f.id === editingFrameTitle.frameId);
        if (!frame) return null;
        const ex = stageX + (frame.x + FRAME_PADDING) * scale;
        const ey = stageY + (frame.y + FRAME_PADDING / 2) * scale;
        const ew = Math.max(60, (frame.width - FRAME_PADDING * 2) * scale);
        const eh = Math.max(18, (FRAME_TITLE_H - FRAME_PADDING) * scale);
        return (
          <FrameTitleEditorOverlay
            key={editingFrameTitle.frameId}
            x={ex} y={ey} width={ew} height={eh}
            fontSize={Math.max(10, 14 * scale)}
            initialTitle={editingFrameTitle.initialTitle}
            onCommit={(title) => {
              handleFrameUpdate({ ...frame, title, updatedAt: Date.now() });
              persistFrame(boardId, { ...frame, title, updatedAt: Date.now() }).catch(console.error);
              setEditingFrameTitle(null);
            }}
            onCancel={() => setEditingFrameTitle(null)}
          />
        );
      })()}
      {/* Zoom controls */}
      <ZoomControls
        scale={scale}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onReset={resetView}
        onFitToScreen={() => fitToContent(getContentBBox(notes, shapes, textElements, frames))}
      />
      {/* Text format bar — shown when a text element is selected */}
      {(() => {
        const selId = selectedIds.size === 1 ? [...selectedIds][0] : null;
        const selectedText = selId ? textElements.find((t) => t.id === selId) : null;
        if (!selectedText) return null;
        const screenX = stageX + (selectedText.x + selectedText.width / 2) * scale;
        const screenY = stageY + selectedText.y * scale;
        return (
          <TextFormatBar
            textElement={selectedText}
            x={screenX}
            y={screenY}
            onUpdate={(updates) => {
              const updated = { ...selectedText, ...updates, updatedAt: Date.now() };
              handleTextUpdate(updated);
              persistTextElement(boardId, updated).catch(console.error);
            }}
          />
        );
      })()}
      {/* Connector style toolbar — shown when a connector is selected */}
      {selectedConnectorId && (() => {
        const conn = connectors.find((c) => c.id === selectedConnectorId);
        if (!conn) return null;
        return (
          <div
            style={{
              position: "absolute",
              top: 8,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 10003,
              pointerEvents: "auto",
            }}
          >
            <ConnectorStyleBar
              connector={conn}
              onUpdate={(updates) => {
                const updated = { ...conn, ...updates, updatedAt: Date.now() };
                persistConnector(boardId, updated).catch(console.error);
              }}
              onDelete={() => {
                deleteConnector(boardId, selectedConnectorId).catch(console.error);
                setSelectedConnectorId(null);
              }}
            />
          </div>
        );
      })()}
      {/* Connector label inline editor — overlaid exactly on the connector midpoint */}
      {editingConnectorLabel && (() => {
        const sx = stageX + editingConnectorLabel.boardMidX * scale;
        const sy = stageY + editingConnectorLabel.boardMidY * scale;
        return (
          <ConnectorLabelEditor
            key={editingConnectorLabel.connectorId}
            screenX={sx} screenY={sy} scale={scale}
            initialLabel={editingConnectorLabel.label}
            onCommit={(label) => {
              const conn = connectors.find((c) => c.id === editingConnectorLabel.connectorId);
              if (conn) persistConnector(boardId, { ...conn, label, updatedAt: Date.now() }).catch(console.error);
              setEditingConnectorLabel(null);
            }}
            onCancel={() => setEditingConnectorLabel(null)}
          />
        );
      })()}
      {contextMenu &&
        createPortal(
          <ColorPaletteMenu
            clientX={contextMenu.clientX}
            clientY={contextMenu.clientY}
            onSelect={handleColorSelect}
            onClose={() => setContextMenu(null)}
            onDelete={handleDelete}
            forShape={contextMenu.type === "shape"}
            onDuplicate={selectedIds.size > 0 ? handleDuplicate : undefined}
            onCopy={selectedIds.size > 0 ? handleCopy : undefined}
            onPaste={clipboardNotes.length > 0 || clipboardShapes.length > 0 || clipboardTextElements.length > 0 || clipboardFrames.length > 0 ? handlePaste : undefined}
            pasteEnabled={clipboardNotes.length > 0 || clipboardShapes.length > 0 || clipboardTextElements.length > 0 || clipboardFrames.length > 0}
          />,
          document.body
        )}
      {/* Keyboard shortcuts modal */}
      {showShortcuts && (
        <KeyboardShortcutsModal onClose={() => setShowShortcuts(false)} />
      )}
    </div>
  );
});

// ─── Frame title inline editor ────────────────────────────────────────────────

interface FrameTitleEditorOverlayProps {
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  initialTitle: string;
  onCommit: (title: string) => void;
  onCancel: () => void;
}

function FrameTitleEditorOverlay({
  x, y, width, height, fontSize, initialTitle, onCommit, onCancel,
}: FrameTitleEditorOverlayProps) {
  const [value, setValue] = useState(initialTitle);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") { e.preventDefault(); onCommit(value); }
      if (e.key === "Escape") onCancel();
    },
    [value, onCommit, onCancel]
  );

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => onCommit(value)}
      onKeyDown={handleKeyDown}
      onMouseDown={(e) => e.stopPropagation()}
      placeholder="Frame title…"
      style={{
        position: "absolute",
        left: x,
        top: y,
        width,
        height,
        fontSize,
        fontFamily: "sans-serif",
        color: "#5d4037",
        padding: "2px 4px",
        border: "2px solid #ff8f00",
        borderRadius: 4,
        outline: "none",
        background: "white",
        boxSizing: "border-box",
        zIndex: 10000,
        pointerEvents: "auto",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
    />
  );
}

// ─── HTML overlay for text elements (view + edit) ───────────────────────────

interface TextElementsOverlayProps {
  textElements: TextElement[];
  selectedIds: Set<string>;
  editingId: string | null;
  stageX: number;
  stageY: number;
  scale: number;
  onEditCommit: (id: string, text: string, width?: number) => void;
  onEditCancel: () => void;
}

function TextElementsOverlay({
  textElements,
  selectedIds,
  editingId,
  stageX,
  stageY,
  scale,
  onEditCommit,
  onEditCancel,
}: TextElementsOverlayProps) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {textElements.map((te) => {
        const x = stageX + te.x * scale;
        const y = stageY + te.y * scale;
        const w = Math.max(80, te.width * scale);
        const scaledFontSize = te.fontSize * scale;
        const isEditing = editingId === te.id;
        const isSelected = selectedIds.has(te.id);

        if (isEditing) {
          return (
            <EditableTextArea
              key={te.id}
              textElement={te}
              x={x}
              y={y}
              initialWidth={w}
              scaledFontSize={scaledFontSize}
              scale={scale}
              onCommit={(text, width) => onEditCommit(te.id, text, width)}
              onCancel={onEditCancel}
            />
          );
        }

        return (
          <div
            key={te.id}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: w,
              fontSize: scaledFontSize,
              fontFamily: te.fontFamily,
              color: te.text ? te.fill : "#9ca3af",
              padding: 4 * scale,
              border: isSelected ? "2px solid #ff8f00" : "2px solid transparent",
              borderRadius: 4,
              boxSizing: "border-box",
              pointerEvents: "none",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              lineHeight: 1.4,
              userSelect: "none",
            }}
          >
            {te.text || "Double-click to edit"}
          </div>
        );
      })}
    </div>
  );
}

interface EditableTextAreaProps {
  textElement: TextElement;
  x: number;
  y: number;
  initialWidth: number;
  scaledFontSize: number;
  scale: number;
  onCommit: (text: string, width?: number) => void;
  onCancel: () => void;
}

function EditableTextArea({
  textElement,
  x,
  y,
  initialWidth,
  scaledFontSize,
  scale,
  onCommit,
  onCancel,
}: EditableTextAreaProps) {
  const [value, setValue] = useState(textElement.text);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    ref.current?.focus();
    if (textElement.text) ref.current?.select();
  }, [textElement.text]);

  const commit = useCallback(() => {
    const el = ref.current;
    const newWidth = el ? Math.round(el.offsetWidth / scale) : undefined;
    onCommit(value, newWidth);
  }, [value, scale, onCommit]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        commit();
      }
      if (e.key === "Escape") onCancel();
    },
    [commit, onCancel]
  );

  // Auto-grow height as user types
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={handleChange}
      onBlur={commit}
      onKeyDown={handleKeyDown}
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: initialWidth,
        minHeight: Math.max(40, scaledFontSize * 2),
        fontSize: scaledFontSize,
        fontFamily: textElement.fontFamily,
        color: textElement.fill,
        padding: 4 * scale,
        border: "2px solid #ff8f00",
        borderRadius: 4,
        outline: "none",
        resize: "both",
        background: "transparent",
        boxSizing: "border-box",
        pointerEvents: "auto",
        lineHeight: 1.4,
        overflow: "hidden",
      }}
    />
  );
}

// ─── Connector label inline editor ───────────────────────────────────────────

interface ConnectorLabelEditorProps {
  /** Screen-space X coordinate of the connector midpoint (board-space mid converted via stageX + boardMidX * scale). */
  screenX: number;
  /** Screen-space Y coordinate of the connector midpoint. */
  screenY: number;
  /** Current zoom scale, used to match the Konva label's pixel dimensions exactly. */
  scale: number;
  initialLabel: string;
  onCommit: (label: string) => void;
  onCancel: () => void;
}

function ConnectorLabelEditor({ screenX, screenY, scale, initialLabel, onCommit, onCancel }: ConnectorLabelEditorProps) {
  const [value, setValue] = useState(initialLabel);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); onCommit(value); }
    if (e.key === "Escape") onCancel();
  };

  // Mirror the Konva label dimensions exactly:
  //   board-space width  = chars * 8 + 8  (min 80 so empty placeholder is visible)
  //   board-space height = 20
  //   board-space font   = 12
  const boardW = Math.max(value.length * 8 + 8, 80);
  const boardH = 20;
  const w = boardW * scale;
  const h = boardH * scale;
  const fontSize = 12 * scale;

  return (
    <input
      ref={ref}
      type="text"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => onCommit(value)}
      onKeyDown={handleKeyDown}
      onMouseDown={(e) => e.stopPropagation()}
      placeholder="Label…"
      style={{
        position: "absolute",
        left: screenX - w / 2,
        top: screenY - h / 2,
        width: w,
        height: h,
        fontSize,
        fontFamily: "sans-serif",
        color: "#1f2937",
        padding: `${2 * scale}px ${6 * scale}px`,
        border: "1.5px solid #000000",
        borderRadius: 3 * scale,
        outline: "none",
        background: "transparent",
        boxSizing: "border-box",
        zIndex: 10002,
        textAlign: "center",
        pointerEvents: "auto",
      }}
    />
  );
}

// ─── Content bounding-box helper ─────────────────────────────────────────────

/**
 * Returns the axis-aligned bounding box that contains every element on the
 * board, or null when the board is empty.
 */
function getContentBBox(
  notes: StickyNoteElement[],
  shapes: ShapeElement[],
  textElements: TextElement[],
  frames: FrameElement[]
): { x: number; y: number; width: number; height: number } | null {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  const expand = (x: number, y: number, w: number, h: number) => {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x + w > maxX) maxX = x + w;
    if (y + h > maxY) maxY = y + h;
  };

  for (const n of notes)        expand(n.x, n.y, n.width, n.height);
  for (const s of shapes)       expand(s.x, s.y, s.width, s.height);
  for (const t of textElements)  expand(t.x, t.y, t.width, t.fontSize * 2);
  for (const f of frames)       expand(f.x, f.y, f.width, f.height);

  if (!isFinite(minX)) return null;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}
