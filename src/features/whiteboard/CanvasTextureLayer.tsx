"use client";

import React, { useMemo } from "react";
import { Layer, Circle } from "react-konva";

/** Spacing for the subtle always-on texture (larger than snap grid so it reads as surface, not grid). */
const TEXTURE_SPACING = 48;
const DOT_FILL = "rgba(93, 64, 55, 0.08)";
const DOT_RADIUS = 1;

/** Vertical step for flat-top hex grid: spacing * sqrt(3)/2 */
const HEX_ROW_HEIGHT = Math.sqrt(3) / 2;

interface CanvasTextureLayerProps {
  width: number;
  height: number;
  stageX: number;
  stageY: number;
  scale: number;
}

/**
 * Very subtle hexagonal (honeycomb) dot grid always visible on the canvas.
 * Renders behind the optional main grid.
 */
export function CanvasTextureLayer({
  width,
  height,
  stageX,
  stageY,
  scale,
}: CanvasTextureLayerProps) {
  const dots = useMemo(() => {
    const stepX = TEXTURE_SPACING * scale;
    const stepY = stepX * HEX_ROW_HEIGHT;
    const offsetX = ((stageX % stepX) + stepX) % stepX;
    const offsetY = ((stageY % stepY) + stepY) % stepY;
    const cols = Math.ceil(width / stepX) + 2;
    const rows = Math.ceil(height / stepY) + 2;
    const result: React.ReactElement[] = [];
    const r = Math.max(0.5, DOT_RADIUS * scale);
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const x = offsetX + i * stepX + (j % 2) * (stepX / 2);
        const y = offsetY + j * stepY;
        result.push(
          <Circle
            key={`${i}-${j}`}
            x={x}
            y={y}
            radius={r}
            fill={DOT_FILL}
            listening={false}
          />
        );
      }
    }
    return result;
  }, [width, height, stageX, stageY, scale]);

  return <Layer listening={false}>{dots}</Layer>;
}
