"use client";

import { useCallback, useRef, useState } from "react";
import Konva from "konva";
import type { LineElement } from "./types";

const DEFAULT_STROKE_WIDTH = 2;
const DEFAULT_STROKE_COLOR = "#000000";

export type OnLineComplete = (line: LineElement) => void;

/** Converts screen coords (x, y) to board coords. If not provided, coords are used as-is. */
export type ScreenToBoard = (screenX: number, screenY: number) => { x: number; y: number };

export function useLocalDrawing(
  userId: string,
  onLineComplete?: OnLineComplete,
  screenToBoard?: ScreenToBoard
) {
  const [currentStroke, setCurrentStroke] = useState<number[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const isDrawingRef = useRef(false);
  const pointsRef = useRef<number[]>([]);
  const rafScheduledRef = useRef(false);

  const flushPoints = useCallback(() => {
    if (pointsRef.current.length > 0) {
      setCurrentStroke([...pointsRef.current]);
    }
  }, []);

  const scheduleFlush = useCallback(() => {
    if (rafScheduledRef.current) return;
    rafScheduledRef.current = true;
    requestAnimationFrame(() => {
      rafScheduledRef.current = false;
      flushPoints();
    });
  }, [flushPoints]);

  const handleMouseDown = useCallback(
    (evt: Konva.KonvaEventObject<MouseEvent>) => {
      isDrawingRef.current = true;
      setIsDrawing(true);
      const stage = evt.target.getStage();
      const pos = stage?.getPointerPosition();
      if (pos) {
        const { x, y } = screenToBoard ? screenToBoard(pos.x, pos.y) : pos;
        const pts = [x, y];
        pointsRef.current = pts;
        setCurrentStroke(pts);
      }
    },
    [screenToBoard]
  );

  const handleMouseMove = useCallback(
    (evt: Konva.KonvaEventObject<MouseEvent>) => {
      if (!isDrawingRef.current) return;
      const stage = evt.target.getStage();
      const pos = stage?.getPointerPosition();
      if (pos) {
        const { x, y } = screenToBoard ? screenToBoard(pos.x, pos.y) : pos;
        pointsRef.current.push(x, y);
        scheduleFlush();
      }
    },
    [scheduleFlush, screenToBoard]
  );

  const handleMouseUp = useCallback(() => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    setIsDrawing(false);

    const pts = pointsRef.current;
    if (pts.length >= 4) {
      const id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `line-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      const line: LineElement = {
        id,
        type: "line",
        points: pts,
        strokeWidth: DEFAULT_STROKE_WIDTH,
        strokeColor: DEFAULT_STROKE_COLOR,
        createdBy: userId,
        createdAt: Date.now(),
      };

      onLineComplete?.(line);
    }

    pointsRef.current = [];
    setCurrentStroke([]);
  }, [userId, onLineComplete]);

  return {
    currentStroke,
    isDrawing,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
  };
}
