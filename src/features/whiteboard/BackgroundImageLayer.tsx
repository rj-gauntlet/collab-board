"use client";

import React, { useEffect, useState } from "react";
import { Layer, Image } from "react-konva";
import type { BoardBackgroundImage } from "@/features/boards/useBoardBackgroundImage";

interface BackgroundImageLayerProps {
  background: BoardBackgroundImage | null;
}

/**
 * Renders the board's imported background image at (0, 0) behind all content.
 */
export function BackgroundImageLayer({ background }: BackgroundImageLayerProps) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!background?.url) {
      setImage(null);
      return;
    }
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setImage(img);
    img.onerror = () => setImage(null);
    img.src = background.url;
    return () => {
      img.onload = null;
      img.onerror = null;
      img.src = "";
    };
  }, [background?.url]);

  if (!background || !image) return null;

  return (
    <Layer listening={false}>
      <Image
        image={image}
        x={0}
        y={0}
        width={background.width}
        height={background.height}
        listening={false}
      />
    </Layer>
  );
}
