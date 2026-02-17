"use client";

import React, {
  useCallback,
  useEffect,
  useState,
  useImperativeHandle,
  forwardRef,
  useRef,
} from "react";
import Konva from "konva";
import { Stage, Layer, Line } from "react-konva";
import { useSyncCursor } from "@/features/cursors/useSyncCursor";
import { RemoteCursors } from "@/features/cursors/RemoteCursors";
import { useLocalDrawing } from "./useLocalDrawing";
import { useSyncActiveStroke } from "./useSyncActiveStroke";
import { usePersistedLines, persistLine } from "./usePersistedLines";
import { useRemoteActiveStrokes } from "./useRemoteActiveStrokes";
import {
  useRemoteCompletedLines,
  writeCompletedLineToRtdb,
} from "./useRemoteCompletedLines";
import {
  StickyNotesLayer,
  usePersistedNotes,
  persistNote,
  createDefaultNote,
} from "@/features/sticky-notes";
import { useRemoteNotes } from "@/features/sticky-notes/useRemoteNotes";
import { useSyncDragging } from "@/features/sticky-notes/useSyncDragging";
import type { LineElement } from "./types";
import type { StickyNoteElement } from "@/features/sticky-notes";
import type { Tool } from "@/features/toolbar";

export interface WhiteboardCanvasHandle {
  getNotes: () => StickyNoteElement[];
  createNotesFromAI: (
    notes: Array<{ text: string; color: string; x: number; y: number }>
  ) => void;
}

interface WhiteboardCanvasProps {
  boardId: string;
  userId: string;
  width: number;
  height: number;
  activeTool: Tool;
  isAiLoading?: boolean;
}

function isClickOnStickyNote(target: Konva.Node | null): boolean {
  let node: Konva.Node | null = target;
  while (node) {
    if (node.name() === "sticky-note") return true;
    node = node.getParent();
  }
  return false;
}

export const WhiteboardCanvas = forwardRef<
  WhiteboardCanvasHandle,
  WhiteboardCanvasProps
>(function WhiteboardCanvas(
  { boardId, userId, width, height, activeTool, isAiLoading = false },
  ref
) {
  const [optimisticLines, setOptimisticLines] = useState<LineElement[]>([]);
  const [optimisticNotes, setOptimisticNotes] = useState<StickyNoteElement[]>([]);
  const [localNoteOverrides, setLocalNoteOverrides] = useState<
    Map<string, StickyNoteElement>
  >(new Map());
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [draggingState, setDraggingState] = useState<{
    isDragging: boolean;
    elementId: string | null;
    x: number;
    y: number;
  }>({ isDragging: false, elementId: null, x: 0, y: 0 });

  const handleLineComplete = useCallback(
    async (line: LineElement) => {
      setOptimisticLines((prev) => [...prev, line]);
      writeCompletedLineToRtdb(boardId, line);
      try {
        await persistLine(boardId, line);
      } catch (err) {
        console.error("Failed to persist line:", err);
        setOptimisticLines((prev) => prev.filter((l) => l.id !== line.id));
      }
    },
    [boardId]
  );

  const { syncCursor } = useSyncCursor(boardId, userId);

  const {
    currentStroke,
    isDrawing,
    handleMouseDown: drawingMouseDown,
    handleMouseMove,
    handleMouseUp,
  } = useLocalDrawing(userId, handleLineComplete);

  useSyncActiveStroke(boardId, userId, currentStroke, isDrawing);

  const persistedLines = usePersistedLines(boardId);
  const remoteCompletedLines = useRemoteCompletedLines(boardId);
  const remoteStrokes = useRemoteActiveStrokes(boardId, userId);

  const persistedNotes = usePersistedNotes(boardId);
  const remoteNotes = useRemoteNotes(boardId);
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

  useEffect(() => {
    setLocalNoteOverrides((prev) => {
      const next = new Map(prev);
      for (const note of persistedNotes) {
        next.delete(note.id);
      }
      return next;
    });
  }, [persistedNotes]);

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

  useImperativeHandle(
    ref,
    () => ({
      getNotes: () => notesRef.current,
      createNotesFromAI,
    }),
    [createNotesFromAI]
  );

  const handleStageMouseDown = useCallback(
    (evt: Konva.KonvaEventObject<MouseEvent>) => {
      const target = evt.target;
      const stage = target.getStage();
      const pos = stage?.getPointerPosition();

      if (isClickOnStickyNote(target)) return;

      if (activeTool === "pen") {
        drawingMouseDown(evt);
      } else if (activeTool === "sticky-note" && pos) {
        handleCreateNote(pos.x, pos.y);
      }
    },
    [activeTool, drawingMouseDown, handleCreateNote]
  );

  const handleMouseMoveWithCursor = useCallback(
    (evt: Konva.KonvaEventObject<MouseEvent>) => {
      const stage = evt.target.getStage();
      const pos = stage?.getPointerPosition();
      if (pos) syncCursor(pos.x, pos.y);
      handleMouseMove(evt);
    },
    [syncCursor, handleMouseMove]
  );

  const persistedIds = new Set(persistedLines.map((l) => l.id));
  useEffect(() => {
    setOptimisticLines((prev) => prev.filter((l) => !persistedIds.has(l.id)));
  }, [persistedLines]);

  const seenIds = new Set<string>();
  const allLines = [
    ...persistedLines,
    ...remoteCompletedLines,
    ...optimisticLines,
  ]
    .filter((l) => {
      if (seenIds.has(l.id)) return false;
      seenIds.add(l.id);
      return true;
    })
    .sort((a, b) => a.createdAt - b.createdAt);

  const cursorStyle = activeTool === "pen" ? "crosshair" : "default";

  return (
    <div className="relative overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <Stage
        width={width}
        height={height}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleMouseMoveWithCursor}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: cursorStyle }}
      >
        <Layer listening={false}>
          {allLines.map((line) => (
            <Line
              key={line.id}
              points={line.points}
              stroke={line.strokeColor}
              strokeWidth={line.strokeWidth}
              lineCap="round"
              lineJoin="round"
            />
          ))}
        </Layer>
        <Layer listening={false}>
          {remoteStrokes.map((stroke, i) => (
            <Line
              key={`remote-${stroke.userId}-${i}`}
              points={stroke.points}
              stroke={stroke.strokeColor}
              strokeWidth={stroke.strokeWidth}
              lineCap="round"
              lineJoin="round"
            />
          ))}
        </Layer>
        <Layer listening={false}>
          {currentStroke.length >= 2 && (
            <Line
              points={currentStroke}
              stroke="#000000"
              strokeWidth={2}
              lineCap="round"
              lineJoin="round"
            />
          )}
        </Layer>
        <StickyNotesLayer
          boardId={boardId}
          userId={userId}
          notes={notes}
          editingNoteId={editingNoteId}
          onEditingNoteIdChange={setEditingNoteId}
          onNoteUpdate={handleNoteUpdate}
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
        />
        <RemoteCursors boardId={boardId} excludeUserId={userId} />
      </Stage>
      {isAiLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 dark:bg-zinc-900/80">
          <div className="flex flex-col items-center gap-3">
            <div
              className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-200 border-t-violet-500 dark:border-zinc-700 dark:border-t-violet-400"
              aria-hidden
            />
            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              Categorizing ideas...
            </p>
          </div>
        </div>
      )}
    </div>
  );
});
