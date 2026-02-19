"use client";

import React, { useCallback } from "react";
import { Layer } from "react-konva";
import { TextNode, type RequestEditTextFn } from "./TextNode";
export type { RequestEditTextFn };
import { persistTextElement } from "./usePersistedTextElements";
import { snapPos } from "@/features/whiteboard/snapGrid";
import type { TextElement } from "./types";

interface TextElementsLayerProps {
  boardId: string;
  userId: string;
  textElements: TextElement[];
  selectedIds: Set<string>;
  onSelectText: (id: string, addToSelection: boolean) => void;
  onTextUpdate: (text: TextElement) => void;
  onRequestEditText?: (id: string) => void;
  onTextContextMenu?: (text: TextElement, evt: MouseEvent) => void;
  onDragStart: (elementId: string) => void;
  onDragMove?: (elementId: string, x: number, y: number) => void;
  onDragEnd: (elementId: string, x: number, y: number) => void;
  snapEnabled?: boolean;
  x?: number;
  y?: number;
  scaleX?: number;
  scaleY?: number;
}

export function TextElementsLayer({
  boardId,
  userId,
  textElements,
  selectedIds,
  onSelectText,
  onTextUpdate,
  onRequestEditText,
  onTextContextMenu,
  onDragStart,
  onDragMove,
  onDragEnd,
  snapEnabled = false,
  x = 0,
  y = 0,
  scaleX = 1,
  scaleY = 1,
}: TextElementsLayerProps) {
  const handleChange = useCallback(
    async (text: TextElement, updates: Partial<TextElement>) => {
      const updated: TextElement = {
        ...text,
        ...updates,
        updatedAt: Date.now(),
      };
      onTextUpdate(updated);
      try {
        await persistTextElement(boardId, updated);
      } catch (err) {
        console.error("Failed to persist text element:", err);
      }
    },
    [boardId, onTextUpdate]
  );

  const handleDragEnd = useCallback(
    (text: TextElement, newX: number, newY: number) => {
      const snapped = snapPos(newX, newY, snapEnabled);
      onDragEnd(text.id, snapped.x, snapped.y);
      const updated: TextElement = {
        ...text,
        x: snapped.x,
        y: snapped.y,
        updatedAt: Date.now(),
      };
      onTextUpdate(updated);
      persistTextElement(boardId, updated).catch((err) =>
        console.error("Failed to persist text position:", err)
      );
    },
    [boardId, onDragEnd, onTextUpdate, snapEnabled]
  );

  return (
    <Layer listening={true} x={x} y={y} scaleX={scaleX} scaleY={scaleY}>
      {textElements.map((text) => (
        <TextNode
          key={text.id}
          textElement={text}
          isSelected={selectedIds.has(text.id)}
          onSelect={(shiftKey) => onSelectText(text.id, shiftKey)}
          onUpdate={(updates) => handleChange(text, updates)}
          onRequestEditText={onRequestEditText}
          onContextMenu={(evt) => onTextContextMenu?.(text, evt)}
          onDragStart={() => onDragStart(text.id)}
          onDragMove={(x, y) => onDragMove?.(text.id, x, y)}
          onDragEnd={(newX, newY) => handleDragEnd(text, newX, newY)}
        />
      ))}
    </Layer>
  );
}
