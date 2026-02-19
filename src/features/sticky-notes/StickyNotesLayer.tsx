"use client";

import React, { useCallback, useState } from "react";
import { Layer, Rect, Text } from "react-konva";
import { StickyNote } from "./StickyNote";
import { useRemoteDragging } from "./useRemoteDragging";
import { persistNote } from "./usePersistedNotes";
import { snapPos } from "@/features/whiteboard/snapGrid";
import type { StickyNoteElement } from "./types";

const PADDING = 8;
const FONT_SIZE = 14;

interface StickyNotesLayerProps {
  boardId: string;
  userId: string;
  notes: StickyNoteElement[];
  editingNoteId: string | null;
  onEditingNoteIdChange: (id: string | null) => void;
  selectedIds: Set<string>;
  onSelectNote: (id: string, addToSelection: boolean) => void;
  onNoteUpdate: (note: StickyNoteElement) => void;
  onNoteContextMenu?: (note: StickyNoteElement, evt: MouseEvent) => void;
  onDragStart: (elementId: string) => void;
  onDragMove: (elementId: string, x: number, y: number) => void;
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
  const remoteDragging = useRemoteDragging(boardId, userId);

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
                shadowColor="rgba(0,0,0,0.2)"
                shadowBlur={4}
                shadowOffsetY={2}
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
            onSelect={(shiftKey) => onSelectNote(note.id, shiftKey)}
            onEditStart={() => onEditingNoteIdChange(note.id)}
            onEditEnd={(text) => handleEditEnd(note, text)}
            onContextMenu={(evt) => onNoteContextMenu?.(note, evt)}
            onDragStart={() => onDragStart(note.id)}
            onDragMove={(x, y) => onDragMove(note.id, x, y)}
            onDragEnd={(x, y) => handleDragEnd(note, x, y)}
          />
        );
      })}
    </Layer>
  );
}
