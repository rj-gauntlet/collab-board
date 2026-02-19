"use client";

import React, { useCallback, useState, useRef, useEffect } from "react";
import { Layer, Transformer } from "react-konva";
import Konva from "konva";
import { ShapeNode } from "./ShapeNode";
import { useRemoteDragging } from "@/features/sticky-notes/useRemoteDragging";
import { persistShape } from "./usePersistedShapes";
import type { ShapeElement } from "./types";

interface ShapesLayerProps {
  boardId: string;
  userId: string;
  shapes: ShapeElement[];
  selectedIds: Set<string>;
  onSelectShape: (id: string, addToSelection: boolean) => void;
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
  selectedIds,
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
  const [selectedRefs, setSelectedRefs] = useState<Map<string, Konva.Node>>(new Map());
  const multiTrRef = useRef<Konva.Transformer>(null);

  const remoteDragging = useRemoteDragging(boardId, userId);
  const remoteDraggingByElementId = new Map(
    remoteDragging.map((d) => [d.elementId, d])
  );

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

  const handleMultiTransformEnd = useCallback(() => {
    for (const id of selectedIds) {
      const node = selectedRefs.get(id) as Konva.Group | undefined;
      const shape = shapes.find((s) => s.id === id);
      if (!node || !shape) continue;
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();
      node.scaleX(1);
      node.scaleY(1);
      const updates: Partial<ShapeElement> = {
        x: node.x(),
        y: node.y(),
        width: Math.max(20, node.width() * scaleX),
        height: Math.max(20, node.height() * scaleY),
        rotation: node.rotation(),
        updatedAt: Date.now(),
      };
      const updated: ShapeElement = { ...shape, ...updates };
      onShapeUpdate(updated);
      persistShape(boardId, updated).catch((err) =>
        console.error("Failed to persist shape:", err)
      );
    }
    onDragEnd();
  }, [selectedIds, selectedRefs, shapes, boardId, onShapeUpdate, onDragEnd]);

  const isMultiSelect = selectedIds.size > 1;
  const multiSelectNodes = isMultiSelect ? Array.from(selectedRefs.values()).filter(Boolean) : [];

  return (
    <Layer listening={true} x={x} y={y} scaleX={scaleX} scaleY={scaleY}>
      {shapes.map((shape) => {
        const remoteDrag = remoteDraggingByElementId.get(shape.id);
        return (
          <ShapeNode
            key={shape.id}
            shape={shape}
            isSelected={selectedIds.has(shape.id)}
            isMultiSelectMode={isMultiSelect}
            onSelect={(shiftKey) => onSelectShape(shape.id, shiftKey)}
            onRegisterSelectRef={onRegisterSelectRef}
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
      {isMultiSelect && multiSelectNodes.length > 0 && (
        <Transformer
          ref={multiTrRef}
          name="transformer"
          flipEnabled={false}
          rotateEnabled={true}
          boundBoxFunc={(oldBox, newBox) => {
            if (Math.abs(newBox.width) < 20 || Math.abs(newBox.height) < 20) {
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
