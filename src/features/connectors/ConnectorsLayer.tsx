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
    { x, y: cy },          // left
  ];
}

function rotatePoint(px: number, py: number, degrees: number): Point {
  const rad = (degrees * Math.PI) / 180;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return { x: px * c - py * s, y: px * s + py * c };
}

/** Anchor points on the shape edge in group-local coords (origin at shape.x, shape.y). */
function getShapeAnchors(shape: ShapeElement): Point[] {
  const w = shape.width;
  const h = shape.height;
  const rotation = shape.rotation ?? 0;
  const ox = shape.x;
  const oy = shape.y;

  let local: Point[];
  if (shape.kind === "triangle") {
    const r = Math.min(w, h) / 2;
    const cx = w / 2;
    const cy = h / 2;
    // RegularPolygon: vertices at -90°, 30°, 150° (point-up)
    const angles = [-90, 30, 150].map((deg) => (deg * Math.PI) / 180);
    const vertices = angles.map((a) => ({
      x: cx + r * Math.cos(a),
      y: cy + r * Math.sin(a),
    }));
    // Anchor at midpoint of each side so connectors touch the triangle edges
    local = [
      { x: (vertices[0].x + vertices[1].x) / 2, y: (vertices[0].y + vertices[1].y) / 2 },
      { x: (vertices[1].x + vertices[2].x) / 2, y: (vertices[1].y + vertices[2].y) / 2 },
      { x: (vertices[2].x + vertices[0].x) / 2, y: (vertices[2].y + vertices[0].y) / 2 },
    ];
  } else if (shape.kind === "circle") {
    const r = Math.min(w, h) / 2;
    const angles = [0, 90, 180, 270].map((deg) => (deg * Math.PI) / 180);
    local = angles.map((a) => ({
      x: w / 2 + r * Math.cos(a),
      y: h / 2 + r * Math.sin(a),
    }));
  } else {
    // rect: cardinal midpoints of box
    local = [
      { x: w / 2, y: 0 },
      { x: w, y: h / 2 },
      { x: w / 2, y: h },
      { x: 0, y: h / 2 },
    ];
  }

  return local.map((p) => {
    const rotated = rotation !== 0 ? rotatePoint(p.x, p.y, rotation) : p;
    return { x: ox + rotated.x, y: oy + rotated.y };
  });
}

function getNoteAnchors(note: StickyNoteElement): Point[] {
  return bboxAnchors(note.x, note.y, note.width, note.height);
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

/** Returns the anchor in the list closest to the given point. */
function closestAnchorToPoint(anchors: Point[], point: Point): Point {
  let best = anchors[0];
  let bestD = dist2(best, point);
  for (let i = 1; i < anchors.length; i++) {
    const d = dist2(anchors[i], point);
    if (d < bestD) {
      bestD = d;
      best = anchors[i];
    }
  }
  return best;
}

interface ConnectorsLayerProps {
  connectors: ConnectorElement[];
  notes: StickyNoteElement[];
  shapes: ShapeElement[];
  /** When set, the connector tool has picked a first endpoint; show preview to cursor. */
  connectorFrom?: { id: string; type: ConnectorElement["fromType"] } | null;
  /** Board-space cursor position while drawing a connector (other end of preview). */
  connectorPreviewTo?: { x: number; y: number } | null;
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
  connectorFrom,
  connectorPreviewTo,
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

  const previewLine = (() => {
    if (!connectorFrom || !connectorPreviewTo) return null;
    const fromAnchors = getAnchors(connectorFrom.id, connectorFrom.type);
    if (!fromAnchors || !fromAnchors.length) return null;
    const from = closestAnchorToPoint(fromAnchors, connectorPreviewTo);
    const to = connectorPreviewTo;
    const stroke = "#5d4037";
    const strokeWidth = 2;
    return (
      <Arrow
        key="connector-preview"
        points={[from.x, from.y, to.x, to.y]}
        stroke={stroke}
        fill={stroke}
        strokeWidth={strokeWidth}
        pointerLength={10}
        pointerWidth={10}
        pointerAtBeginning={false}
        pointerAtEnding={true}
        listening={false}
        opacity={0.85}
      />
    );
  })();

  return (
    <Layer listening={hasHandler} x={x} y={y} scaleX={scaleX} scaleY={scaleY}>
      {previewLine}
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
