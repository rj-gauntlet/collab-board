"use client";

import React, { useCallback, useState, useRef, useEffect } from "react";
import { Layer, Rect, Text, Transformer } from "react-konva";
import Konva from "konva";
import { StickyNote } from "./StickyNote";
import { useRemoteDragging } from "./useRemoteDragging";
import { persistNote } from "./usePersistedNotes";
import { snapPos } from "@/features/whiteboard/snapGrid";
import type { StickyNoteElement } from "./types";

const MIN_NOTE_WIDTH = 80;
const MIN_NOTE_HEIGHT = 60;

const PADDING = 8;
const FONT_SIZE = 14;

interface StickyNotesLayerProps {
  boardId: string;
  userId: string;
  notes: StickyNoteElement[];
  /** ID of the note currently chosen as connector source (show "connecting from" highlight). */
  connectorFromId?: string | null;
  editingNoteId: string | null;
  onEditingNoteIdChange: (id: string | null) => void;
  selectedIds: Set<string>;
  onSelectNote: (id: string, addToSelection: boolean) => void;
  onNoteUpdate: (note: StickyNoteElement) => void;
  onNoteContextMenu?: (note: StickyNoteElement, evt: MouseEvent) => void;
  onDragStart: (elementId: string) => void;
  onDragMove: (positions: { elementId: string; x: number; y: number }[]) => void;
  onDragEnd: () => void;
  snapEnabled?: boolean;
  x?: number;
  y?: number;
  scaleX?: number;
  scaleY?: number;
}

export function StickyNotesLayer({
  boardId,
  userId,
  notes,
  connectorFromId,
  editingNoteId,
  onEditingNoteIdChange,
  selectedIds,
  onSelectNote,
  onNoteUpdate,
  onNoteContextMenu,
  onDragStart,
  onDragMove,
  onDragEnd,
  snapEnabled = false,
  x = 0,
  y = 0,
  scaleX = 1,
  scaleY = 1,
}: StickyNotesLayerProps) {
  const [selectedRefs, setSelectedRefs] = useState<Map<string, Konva.Node>>(new Map());
  const multiTrRef = useRef<Konva.Transformer>(null);
  const remoteDragging = useRemoteDragging(boardId, userId);

  const onRegisterSelectRef = useCallback((id: string, node: Konva.Node | null) => {
    setSelectedRefs((prev) => {
      const next = new Map(prev);
      if (node) next.set(id, node);
      else next.delete(id);
      return next;
    });
  }, []);

  useEffect(() => {
    if (selectedIds.size <= 1) {
      setSelectedRefs(new Map());
    }
  }, [selectedIds.size]);

  useEffect(() => {
    if (selectedIds.size > 1 && multiTrRef.current) {
      const nodes = Array.from(selectedRefs.values()).filter(Boolean);
      if (nodes.length > 0) {
        multiTrRef.current.nodes(nodes);
        multiTrRef.current.getLayer()?.batchDraw();
      }
    }
  }, [selectedIds.size, selectedRefs]);

  const handleMultiTransformEnd = useCallback(() => {
    for (const id of selectedIds) {
      const node = selectedRefs.get(id) as Konva.Group | undefined;
      const note = notes.find((n) => n.id === id);
      if (!node || !note) continue;
      const sx = node.scaleX();
      const sy = node.scaleY();
      node.scaleX(1);
      node.scaleY(1);
      const updated: StickyNoteElement = {
        ...note,
        x: node.x(),
        y: node.y(),
        width: Math.max(MIN_NOTE_WIDTH, node.width() * sx),
        height: Math.max(MIN_NOTE_HEIGHT, node.height() * sy),
        updatedAt: Date.now(),
      };
      onNoteUpdate(updated);
      persistNote(boardId, updated).catch((err) =>
        console.error("Failed to persist note resize:", err)
      );
    }
    onDragEnd();
  }, [selectedIds, selectedRefs, notes, boardId, onNoteUpdate, onDragEnd]);

  const handleResizeEnd = useCallback(
    (note: StickyNoteElement, updates: { x: number; y: number; width: number; height: number }) => {
      const updated: StickyNoteElement = {
        ...note,
        ...updates,
        updatedAt: Date.now(),
      };
      onNoteUpdate(updated);
      persistNote(boardId, updated).catch((err) =>
        console.error("Failed to persist note resize:", err)
      );
      onDragEnd();
    },
    [boardId, onNoteUpdate, onDragEnd]
  );

  const remoteDraggingByElementId = new Map(
    remoteDragging.map((d) => [d.elementId, d])
  );

  const handleEditEnd = useCallback(
    async (note: StickyNoteElement, newText: string) => {
      onEditingNoteIdChange(null);
      if (newText === note.text) return;

      const updated: StickyNoteElement = {
        ...note,
        text: newText,
        updatedAt: Date.now(),
      };
      onNoteUpdate(updated);
      try {
        await persistNote(boardId, updated);
      } catch (err) {
        console.error("Failed to persist note text:", err);
      }
    },
    [boardId, onEditingNoteIdChange, onNoteUpdate]
  );

  const handleDragEnd = useCallback(
    async (note: StickyNoteElement, x: number, y: number) => {
      onDragEnd();
      const snapped = snapPos(x, y, snapEnabled);
      const updated: StickyNoteElement = {
        ...note,
        x: snapped.x,
        y: snapped.y,
        updatedAt: Date.now(),
      };
      onNoteUpdate(updated);
      try {
        await persistNote(boardId, updated);
      } catch (err) {
        console.error("Failed to persist note position:", err);
      }
    },
    [boardId, onDragEnd, onNoteUpdate, snapEnabled]
  );

  return (
    <Layer listening={true} x={x} y={y} scaleX={scaleX} scaleY={scaleY}>
      {notes.map((note) => {
        const remoteDrag = remoteDraggingByElementId.get(note.id);
        const displayX = remoteDrag ? remoteDrag.x : note.x;
        const displayY = remoteDrag ? remoteDrag.y : note.y;

        if (remoteDrag) {
          return (
            <React.Fragment key={note.id}>
              <Rect
                x={displayX}
                y={displayY}
                width={note.width}
                height={note.height}
                fill={note.color}
                stroke="#d4d4d8"
                strokeWidth={1}
                shadowColor="rgba(62, 39, 35, 0.12)"
                shadowBlur={3}
                shadowOffsetY={1}
                cornerRadius={4}
                listening={false}
              />
              <Text
                x={displayX + PADDING}
                y={displayY + PADDING}
                width={note.width - PADDING * 2}
                height={note.height - PADDING * 2}
                text={note.text || "Double-click to edit"}
                fontSize={FONT_SIZE}
                fontFamily="sans-serif"
                fill={note.text ? "#1f2937" : "#9ca3af"}
                padding={4}
                wrap="word"
                ellipsis
                listening={false}
              />
            </React.Fragment>
          );
        }

        return (
          <StickyNote
            key={note.id}
            note={note}
            isEditing={editingNoteId === note.id}
            isSelected={selectedIds.has(note.id)}
            isConnectorFrom={note.id === connectorFromId}
            isMultiSelectMode={selectedIds.size > 1}
            onSelect={(shiftKey) => onSelectNote(note.id, shiftKey)}
            onEditStart={() => onEditingNoteIdChange(note.id)}
            onEditEnd={(text) => handleEditEnd(note, text)}
            onResizeEnd={(updates) => handleResizeEnd(note, updates)}
            onRegisterSelectRef={onRegisterSelectRef}
            onContextMenu={(evt) => onNoteContextMenu?.(note, evt)}
            onDragStart={() => onDragStart(note.id)}
            onDragMove={(x, y) => {
              if (selectedIds.size > 1) {
                const positions = Array.from(selectedIds)
                  .map((id) => {
                    const node = selectedRefs.get(id);
                    return node
                      ? { elementId: id, x: (node as Konva.Node).x(), y: (node as Konva.Node).y() }
                      : null;
                  })
                  .filter(Boolean) as { elementId: string; x: number; y: number }[];
                if (positions.length > 0) onDragMove(positions);
              } else {
                onDragMove([{ elementId: note.id, x, y }]);
              }
            }}
            onDragEnd={(x, y) => handleDragEnd(note, x, y)}
          />
        );
      })}
      {selectedIds.size > 1 && Array.from(selectedRefs.values()).filter(Boolean).length > 0 && (
        <Transformer
          ref={multiTrRef}
          name="transformer"
          flipEnabled={false}
          rotateEnabled={false}
          boundBoxFunc={(oldBox, newBox) => {
            if (Math.abs(newBox.width) < MIN_NOTE_WIDTH || Math.abs(newBox.height) < MIN_NOTE_HEIGHT) {
              return oldBox;
            }
            return newBox;
          }}
          onTransformEnd={handleMultiTransformEnd}
        />
      )}
    </Layer>
  );
}
