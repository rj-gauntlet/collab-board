"use client";

import React, { useMemo } from "react";
import { Layer, Arrow, Text, Group, Rect } from "react-konva";
import type { ConnectorElement } from "./types";
import type { StickyNoteElement } from "@/features/sticky-notes";
import type { ShapeElement } from "@/features/shapes";

type Point = { x: number; y: number };

/** Returns the 4 cardinal anchor points (top, right, bottom, left) for a rect bounding box. */
function bboxAnchors(x: number, y: number, w: number, h: number): Point[] {
  const cx = x + w / 2;
  const cy = y + h / 2;
  return [
    { x: cx, y },          // top
    { x: x + w, y: cy },   // right
    { x: cx, y: y + h },   // bottom
    { x, y: cy },           // left
  ];
}

function getNoteAnchors(note: StickyNoteElement): Point[] {
  return bboxAnchors(note.x, note.y, note.width, note.height);
}

function getShapeAnchors(shape: ShapeElement): Point[] {
  return bboxAnchors(shape.x, shape.y, shape.width, shape.height);
}

function dist2(a: Point, b: Point): number {
  return (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
}

/**
 * Given two sets of anchor points, returns the pair (one from each set)
 * with the smallest straight-line distance.
 */
function closestAnchorPair(anchorsA: Point[], anchorsB: Point[]): [Point, Point] {
  let best: [Point, Point] = [anchorsA[0], anchorsB[0]];
  let bestD = Infinity;
  for (const a of anchorsA) {
    for (const b of anchorsB) {
      const d = dist2(a, b);
      if (d < bestD) { bestD = d; best = [a, b]; }
    }
  }
  return best;
}

/**
 * For curved connectors, computes a perpendicular control point at the midpoint
 * so the line arcs naturally between the two endpoints.
 */
function curvedPoints(from: Point, to: Point): number[] {
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  // Perpendicular unit vector, scaled to 20% of the segment length
  const offset = len * 0.25;
  const cx = mx - (dy / len) * offset;
  const cy = my + (dx / len) * offset;
  return [from.x, from.y, cx, cy, to.x, to.y];
}

interface ConnectorsLayerProps {
  connectors: ConnectorElement[];
  notes: StickyNoteElement[];
  shapes: ShapeElement[];
  /** Called with board-space midpoint coordinates of the connector. */
  onRequestEditLabel?: (connectorId: string, boardMidX: number, boardMidY: number, label: string) => void;
  /** ID of the connector whose label is currently being edited. */
  editingConnectorId?: string;
  /** ID of the selected connector (shows highlight ring). */
  selectedConnectorId?: string;
  /** Called when user clicks a connector line. */
  onSelectConnector?: (connectorId: string) => void;
  x?: number;
  y?: number;
  scaleX?: number;
  scaleY?: number;
}

export function ConnectorsLayer({
  connectors,
  notes,
  shapes,
  onRequestEditLabel,
  editingConnectorId,
  selectedConnectorId,
  onSelectConnector,
  x = 0,
  y = 0,
  scaleX = 1,
  scaleY = 1,
}: ConnectorsLayerProps) {
  const noteMap = useMemo(() => {
    const m = new Map<string, StickyNoteElement>();
    notes.forEach((n) => m.set(n.id, n));
    return m;
  }, [notes]);

  const shapeMap = useMemo(() => {
    const m = new Map<string, ShapeElement>();
    shapes.forEach((s) => m.set(s.id, s));
    return m;
  }, [shapes]);

  const getAnchors = useMemo(() => {
    return (id: string, type: ConnectorElement["fromType"]): Point[] | null => {
      if (type === "note") {
        const note = noteMap.get(id);
        return note ? getNoteAnchors(note) : null;
      }
      const shape = shapeMap.get(id);
      return shape ? getShapeAnchors(shape) : null;
    };
  }, [noteMap, shapeMap]);

  const hasHandler = !!(onRequestEditLabel || onSelectConnector);

  return (
    <Layer listening={hasHandler} x={x} y={y} scaleX={scaleX} scaleY={scaleY}>
      {connectors.map((conn) => {
        const fromAnchors = getAnchors(conn.fromId, conn.fromType);
        const toAnchors = getAnchors(conn.toId, conn.toType);
        if (!fromAnchors || !toAnchors) return null;
        const [from, to] = closestAnchorPair(fromAnchors, toAnchors);

        const stroke = conn.stroke ?? "#5d4037";
        const strokeWidth = conn.strokeWidth ?? 2;
        const isArrow = conn.style === "arrow";
        const isDashed = conn.dashed ?? false;
        const isCurved = conn.curved ?? false;
        const isBidir = conn.bidirectional ?? false;
        const isSelected = conn.id === selectedConnectorId;

        const points = isCurved
          ? curvedPoints(from, to)
          : [from.x, from.y, to.x, to.y];

        // Label position: visual midpoint of the line/curve
        const midX = isCurved
          ? (points[0] + points[2] * 2 + points[4]) / 4  // quadratic bezier at t=0.5
          : (from.x + to.x) / 2;
        const midY = isCurved
          ? (points[1] + points[3] * 2 + points[5]) / 4
          : (from.y + to.y) / 2;

        const label = conn.label ?? "";

        return (
          <Group key={conn.id}>
            {/* Invisible wide hit area for easier clicking */}
            <Arrow
              points={points}
              tension={isCurved ? 0.5 : 0}
              stroke="transparent"
              fill="transparent"
              strokeWidth={Math.max(strokeWidth + 10, 16)}
              pointerLength={0}
              pointerWidth={0}
              listening={hasHandler}
              onClick={(e) => {
                e.cancelBubble = true;
                onSelectConnector?.(conn.id);
              }}
              onTap={(e) => {
                e.cancelBubble = true;
                onSelectConnector?.(conn.id);
              }}
            />

            {/* Selection glow behind the arrow */}
            {isSelected && (
              <Arrow
                points={points}
                tension={isCurved ? 0.5 : 0}
                stroke="#ff8f00"
                fill="transparent"
                strokeWidth={strokeWidth + 4}
                pointerLength={0}
                pointerWidth={0}
                opacity={0.35}
                listening={false}
                dash={isDashed ? [8, 6] : undefined}
                dashEnabled={isDashed}
              />
            )}

            {/* Main connector arrow */}
            <Arrow
              points={points}
              tension={isCurved ? 0.5 : 0}
              stroke={stroke}
              fill={stroke}
              strokeWidth={strokeWidth}
              pointerLength={isArrow ? 10 : 0}
              pointerWidth={isArrow ? 10 : 0}
              pointerAtBeginning={isArrow && isBidir}
              pointerAtEnding={isArrow}
              dash={isDashed ? [8, 6] : undefined}
              dashEnabled={isDashed}
              listening={hasHandler}
              onDblClick={(e) => {
                e.cancelBubble = true;
                onRequestEditLabel?.(conn.id, midX, midY, label);
              }}
              onTap={(e) => {
                e.cancelBubble = true;
                onSelectConnector?.(conn.id);
              }}
            />

            {/* Label badge */}
            {label && conn.id !== editingConnectorId ? (
              <Group x={midX} y={midY}>
                <Rect
                  x={-label.length * 4 - 4}
                  y={-10}
                  width={label.length * 8 + 8}
                  height={20}
                  fill="white"
                  cornerRadius={3}
                  stroke={stroke}
                  strokeWidth={0.75}
                  listening={hasHandler}
                  onDblClick={(e) => {
                    e.cancelBubble = true;
                    onRequestEditLabel?.(conn.id, midX, midY, label);
                  }}
                />
                <Text
                  x={-label.length * 4 - 4}
                  y={-10}
                  width={label.length * 8 + 8}
                  height={20}
                  text={label}
                  fontSize={12}
                  fontFamily="sans-serif"
                  fill={stroke}
                  align="center"
                  verticalAlign="middle"
                  listening={false}
                />
              </Group>
            ) : null}
          </Group>
        );
      })}
    </Layer>
  );
}
