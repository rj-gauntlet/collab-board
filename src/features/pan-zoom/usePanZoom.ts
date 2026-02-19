"use client";

import { useCallback, useState, useRef } from "react";

const MIN_SCALE = 0.25;
const MAX_SCALE = 4;
const ZOOM_SENSITIVITY = 0.002;
const ZOOM_STEP = 1.2;

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

  /**
   * Zoom and pan so that the given bounding box (in board space) is fully
   * visible and centered in the viewport with a comfortable margin.
   * Falls back to resetView when there are no elements.
   */
  const fitToContent = useCallback(
    (bbox: { x: number; y: number; width: number; height: number } | null) => {
      if (!bbox || bbox.width === 0 || bbox.height === 0) {
        resetView();
        return;
      }
      const PADDING = 64;
      const availW = viewportWidth - PADDING * 2;
      const availH = viewportHeight - PADDING * 2;
      const newScale = Math.min(
        MAX_SCALE,
        Math.max(MIN_SCALE, Math.min(availW / bbox.width, availH / bbox.height))
      );
      setScale(newScale);
      setStageX((viewportWidth - bbox.width * newScale) / 2 - bbox.x * newScale);
      setStageY((viewportHeight - bbox.height * newScale) / 2 - bbox.y * newScale);
    },
    [viewportWidth, viewportHeight, resetView]
  );

  const zoomTo = useCallback(
    (newScale: number) => {
      const clamped = Math.min(MAX_SCALE, Math.max(MIN_SCALE, newScale));
      const cx = viewportWidth / 2;
      const cy = viewportHeight / 2;
      const worldX = (cx - stageX) / scale;
      const worldY = (cy - stageY) / scale;
      setStageX(cx - worldX * clamped);
      setStageY(cy - worldY * clamped);
      setScale(clamped);
    },
    [scale, stageX, stageY, viewportWidth, viewportHeight]
  );

  const zoomIn = useCallback(() => zoomTo(scale * ZOOM_STEP), [scale, zoomTo]);
  const zoomOut = useCallback(() => zoomTo(scale / ZOOM_STEP), [scale, zoomTo]);

  // Pinch-to-zoom: call with two touch points each frame
  const lastPinchDistRef = useRef<number | null>(null);
  const handlePinch = useCallback(
    (t1: { x: number; y: number }, t2: { x: number; y: number }) => {
      const dist = Math.hypot(t2.x - t1.x, t2.y - t1.y);
      if (lastPinchDistRef.current !== null) {
        const ratio = dist / lastPinchDistRef.current;
        const cx = (t1.x + t2.x) / 2;
        const cy = (t1.y + t2.y) / 2;
        setScale((prev) => {
          const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev * ratio));
          const worldX = (cx - stageX) / prev;
          const worldY = (cy - stageY) / prev;
          setStageX(cx - worldX * next);
          setStageY(cy - worldY * next);
          return next;
        });
      }
      lastPinchDistRef.current = dist;
    },
    [stageX, stageY]
  );

  const handlePinchEnd = useCallback(() => {
    lastPinchDistRef.current = null;
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
    fitToContent,
    zoomIn,
    zoomOut,
    zoomTo,
    handlePinch,
    handlePinchEnd,
  };
}
