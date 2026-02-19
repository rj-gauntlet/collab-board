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
  deleteSelection: () => void;
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

export const WhiteboardCanvas = forwardRef<
  WhiteboardCanvasHandle,
  WhiteboardCanvasProps
>(function WhiteboardCanvas(
  { boardId, userId, displayName, width, height, activeTool, onSelectionChange },
  ref
) {
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

  const [clipboardNotes, setClipboardNotes] = useState<StickyNoteElement[]>([]);
  const [clipboardShapes, setClipboardShapes] = useState<ShapeElement[]>([]);

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

  const deleteByIds = useCallback((ids: Set<string>) => {
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
        deleteShape(boardId, id).catch((err) =>
          console.error("Failed to delete shape:", err)
        );
        setOptimisticShapes((prev) => prev.filter((s) => s.id !== id));
        setLocalShapeOverrides((prev) => {
          const next = new Map(prev);
          next.delete(id);
          return next;
        });
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
    const contextItemId = contextMenu.type === "note" ? contextMenu.note.id : contextMenu.shape.id;
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
  const shapesRef = useRef<ShapeElement[]>([]);

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
  shapesRef.current = shapes;

  function nextId(): string {
    return typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  const handleDuplicate = useCallback(() => {
    const notes = notesRef.current;
    const shapesList = shapesRef.current;
    const offset = 20;
    const newNoteIds: string[] = [];
    const newShapeIds: string[] = [];
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
      }
    }
    setSelectedIds(new Set([...newNoteIds, ...newShapeIds]));
    setContextMenu(null);
  }, [boardId, userId, selectedIds]);

  const handleCopy = useCallback(() => {
    const notes = notesRef.current;
    const shapesList = shapesRef.current;
    const copiedNotes = notes.filter((n) => selectedIds.has(n.id));
    const copiedShapes = shapesList.filter((s) => selectedIds.has(s.id));
    setClipboardNotes(copiedNotes);
    setClipboardShapes(copiedShapes);
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
    if (newIds.length > 0) setSelectedIds(new Set(newIds));
    setContextMenu(null);
  }, [boardId, userId, clipboardNotes, clipboardShapes]);

  useEffect(() => {
    onSelectionChange?.(selectedIds.size);
  }, [selectedIds.size, onSelectionChange]);

  useImperativeHandle(
    ref,
    () => ({
      getNotes: () => notesRef.current,
      createNotesFromAI,
      clearCanvas,
      deleteSelection: handleDeleteSelection,
    }),
    [createNotesFromAI, clearCanvas, handleDeleteSelection]
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
        target === stage || (!isClickOnStickyNote(target) && !isClickOnShape(target) && !isClickOnTransformer(target));

      if (clickOnEmpty && pos) {
        const { x, y } = screenToBoard(pos.x, pos.y);
        if (activeTool === "select") {
          setSelectionBox({ startX: x, startY: y, endX: x, endY: y });
          setSelectedIds(new Set());
        } else {
          setSelectedIds(new Set());
          setSelectionBox(null);
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
    [activeTool, syncCursor, handlePanMove, screenToBoard, selectionBox]
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
      setSelectedIds(ids);
      setSelectionBox(null);
    }
    handlePanEnd();
  }, [handlePanEnd, selectionBox, notes, shapes]);

  const cursorStyle =
    activeTool === "hand"
      ? "grab"
      : activeTool === "select"
        ? "crosshair"
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inInput = target?.closest("input, textarea, [contenteditable=true]");
      if (inInput) return;
      if (e.key === "Delete" || e.key === "Backspace") {
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
        if (clipboardNotes.length > 0 || clipboardShapes.length > 0) {
          e.preventDefault();
          handlePaste();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedIds.size, clipboardNotes.length, clipboardShapes.length, handleDuplicate, handleCopy, handlePaste, handleDeleteSelection]);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-[#fff8e1]"
      tabIndex={0}
      role="application"
      aria-label="Whiteboard canvas"
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
          selectedIds={selectedIds}
          onSelectNote={handleSelectNote}
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
          selectedIds={selectedIds}
          onSelectShape={handleSelectShape}
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
            onPaste={clipboardNotes.length > 0 || clipboardShapes.length > 0 ? handlePaste : undefined}
            pasteEnabled={clipboardNotes.length > 0 || clipboardShapes.length > 0}
          />,
          document.body
        )}
    </div>
  );
});
