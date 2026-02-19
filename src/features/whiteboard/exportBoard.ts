"use client";

import type Konva from "konva";

/**
 * Export the Konva stage as a PNG download.
 * pixelRatio: 2 gives retina-quality output.
 */
export function exportBoardAsPng(stage: Konva.Stage, filename = "board.png") {
  const dataUrl = stage.toDataURL({ pixelRatio: 2 });
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  link.click();
}
