"use client";

import React, {
  useCallback,
  useEffect,
  useState,
  useImperativeHandle,
  forwardRef,
  useRef,
} from "react";
import { createPortal } from "react-dom";
import Konva from "konva";
import { Stage, Layer } from "react-konva";
import { useSyncCursor } from "@/features/cursors/useSyncCursor";
import { RemoteCursors } from "@/features/cursors/RemoteCursors";
import { clearBoard } from "./clearBoard";
import {
  StickyNotesLayer,
  usePersistedNotes,
  persistNote,
  createDefaultNote,
} from "@/features/sticky-notes";
import { useRemoteNotes } from "@/features/sticky-notes/useRemoteNotes";
import { useSyncDragging } from "@/features/sticky-notes/useSyncDragging";
import {
  ShapesLayer,
  usePersistedShapes,
  persistShape,
  createDefaultShape,
} from "@/features/shapes";
import { useRemoteShapes } from "@/features/shapes/useRemoteShapes";
import { usePanZoom } from "@/features/pan-zoom";
import {
  ColorPaletteMenu,
  getShapeStrokeForFill,
} from "@/components/ColorPaletteMenu";
import type { StickyNoteElement } from "@/features/sticky-notes";
import type { Tool } from "@/features/toolbar";
import type { ShapeElement } from "@/features/shapes";

export interface WhiteboardCanvasHandle {
  getNotes: () => StickyNoteElement[];
  createNotesFromAI: (
    notes: Array<{ text: string; color: string; x: number; y: number }>
  ) => void;
  clearCanvas: () => Promise<void>;
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
  activeTool: Tool;
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

export const WhiteboardCanvas = forwardRef<
  WhiteboardCanvasHandle,
  WhiteboardCanvasProps
>(function WhiteboardCanvas(
  { boardId, userId, displayName, width, height, activeTool },
  ref
) {
  const [optimisticNotes, setOptimisticNotes] = useState<StickyNoteElement[]>([]);
  const [localNoteOverrides, setLocalNoteOverrides] = useState<
    Map<string, StickyNoteElement>
  >(new Map());
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [optimisticShapes, setOptimisticShapes] = useState<
    import("@/features/shapes").ShapeElement[]
  >([]);
  const [localShapeOverrides, setLocalShapeOverrides] = useState<
    Map<string, import("@/features/shapes").ShapeElement>
  >(new Map());
  const [draggingState, setDraggingState] = useState<{
    isDragging: boolean;
    elementId: string | null;
    x: number;
    y: number;
  }>({ isDragging: false, elementId: null, x: 0, y: 0 });

  type ContextMenu =
    | { type: "note"; note: StickyNoteElement; clientX: number; clientY: number }
    | { type: "shape"; shape: ShapeElement; clientX: number; clientY: number };
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);

  const {
    scale,
    stageX,
    stageY,
    screenToBoard,
    handleWheel,
    handlePanStart,
    handlePanMove,
    handlePanEnd,
  } = usePanZoom(width, height);

  const { syncCursor } = useSyncCursor(boardId, userId, displayName);

  const persistedNotes = usePersistedNotes(boardId);
  const remoteNotes = useRemoteNotes(boardId);

  const persistedShapes = usePersistedShapes(boardId);
  const remoteShapes = useRemoteShapes(boardId);

  useSyncDragging(
    boardId,
    userId,
    draggingState.isDragging,
    draggingState.elementId,
    draggingState.x,
    draggingState.y
  );

  const handleNoteUpdate = useCallback((note: StickyNoteElement) => {
    setLocalNoteOverrides((prev) => {
      const next = new Map(prev);
      next.set(note.id, note);
      return next;
    });
  }, []);

  const handleCreateNote = useCallback(
    (x: number, y: number) => {
      const note = createDefaultNote(x, y, userId);
      setOptimisticNotes((prev) => [...prev, note]);
      persistNote(boardId, note).catch((err) => {
        console.error("Failed to create note:", err);
        setOptimisticNotes((prev) => prev.filter((n) => n.id !== note.id));
      });
    },
    [boardId, userId]
  );

  const handleCreateShape = useCallback(
    (x: number, y: number) => {
      const kind = isShapeTool(activeTool) ? activeTool : "rect";
      const shape = createDefaultShape(x, y, userId, kind);
      setOptimisticShapes((prev) => [...prev, shape]);
      persistShape(boardId, shape).catch((err) => {
        console.error("Failed to create shape:", err);
        setOptimisticShapes((prev) => prev.filter((s) => s.id !== shape.id));
      });
    },
    [boardId, userId, activeTool]
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
      } else {
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
      }
      setContextMenu(null);
    },
    [contextMenu, boardId, handleNoteUpdate, handleShapeUpdate]
  );

  const clearCanvas = useCallback(async () => {
    await clearBoard(boardId);
    setOptimisticNotes([]);
    setOptimisticShapes([]);
    setLocalNoteOverrides(new Map());
    setLocalShapeOverrides(new Map());
  }, [boardId]);

  const createNotesFromAI = useCallback(
    (aiNotes: Array<{ text: string; color: string; x: number; y: number }>) => {
      for (const aiNote of aiNotes) {
        const note = createDefaultNote(aiNote.x, aiNote.y, userId);
        const fullNote: StickyNoteElement = {
          ...note,
          text: aiNote.text,
          color: aiNote.color,
        };
        setOptimisticNotes((prev) => [...prev, fullNote]);
        persistNote(boardId, fullNote).catch((err) => {
          console.error("Failed to create AI note:", err);
          setOptimisticNotes((prev) => prev.filter((n) => n.id !== fullNote.id));
        });
      }
    },
    [boardId, userId]
  );

  const notesRef = useRef<StickyNoteElement[]>([]);

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
        next.delete(note.id);
      }
      return next;
    });
  }, [persistedNotes]);

  useEffect(() => {
    setLocalShapeOverrides((prev) => {
      const next = new Map(prev);
      for (const shape of persistedShapes) {
        next.delete(shape.id);
      }
      return next;
    });
  }, [persistedShapes]);

  const noteMap = new Map<string, StickyNoteElement>();
  for (const n of persistedNotes) {
    noteMap.set(n.id, localNoteOverrides.get(n.id) ?? n);
  }
  for (const n of remoteNotes) {
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
  const notes = Array.from(noteMap.values()).sort(
    (a, b) => a.createdAt - b.createdAt
  );
  notesRef.current = notes;

  const shapeMap = new Map<string, import("@/features/shapes").ShapeElement>();
  for (const s of persistedShapes) {
    shapeMap.set(s.id, localShapeOverrides.get(s.id) ?? s);
  }
  for (const s of remoteShapes) {
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
  const shapes = Array.from(shapeMap.values()).sort(
    (a, b) => a.createdAt - b.createdAt
  );

  useImperativeHandle(
    ref,
    () => ({
      getNotes: () => notesRef.current,
      createNotesFromAI,
      clearCanvas,
    }),
    [createNotesFromAI, clearCanvas]
  );

  const handleStageMouseDown = useCallback(
    (evt: Konva.KonvaEventObject<MouseEvent>) => {
      const target = evt.target;
      const stage = target.getStage();
      const pos = stage?.getPointerPosition();

      if (activeTool === "hand") {
        handlePanStart(evt);
        return;
      }

      if (selectedShapeId) {
        if (target === stage || isClickOnStickyNote(target)) {
          setSelectedShapeId(null);
          return;
        }
      }

      if (isClickOnStickyNote(target)) return;
      if (isClickOnShape(target)) return;
      if (isClickOnTransformer(target)) return;

      if (activeTool === "sticky-note" && pos) {
        const { x, y } = screenToBoard(pos.x, pos.y);
        handleCreateNote(x, y);
      } else if (isShapeTool(activeTool) && pos) {
        const { x, y } = screenToBoard(pos.x, pos.y);
        handleCreateShape(x, y);
      }
    },
    [
      activeTool,
      handleCreateNote,
      handleCreateShape,
      handlePanStart,
      screenToBoard,
      selectedShapeId,
    ]
  );

  const handleMouseMoveWithCursor = useCallback(
    (evt: Konva.KonvaEventObject<MouseEvent>) => {
      const stage = evt.target.getStage();
      const pos = stage?.getPointerPosition();
      if (pos) {
        const { x, y } = screenToBoard(pos.x, pos.y);
        syncCursor(x, y);
      }
      if (activeTool === "hand") {
        handlePanMove(evt);
      }
    },
    [activeTool, syncCursor, handlePanMove, screenToBoard]
  );

  const handleStageMouseUp = useCallback(() => {
    handlePanEnd();
  }, [handlePanEnd]);

  const cursorStyle =
    activeTool === "hand"
      ? "grab"
      : isShapeTool(activeTool)
        ? "crosshair"
        : "default";

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const preventScroll = (e: WheelEvent) => e.preventDefault();
    el.addEventListener("wheel", preventScroll, { passive: false });
    return () => el.removeEventListener("wheel", preventScroll);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-white dark:bg-zinc-900"
    >
      <Stage
        width={width}
        height={height}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleMouseMoveWithCursor}
        onMouseUp={handleStageMouseUp}
        onMouseLeave={handleStageMouseUp}
        onWheel={handleWheel}
        style={{ cursor: cursorStyle }}
      >
        <StickyNotesLayer
          boardId={boardId}
          userId={userId}
          notes={notes}
          editingNoteId={editingNoteId}
          onEditingNoteIdChange={setEditingNoteId}
          onNoteUpdate={handleNoteUpdate}
          onNoteContextMenu={handleNoteContextMenu}
          onDragStart={(elementId) =>
            setDraggingState({ isDragging: true, elementId, x: 0, y: 0 })
          }
          onDragMove={(elementId, x, y) =>
            setDraggingState((prev) => ({
              ...prev,
              isDragging: true,
              elementId,
              x,
              y,
            }))
          }
          onDragEnd={() =>
            setDraggingState({ isDragging: false, elementId: null, x: 0, y: 0 })
          }
          x={stageX}
          y={stageY}
          scaleX={scale}
          scaleY={scale}
        />
        <ShapesLayer
          boardId={boardId}
          userId={userId}
          shapes={shapes}
          selectedShapeId={selectedShapeId}
          onSelectShape={setSelectedShapeId}
          onShapeUpdate={handleShapeUpdate}
          onShapeContextMenu={handleShapeContextMenu}
          onDragStart={(elementId) =>
            setDraggingState({ isDragging: true, elementId, x: 0, y: 0 })
          }
          onDragMove={(elementId, x, y) =>
            setDraggingState((prev) => ({
              ...prev,
              isDragging: true,
              elementId,
              x,
              y,
            }))
          }
          onDragEnd={() =>
            setDraggingState({ isDragging: false, elementId: null, x: 0, y: 0 })
          }
          x={stageX}
          y={stageY}
          scaleX={scale}
          scaleY={scale}
        />
        <RemoteCursors
          boardId={boardId}
          excludeUserId={userId}
          x={stageX}
          y={stageY}
          scaleX={scale}
          scaleY={scale}
        />
      </Stage>
      {contextMenu &&
        createPortal(
          <ColorPaletteMenu
            clientX={contextMenu.clientX}
            clientY={contextMenu.clientY}
            onSelect={handleColorSelect}
            onClose={() => setContextMenu(null)}
            forShape={contextMenu.type === "shape"}
          />,
          document.body
        )}
    </div>
  );
});
