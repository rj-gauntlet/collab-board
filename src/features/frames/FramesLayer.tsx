"use client";

import React, { useCallback, useState, useRef, useEffect } from "react";
import { Layer, Transformer, Rect, Text, Line, Group } from "react-konva";
import Konva from "konva";
import { FrameNode, type RequestEditTitleFn } from "./FrameNode";
import { useRemoteDragging } from "@/features/sticky-notes/useRemoteDragging";
import { persistFrame } from "./usePersistedFrames";
import { snapPos } from "@/features/whiteboard/snapGrid";
import type { FrameElement } from "./types";
import { FRAME_TITLE_BAR_HEIGHT } from "./types";

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
  onDragMove?: (positions: { elementId: string; x: number; y: number }[]) => void;
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
  onDragMove,
  onDragEnd,
  snapEnabled = false,
  x = 0,
  y = 0,
  scaleX = 1,
  scaleY = 1,
}: FramesLayerProps) {
  const [selectedRefs, setSelectedRefs] = useState<Map<string, Konva.Node>>(new Map());
  const multiTrRef = useRef<Konva.Transformer>(null);
  const remoteDragging = useRemoteDragging(boardId, userId);
  const remoteDraggingByElementId = new Map(
    remoteDragging.map((d) => [d.elementId, d])
  );

  // When remote drag ends (other user dropped), keep showing last position briefly so we don't flash
  // back to stale persisted position before Firestore update arrives.
  const LINGER_MS = 400;
  const previousRemoteRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const lingeredRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const lingerTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const [, setLingerTick] = useState(0);

  const getDisplayPosition = useCallback(
    (frame: FrameElement): { x: number; y: number } => {
      const id = frame.id;
      const remote = remoteDraggingByElementId.get(id);
      if (remote) return { x: remote.x, y: remote.y };

      const lingered = lingeredRef.current.get(id);
      if (lingered) {
        const caughtUp =
          Math.abs(frame.x - lingered.x) < 1 && Math.abs(frame.y - lingered.y) < 1;
        if (caughtUp) {
          lingeredRef.current.delete(id);
          const t = lingerTimeoutsRef.current.get(id);
          if (t) {
            clearTimeout(t);
            lingerTimeoutsRef.current.delete(id);
          }
          return { x: frame.x, y: frame.y };
        }
        return lingered;
      }

      const previous = previousRemoteRef.current.get(id);
      if (previous) {
        lingeredRef.current.set(id, previous);
        if (!lingerTimeoutsRef.current.has(id)) {
          const t = setTimeout(() => {
            lingeredRef.current.delete(id);
            lingerTimeoutsRef.current.delete(id);
            setLingerTick((n) => n + 1);
          }, LINGER_MS);
          lingerTimeoutsRef.current.set(id, t);
        }
        return previous;
      }

      return { x: frame.x, y: frame.y };
    },
    [remoteDraggingByElementId]
  );

  // Keep previous remote in sync for next render (so we detect "just dropped").
  previousRemoteRef.current = new Map(
    Array.from(remoteDraggingByElementId.entries()).map(([id, d]) => [id, { x: d.x, y: d.y }])
  );

  useEffect(() => {
    return () => {
      lingerTimeoutsRef.current.forEach((t) => clearTimeout(t));
      lingerTimeoutsRef.current.clear();
    };
  }, []);

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
      {frames.map((frame) => {
        const { x: displayX, y: displayY } = getDisplayPosition(frame);
        const isRemoteOrLingered =
          remoteDraggingByElementId.has(frame.id) || lingeredRef.current.has(frame.id);

        if (isRemoteOrLingered) {
          return (
            <Group key={frame.id} x={displayX} y={displayY} listening={false}>
              <Rect
                width={frame.width}
                height={frame.height}
                fill={frame.fill}
                stroke={frame.stroke}
                strokeWidth={Math.max(1, frame.strokeWidth)}
                cornerRadius={8}
                shadowColor="rgba(62, 39, 35, 0.2)"
                shadowBlur={12}
                shadowOffsetY={3}
              />
              <Rect
                x={0}
                y={0}
                width={frame.width}
                height={FRAME_TITLE_BAR_HEIGHT}
                fill="rgba(93, 64, 55, 0.18)"
                cornerRadius={[8, 8, 0, 0]}
                listening={false}
              />
              <Line
                points={[0, FRAME_TITLE_BAR_HEIGHT, frame.width, FRAME_TITLE_BAR_HEIGHT]}
                stroke="rgba(93, 64, 55, 0.45)"
                strokeWidth={2}
                listening={false}
              />
              <Text
                x={8}
                y={4}
                width={frame.width - 16}
                height={FRAME_TITLE_BAR_HEIGHT - 8}
                text={frame.title || "Double-click to add title"}
                fontSize={14}
                fontStyle="600"
                fontFamily="sans-serif"
                fill={frame.title ? "#3e2723" : "#9ca3af"}
                wrap="none"
                ellipsis={true}
                verticalAlign="middle"
                listening={false}
              />
            </Group>
          );
        }

        return (
          <FrameNode
            key={frame.id}
            frame={frame}
            isSelected={selectedIds.has(frame.id)}
            isMultiSelectMode={isMultiSelect}
            onSelect={(shiftKey) => onSelectFrame(frame.id, shiftKey)}
            onRegisterSelectRef={onRegisterSelectRef}
            onUpdate={(updates) => {
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
            onDragMove={onDragMove ? (dx, dy) => onDragMove([{ elementId: frame.id, x: dx, y: dy }]) : undefined}
            onDragEnd={onDragEnd}
          />
        );
      })}
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
