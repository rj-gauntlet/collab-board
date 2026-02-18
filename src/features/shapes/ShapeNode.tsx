"use client";

import React, { useRef, useEffect, useCallback } from "react";
import { Group, Rect, Circle, RegularPolygon, Transformer } from "react-konva";
import Konva from "konva";
import type { ShapeElement } from "./types";

type ShapeUpdate = Partial<
  Pick<ShapeElement, "x" | "y" | "width" | "height" | "rotation" | "fill" | "stroke">
>;

interface ShapeNodeProps {
  shape: ShapeElement;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (updates: ShapeUpdate) => void;
  onContextMenu?: (evt: MouseEvent) => void;
  onDragStart: () => void;
  onDragMove?: (x: number, y: number) => void;
  onDragEnd: () => void;
  remoteX?: number;
  remoteY?: number;
}

export function ShapeNode({
  shape,
  isSelected,
  onSelect,
  onChange,
  onContextMenu,
  onDragStart,
  onDragMove,
  onDragEnd,
  remoteX,
  remoteY,
}: ShapeNodeProps) {
  const groupRef = useRef<Konva.Group>(null);
  const trRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    if (isSelected && trRef.current && groupRef.current) {
      trRef.current.nodes([groupRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  const displayX = remoteX ?? shape.x;
  const displayY = remoteY ?? shape.y;
  const rotation = shape.rotation ?? 0;

  const handleDragEnd = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      const node = e.target;
      onChange({ x: node.x(), y: node.y() });
      onDragEnd();
    },
    [onChange, onDragEnd]
  );

  const handleTransformEnd = useCallback(() => {
    const node = groupRef.current;
    if (!node) return;

    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    node.scaleX(1);
    node.scaleY(1);

    onChange({
      x: node.x(),
      y: node.y(),
      width: Math.max(20, node.width() * scaleX),
      height: Math.max(20, node.height() * scaleY),
      rotation: node.rotation(),
    });
    onDragEnd();
  }, [onChange, onDragEnd]);

  const handleDragMove = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      const node = e.target;
      onDragMove?.(node.x(), node.y());
    },
    [onDragMove]
  );

  const handleContextMenu = useCallback(
    (e: Konva.KonvaEventObject<PointerEvent>) => {
      e.evt.preventDefault();
      onContextMenu?.(e.evt);
    },
    [onContextMenu]
  );

  const commonProps = {
    fill: shape.fill,
    stroke: shape.stroke,
    strokeWidth: shape.strokeWidth,
  };

  const renderShapeContent = () => {
    const w = shape.width;
    const h = shape.height;
    if (shape.kind === "rect") {
      return (
        <Rect width={w} height={h} {...commonProps} />
      );
    }
    if (shape.kind === "triangle") {
      const r = Math.min(w, h) / 2;
      return (
        <RegularPolygon
          x={w / 2}
          y={h / 2}
          sides={3}
          radius={r}
          {...commonProps}
        />
      );
    }
    const r = Math.min(w, h) / 2;
    return <Circle x={w / 2} y={h / 2} radius={r} {...commonProps} />;
  };

  if (remoteX !== undefined || remoteY !== undefined) {
    return (
      <Group
        x={displayX}
        y={displayY}
        width={shape.width}
        height={shape.height}
        rotation={rotation}
        offsetX={0}
        offsetY={0}
        listening={false}
      >
        {shape.kind === "rect" ? (
          <Rect width={shape.width} height={shape.height} {...commonProps} />
        ) : shape.kind === "triangle" ? (
          <RegularPolygon
            x={shape.width / 2}
            y={shape.height / 2}
            sides={3}
            radius={Math.min(shape.width, shape.height) / 2}
            {...commonProps}
          />
        ) : (
          <Circle
            x={shape.width / 2}
            y={shape.height / 2}
            radius={Math.min(shape.width, shape.height) / 2}
            {...commonProps}
          />
        )}
      </Group>
    );
  }

  return (
    <>
      <Group
        ref={groupRef}
        name="shape"
        x={displayX}
        y={displayY}
        width={shape.width}
        height={shape.height}
        rotation={rotation}
        draggable
        onClick={onSelect}
        onTap={onSelect}
        onContextMenu={handleContextMenu}
        onDragStart={onDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        onTransformEnd={handleTransformEnd}
        dragBoundFunc={(pos) => ({
          x: Math.max(0, pos.x),
          y: Math.max(0, pos.y),
        })}
      >
        {renderShapeContent()}
      </Group>
      {isSelected && (
        <Transformer
          ref={trRef}
          name="transformer"
          flipEnabled={false}
          rotateEnabled={shape.kind !== "circle"}
          boundBoxFunc={(oldBox, newBox) => {
            if (Math.abs(newBox.width) < 20 || Math.abs(newBox.height) < 20) {
              return oldBox;
            }
            return newBox;
          }}
        />
      )}
    </>
  );
}
