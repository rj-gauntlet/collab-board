"use client";

import { useCallback, useState, useRef } from "react";

const MIN_SCALE = 0.25;
const MAX_SCALE = 4;
const ZOOM_SENSITIVITY = 0.002;

export function usePanZoom(viewportWidth: number, viewportHeight: number) {
  const [scale, setScale] = useState(1);
  const [stageX, setStageX] = useState(0);
  const [stageY, setStageY] = useState(0);
  const isPanningRef = useRef(false);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);

  const screenToBoard = useCallback(
    (screenX: number, screenY: number) => ({
      x: (screenX - stageX) / scale,
      y: (screenY - stageY) / scale,
    }),
    [stageX, stageY, scale]
  );

  const handleWheel = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (e: any) => {
      e.evt.preventDefault();
      const stage = e.target.getStage();
      const pos = stage?.getPointerPosition();
      if (!pos || !stage) return;

      const delta = -e.evt.deltaY * ZOOM_SENSITIVITY;
      const newScale = Math.min(
        MAX_SCALE,
        Math.max(MIN_SCALE, scale * (1 + delta))
      );

      const worldX = (pos.x - stageX) / scale;
      const worldY = (pos.y - stageY) / scale;

      setStageX(pos.x - worldX * newScale);
      setStageY(pos.y - worldY * newScale);
      setScale(newScale);
    },
    [scale, stageX, stageY]
  );

  const handlePanStart = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (e: any) => {
      isPanningRef.current = true;
      const stage = e.target.getStage();
      const pos = stage?.getPointerPosition();
      if (pos) {
        lastPointerRef.current = { x: pos.x, y: pos.y };
      }
    },
    []
  );

  const handlePanMove = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (e: any) => {
      if (!isPanningRef.current) return;
      const stage = e.target.getStage();
      const pos = stage?.getPointerPosition();
      if (!pos || !lastPointerRef.current) return;

      const dx = pos.x - lastPointerRef.current.x;
      const dy = pos.y - lastPointerRef.current.y;
      lastPointerRef.current = { x: pos.x, y: pos.y };

      setStageX((prev) => prev + dx);
      setStageY((prev) => prev + dy);
    },
    []
  );

  const handlePanEnd = useCallback(() => {
    isPanningRef.current = false;
    lastPointerRef.current = null;
  }, []);

  const resetView = useCallback(() => {
    setScale(1);
    setStageX(0);
    setStageY(0);
  }, []);

  return {
    scale,
    stageX,
    stageY,
    screenToBoard,
    handleWheel,
    handlePanStart,
    handlePanMove,
    handlePanEnd,
    resetView,
  };
}
