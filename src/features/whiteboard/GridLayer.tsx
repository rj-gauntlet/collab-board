"use client";

import React, { useMemo } from "react";
import { Layer, Line } from "react-konva";
import { GRID_SIZE } from "./snapGrid";

interface GridLayerProps {
  width: number;
  height: number;
  stageX: number;
  stageY: number;
  scale: number;
}

export function GridLayer({ width, height, stageX, stageY, scale }: GridLayerProps) {
  const lines = useMemo(() => {
    const scaledGrid = GRID_SIZE * scale;
    // offset so grid stays fixed in world space as canvas pans
    const offsetX = ((stageX % scaledGrid) + scaledGrid) % scaledGrid;
    const offsetY = ((stageY % scaledGrid) + scaledGrid) % scaledGrid;

    const cols = Math.ceil(width / scaledGrid) + 1;
    const rows = Math.ceil(height / scaledGrid) + 1;

    const result: React.ReactElement[] = [];

    for (let i = 0; i < cols; i++) {
      const x = offsetX + i * scaledGrid;
      result.push(
        <Line
          key={`v${i}`}
          points={[x, 0, x, height]}
          stroke="#e5c9a0"
          strokeWidth={0.5}
          listening={false}
        />
      );
    }
    for (let i = 0; i < rows; i++) {
      const y = offsetY + i * scaledGrid;
      result.push(
        <Line
          key={`h${i}`}
          points={[0, y, width, y]}
          stroke="#e5c9a0"
          strokeWidth={0.5}
          listening={false}
        />
      );
    }
    return result;
  }, [width, height, stageX, stageY, scale]);

  return (
    <Layer listening={false}>
      {lines}
    </Layer>
  );
}
