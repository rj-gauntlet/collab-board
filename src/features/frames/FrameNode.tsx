"use client";

import React, { useRef, useEffect, useCallback, useState } from "react";
import { Group, Rect, Text, Line, Transformer } from "react-konva";
import Konva from "konva";
import type { FrameElement } from "./types";
import { FRAME_TITLE_BAR_HEIGHT } from "./types";

const PADDING = 8;

export type RequestEditTitleFn = (
  frameId: string,
  initialTitle: string
) => void;

interface FrameNodeProps {
  frame: FrameElement;
  isSelected: boolean;
  isMultiSelectMode?: boolean;
  onSelect: (shiftKey: boolean) => void;
  onRegisterSelectRef?: (id: string, node: Konva.Node | null) => void;
  onUpdate: (updates: Partial<FrameElement>) => void;
  onRequestEditTitle?: RequestEditTitleFn;
  onContextMenu?: (evt: MouseEvent) => void;
  onDragStart: () => void;
  onDragMove?: (x: number, y: number) => void;
  onDragEnd: () => void;
}

export function FrameNode({
  frame,
  isSelected,
  isMultiSelectMode = false,
  onSelect,
  onRegisterSelectRef,
  onUpdate,
  onRequestEditTitle,
  onContextMenu,
  onDragStart,
  onDragMove,
  onDragEnd,
}: FrameNodeProps) {
  const groupRef = useRef<Konva.Group>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (isSelected && !isMultiSelectMode && trRef.current && groupRef.current) {
      trRef.current.nodes([groupRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected, isMultiSelectMode]);

  useEffect(() => {
    if (isSelected && isMultiSelectMode && onRegisterSelectRef) {
      const node = groupRef.current;
      onRegisterSelectRef(frame.id, node);
      return () => onRegisterSelectRef(frame.id, null);
    }
  }, [isSelected, isMultiSelectMode, frame.id, onRegisterSelectRef]);

  useEffect(() => {
    const node = groupRef.current;
    if (node) node.setAttr("data-elementId", frame.id);
  }, [frame.id]);

  const handleDragMove = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      const node = e.target;
      onDragMove?.(node.x(), node.y());
    },
    [onDragMove]
  );

  const handleDragEnd = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      const node = e.target;
      onUpdate({ x: node.x(), y: node.y(), updatedAt: Date.now() });
      onDragEnd();
    },
    [onUpdate, onDragEnd]
  );

  const handleTransformEnd = useCallback(() => {
    const node = groupRef.current;
    if (!node) return;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    node.scaleX(1);
    node.scaleY(1);
    onUpdate({
      x: node.x(),
      y: node.y(),
      width: Math.max(80, node.width() * scaleX),
      height: Math.max(60, node.height() * scaleY),
      updatedAt: Date.now(),
    });
    onDragEnd();
  }, [onUpdate, onDragEnd]);

  const handleContextMenu = useCallback(
    (e: Konva.KonvaEventObject<PointerEvent>) => {
      e.evt.preventDefault();
      onContextMenu?.(e.evt);
    },
    [onContextMenu]
  );

  const handleTitleDblClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      e.cancelBubble = true;
      onRequestEditTitle?.(frame.id, frame.title ?? "");
    },
    [frame.id, frame.title, onRequestEditTitle]
  );

  return (
    <>
      <Group
        ref={groupRef}
        name="frame"
        x={frame.x}
        y={frame.y}
        width={frame.width}
        height={frame.height}
        draggable
        onClick={(e) => onSelect(e.evt.shiftKey)}
        onTap={(e) => onSelect(e.evt.shiftKey)}
        onContextMenu={handleContextMenu}
        onDragStart={onDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        onTransformEnd={handleTransformEnd}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        dragBoundFunc={(pos) => ({
          x: Math.max(0, pos.x),
          y: Math.max(0, pos.y),
        })}
      >
        {/* Frame body — stronger shadow so frames read as containers; hover = subtle lift; selected = elevation */}
        <Rect
          width={frame.width}
          height={frame.height}
          fill={frame.fill}
          stroke={isSelected ? "#ff8f00" : isHovered ? "rgba(93, 64, 55, 0.28)" : frame.stroke}
          strokeWidth={isSelected ? 2 : isHovered ? 2 : Math.max(1, frame.strokeWidth)}
          cornerRadius={8}
          shadowColor="rgba(62, 39, 35, 0.2)"
          shadowBlur={isSelected ? 16 : isHovered ? 18 : 12}
          shadowOffsetX={0}
          shadowOffsetY={isSelected ? 5 : isHovered ? 4 : 3}
        />
        {/* Title bar background — stronger so header reads distinct from body */}
        <Rect
          x={0}
          y={0}
          width={frame.width}
          height={FRAME_TITLE_BAR_HEIGHT}
          fill="rgba(93, 64, 55, 0.18)"
          cornerRadius={[8, 8, 0, 0]}
          listening={false}
        />
        {/* Title / body separator — strong boundary */}
        <Line
          points={[0, FRAME_TITLE_BAR_HEIGHT, frame.width, FRAME_TITLE_BAR_HEIGHT]}
          stroke={isSelected ? "#ff8f00" : "rgba(93, 64, 55, 0.45)"}
          strokeWidth={2}
          listening={false}
        />
        {/* Title text group — double-click to edit; strong typography for hierarchy */}
        <Group
          x={PADDING}
          y={PADDING / 2}
          listening={true}
          onDblClick={handleTitleDblClick}
          onClick={(e) => onSelect(e.evt.shiftKey)}
          onTap={(e) => onSelect(e.evt.shiftKey)}
        >
          <Rect
            width={frame.width - PADDING * 2}
            height={FRAME_TITLE_BAR_HEIGHT - PADDING}
            listening={true}
            opacity={0}
          />
          <Text
            x={0}
            y={0}
            width={frame.width - PADDING * 2}
            height={FRAME_TITLE_BAR_HEIGHT - PADDING}
            text={frame.title || "Double-click to add title"}
            fontSize={14}
            fontStyle="600"
            fontFamily="sans-serif"
            fill={frame.title ? "#3e2723" : "#9ca3af"}
            wrap="none"
            ellipsis={true}
            verticalAlign="middle"
            listening={false}
          />
        </Group>
      </Group>
      {isSelected && !isMultiSelectMode && (
        <Transformer
          ref={trRef}
          name="transformer"
          flipEnabled={false}
          boundBoxFunc={(oldBox, newBox) => {
            if (Math.abs(newBox.width) < 80 || Math.abs(newBox.height) < 60) {
              return oldBox;
            }
            return newBox;
          }}
        />
      )}
    </>
  );
}

