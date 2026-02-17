"use client";

import React, { useCallback, useState } from "react";
import { Layer, Rect, Text } from "react-konva";
import { StickyNote } from "./StickyNote";
import { useRemoteDragging } from "./useRemoteDragging";
import { persistNote } from "./usePersistedNotes";
import type { StickyNoteElement } from "./types";

const PADDING = 8;
const FONT_SIZE = 14;

interface StickyNotesLayerProps {
  boardId: string;
  userId: string;
  notes: StickyNoteElement[];
  editingNoteId: string | null;
  onEditingNoteIdChange: (id: string | null) => void;
  onNoteUpdate: (note: StickyNoteElement) => void;
  onDragStart: (elementId: string) => void;
  onDragMove: (elementId: string, x: number, y: number) => void;
  onDragEnd: () => void;
}

export function StickyNotesLayer({
  boardId,
  userId,
  notes,
  editingNoteId,
  onEditingNoteIdChange,
  onNoteUpdate,
  onDragStart,
  onDragMove,
  onDragEnd,
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
      const updated: StickyNoteElement = {
        ...note,
        x,
        y,
        updatedAt: Date.now(),
      };
      onNoteUpdate(updated);
      try {
        await persistNote(boardId, updated);
      } catch (err) {
        console.error("Failed to persist note position:", err);
      }
    },
    [boardId, onDragEnd, onNoteUpdate]
  );

  return (
    <Layer listening={true}>
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
                fill="#1f2937"
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
            onEditStart={() => onEditingNoteIdChange(note.id)}
            onEditEnd={(text) => handleEditEnd(note, text)}
            onDragStart={() => onDragStart(note.id)}
            onDragMove={(x, y) => onDragMove(note.id, x, y)}
            onDragEnd={(x, y) => handleDragEnd(note, x, y)}
          />
        );
      })}
    </Layer>
  );
}
