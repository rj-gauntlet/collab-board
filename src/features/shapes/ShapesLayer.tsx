"use client";

import React, { useCallback } from "react";
import { Layer } from "react-konva";
import { ShapeNode } from "./ShapeNode";
import { useRemoteDragging } from "@/features/sticky-notes/useRemoteDragging";
import { persistShape } from "./usePersistedShapes";
import type { ShapeElement } from "./types";

interface ShapesLayerProps {
  boardId: string;
  userId: string;
  shapes: ShapeElement[];
  selectedShapeId: string | null;
  onSelectShape: (id: string | null) => void;
  onShapeUpdate: (shape: ShapeElement) => void;
  onShapeContextMenu?: (shape: ShapeElement, evt: MouseEvent) => void;
  onDragStart: (elementId: string) => void;
  onDragMove: (elementId: string, x: number, y: number) => void;
  onDragEnd: () => void;
  x?: number;
  y?: number;
  scaleX?: number;
  scaleY?: number;
}

export function ShapesLayer({
  boardId,
  userId,
  shapes,
  selectedShapeId,
  onSelectShape,
  onShapeUpdate,
  onShapeContextMenu,
  onDragStart,
  onDragMove,
  onDragEnd,
  x = 0,
  y = 0,
  scaleX = 1,
  scaleY = 1,
}: ShapesLayerProps) {
  const remoteDragging = useRemoteDragging(boardId, userId);
  const remoteDraggingByElementId = new Map(
    remoteDragging.map((d) => [d.elementId, d])
  );

  const handleChange = useCallback(
    async (shape: ShapeElement, updates: Partial<ShapeElement>) => {
      const updated: ShapeElement = { ...shape, ...updates, updatedAt: Date.now() };
      onShapeUpdate(updated);
      try {
        await persistShape(boardId, updated);
      } catch (err) {
        console.error("Failed to persist shape:", err);
      }
    },
    [boardId, onShapeUpdate]
  );

  return (
    <Layer listening={true} x={x} y={y} scaleX={scaleX} scaleY={scaleY}>
      {shapes.map((shape) => {
        const remoteDrag = remoteDraggingByElementId.get(shape.id);
        return (
          <ShapeNode
            key={shape.id}
            shape={shape}
            isSelected={selectedShapeId === shape.id}
            onSelect={() => onSelectShape(shape.id)}
            onChange={(updates) => handleChange(shape, updates)}
            onContextMenu={(evt) => onShapeContextMenu?.(shape, evt)}
            onDragStart={() => onDragStart(shape.id)}
            onDragMove={(dx, dy) => onDragMove(shape.id, dx, dy)}
            onDragEnd={onDragEnd}
            remoteX={remoteDrag?.x}
            remoteY={remoteDrag?.y}
          />
        );
      })}
    </Layer>
  );
}
