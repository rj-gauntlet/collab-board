"use client";

import type Konva from "konva";

const EXPORT_PADDING = 24;
const PIXEL_RATIO = 2;

/**
 * Collect nodes that should be hidden during export (transformers, selection UI).
 * Returns a list of nodes that were visible and are now hidden.
 */
function hideExportExcludedNodes(stage: Konva.Stage): Konva.Node[] {
  const hidden: Konva.Node[] = [];
  stage.find("Transformer").forEach((node) => {
    if (node.visible()) {
      node.visible(false);
      hidden.push(node);
    }
  });
  stage.find(".export-hide").forEach((node) => {
    if (node.visible()) {
      node.visible(false);
      hidden.push(node);
    }
  });
  return hidden;
}

export interface ExportBoardOptions {
  /** Filename for the downloaded image (e.g. "My Board.png"). */
  filename?: string;
  /**
   * When set, export the full content in this bounding box (board space)
   * instead of the current viewport. The stage and layer transforms are
   * temporarily adjusted so the image contains all content in the box.
   */
  contentBbox?: { x: number; y: number; width: number; height: number } | null;
}

/**
 * Export the Konva stage as a PNG download.
 * Hides transformers and selection/UI layers so the image shows only board content.
 * When contentBbox is provided, exports the full canvas content (all elements);
 * otherwise exports only the current viewport.
 */
export function exportBoardAsPng(
  stage: Konva.Stage,
  filenameOrOptions: string | ExportBoardOptions = "board.png"
) {
  const options: ExportBoardOptions =
    typeof filenameOrOptions === "string"
      ? { filename: filenameOrOptions }
      : filenameOrOptions;
  const filename = options.filename ?? "board.png";
  const bbox = options.contentBbox;

  const hidden = hideExportExcludedNodes(stage);

  let savedStageSize: { width: number; height: number } | null = null;
  const savedLayerTransforms: Array<{ x: number; y: number; scaleX: number; scaleY: number }> = [];

  if (bbox && bbox.width > 0 && bbox.height > 0) {
    const pad = EXPORT_PADDING;
    const exportW = bbox.width + pad * 2;
    const exportH = bbox.height + pad * 2;
    const exportX = bbox.x - pad;
    const exportY = bbox.y - pad;

    savedStageSize = { width: stage.width(), height: stage.height() };
    stage.width(exportW);
    stage.height(exportH);

    stage.children?.forEach((child) => {
      savedLayerTransforms.push({
        x: child.x(),
        y: child.y(),
        scaleX: child.scaleX(),
        scaleY: child.scaleY(),
      });
      child.x(-exportX);
      child.y(-exportY);
      child.scaleX(1);
      child.scaleY(1);
    });
  }

  stage.batchDraw();
  const dataUrl = stage.toDataURL({ pixelRatio: PIXEL_RATIO });

  if (savedStageSize) {
    stage.width(savedStageSize.width);
    stage.height(savedStageSize.height);
    stage.children?.forEach((child, i) => {
      const t = savedLayerTransforms[i];
      if (t) {
        child.x(t.x);
        child.y(t.y);
        child.scaleX(t.scaleX);
        child.scaleY(t.scaleY);
      }
    });
  }

  hidden.forEach((node) => node.visible(true));
  stage.batchDraw();

  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  link.click();
}

/**
 * Sanitize a board name for use as a file name (no path or invalid characters).
 */
export function sanitizeBoardFilename(name: string | null | undefined): string {
  if (name == null || String(name).trim() === "") return "board";
  return String(name)
    .replace(/[/\\:*?"<>|]/g, "_")
    .trim()
    .slice(0, 200) || "board";
}
