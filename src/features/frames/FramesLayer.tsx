"use client";

import React, { useCallback, useState, useRef, useEffect } from "react";
import { Layer, Transformer } from "react-konva";
import Konva from "konva";
import { FrameNode, type RequestEditTitleFn } from "./FrameNode";
import { persistFrame } from "./usePersistedFrames";
import { snapPos } from "@/features/whiteboard/snapGrid";
import type { FrameElement } from "./types";

interface FramesLayerProps {
  boardId: string;
  userId: string;
  frames: FrameElement[];
  selectedIds: Set<string>;
  onSelectFrame: (id: string, addToSelection: boolean) => void;
  onFrameUpdate: (frame: FrameElement) => void;
  onRequestEditTitle?: RequestEditTitleFn;
  onFrameContextMenu?: (frame: FrameElement, evt: MouseEvent) => void;
  onDragStart: (elementId: string) => void;
  onDragEnd: () => void;
  snapEnabled?: boolean;
  x?: number;
  y?: number;
  scaleX?: number;
  scaleY?: number;
}

export function FramesLayer({
  boardId,
  userId,
  frames,
  selectedIds,
  onSelectFrame,
  onFrameUpdate,
  onRequestEditTitle,
  onFrameContextMenu,
  onDragStart,
  onDragEnd,
  snapEnabled = false,
  x = 0,
  y = 0,
  scaleX = 1,
  scaleY = 1,
}: FramesLayerProps) {
  const [selectedRefs, setSelectedRefs] = useState<Map<string, Konva.Node>>(new Map());
  const multiTrRef = useRef<Konva.Transformer>(null);

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
    async (frame: FrameElement, updates: Partial<FrameElement>) => {
      const updated: FrameElement = { ...frame, ...updates, updatedAt: Date.now() };
      onFrameUpdate(updated);
      try {
        await persistFrame(boardId, updated);
      } catch (err) {
        console.error("Failed to persist frame:", err);
      }
    },
    [boardId, onFrameUpdate]
  );

  const handleMultiTransformEnd = useCallback(() => {
    for (const id of selectedIds) {
      const node = selectedRefs.get(id) as Konva.Group | undefined;
      const frame = frames.find((f) => f.id === id);
      if (!node || !frame) continue;
      const sx = node.scaleX();
      const sy = node.scaleY();
      node.scaleX(1);
      node.scaleY(1);
      const updated: FrameElement = {
        ...frame,
        x: node.x(),
        y: node.y(),
        width: Math.max(80, node.width() * sx),
        height: Math.max(60, node.height() * sy),
        updatedAt: Date.now(),
      };
      onFrameUpdate(updated);
      persistFrame(boardId, updated).catch((err) =>
        console.error("Failed to persist frame:", err)
      );
    }
    onDragEnd();
  }, [selectedIds, selectedRefs, frames, boardId, onFrameUpdate, onDragEnd]);

  const isMultiSelect = selectedIds.size > 1;
  const multiSelectNodes = isMultiSelect ? Array.from(selectedRefs.values()).filter(Boolean) : [];

  return (
    <Layer listening={true} x={x} y={y} scaleX={scaleX} scaleY={scaleY}>
      {frames.map((frame) => (
        <FrameNode
          key={frame.id}
          frame={frame}
          isSelected={selectedIds.has(frame.id)}
          isMultiSelectMode={isMultiSelect}
          onSelect={(shiftKey) => onSelectFrame(frame.id, shiftKey)}
          onRegisterSelectRef={onRegisterSelectRef}
          onUpdate={(updates) => {
              // Snap position on drag-end (position-only update, no resize)
              if (
                snapEnabled &&
                updates.x !== undefined &&
                updates.y !== undefined &&
                updates.width === undefined &&
                updates.height === undefined
              ) {
                const snapped = snapPos(updates.x, updates.y, true);
                handleChange(frame, { ...updates, x: snapped.x, y: snapped.y });
              } else {
                handleChange(frame, updates);
              }
            }}
          onRequestEditTitle={onRequestEditTitle}
          onContextMenu={(evt) => onFrameContextMenu?.(frame, evt)}
          onDragStart={() => onDragStart(frame.id)}
          onDragEnd={onDragEnd}
        />
      ))}
      {isMultiSelect && multiSelectNodes.length > 0 && (
        <Transformer
          ref={multiTrRef}
          name="transformer"
          flipEnabled={false}
          rotateEnabled={false}
          boundBoxFunc={(oldBox, newBox) => {
            if (Math.abs(newBox.width) < 80 || Math.abs(newBox.height) < 60) {
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
