"use client";

import React from "react";
import { Layer, Rect } from "react-konva";
import type { RemoteSelection } from "./useRemoteSelections";
import { userIdToColor } from "@/features/cursors";

/** Minimal shape so the layer doesn't depend on feature modules. */
type BoundsLike = { id: string; x: number; y: number; width: number; height: number };
type TextBoundsLike = { id: string; x: number; y: number; width: number; fontSize: number };

/** Live position for the element currently being dragged (so outline tracks during drag). */
export type LiveDrag = { elementId: string | null; x: number; y: number };

/** Position of an element being dragged by another user (from useRemoteDragging). */
export type RemoteDragByElementId = Map<string, { x: number; y: number }>;

interface RemoteSelectionLayerProps {
  remoteSelections: RemoteSelection[];
  notes: BoundsLike[];
  shapes: BoundsLike[];
  textElements: TextBoundsLike[];
  frames: BoundsLike[];
  /** Resolved frame positions (from canvas: includes remote drag + linger so outline doesn't jump). */
  frameDisplayPositions?: Map<string, { x: number; y: number }>;
  /** Current user's drag: outline for this element uses (x,y) so it tracks. */
  liveDrag?: LiveDrag | null;
  /** Other users' drags: outline for these elements uses these positions (so outline tracks on viewer's client). */
  remoteDragByElementId?: RemoteDragByElementId;
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
}

/**
 * Renders dashed outlines for other users' selected elements. Bounds are derived
 * from the same merged element arrays used to render the canvas, so outlines track
 * during drag and reset to the new position after drop.
 */
export function RemoteSelectionLayer({
  remoteSelections,
  notes,
  shapes,
  textElements,
  frames,
  frameDisplayPositions,
  liveDrag,
  remoteDragByElementId,
  x,
  y,
  scaleX,
  scaleY,
}: RemoteSelectionLayerProps) {
  const strokeWidth = 2 / Math.min(scaleX, scaleY);

  function getLivePosition(id: string): { x: number; y: number } | null {
    const remote = remoteDragByElementId?.get(id);
    if (remote) return remote;
    if (liveDrag?.elementId === id) return { x: liveDrag.x, y: liveDrag.y };
    return null;
  }

  function getBounds(id: string): { x: number; y: number; width: number; height: number } | null {
    const livePos = getLivePosition(id);

    const note = notes.find((n) => n.id === id);
    if (note) {
      const pos = livePos ?? { x: note.x, y: note.y };
      return { ...pos, width: note.width, height: note.height };
    }
    const shape = shapes.find((s) => s.id === id);
    if (shape) {
      const pos = livePos ?? { x: shape.x, y: shape.y };
      return { ...pos, width: shape.width, height: shape.height };
    }
    const te = textElements.find((t) => t.id === id);
    if (te) {
      const pos = livePos ?? { x: te.x, y: te.y };
      return { ...pos, width: te.width, height: te.fontSize * 2 };
    }
    const frame = frames.find((f) => f.id === id);
    if (frame) {
      const pos = livePos ?? frameDisplayPositions?.get(id) ?? { x: frame.x, y: frame.y };
      return { ...pos, width: frame.width, height: frame.height };
    }
    return null;
  }

  return (
    <Layer name="export-hide" x={x} y={y} scaleX={scaleX} scaleY={scaleY} listening={false}>
      {remoteSelections.map(({ userId, selectedIds }) => {
        const color = userIdToColor(userId);
        return selectedIds.map((id) => {
          const bounds = getBounds(id);
          if (!bounds) return null;
          return (
            <Rect
              key={`${userId}-${id}`}
              x={bounds.x - 2}
              y={bounds.y - 2}
              width={bounds.width + 4}
              height={bounds.height + 4}
              stroke={color}
              strokeWidth={strokeWidth}
              dash={[6, 4]}
              fillEnabled={false}
              listening={false}
            />
          );
        });
      })}
    </Layer>
  );
}
