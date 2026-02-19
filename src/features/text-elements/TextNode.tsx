"use client";

import React, { useRef, useCallback, useEffect } from "react";
import { Group, Rect } from "react-konva";
import Konva from "konva";
import type { TextElement } from "./types";

// Callback to tell the canvas to open the editor for this text element
export type RequestEditTextFn = (id: string) => void;

interface TextNodeProps {
  textElement: TextElement;
  isSelected?: boolean;
  onSelect?: (shiftKey: boolean) => void;
  onUpdate: (updates: Partial<TextElement>) => void;
  onRequestEditText?: RequestEditTextFn;
  onContextMenu?: (evt: MouseEvent) => void;
  onDragStart: () => void;
  onDragMove?: (x: number, y: number) => void;
  onDragEnd: (x: number, y: number) => void;
}

export function TextNode({
  textElement,
  isSelected = false,
  onSelect,
  onRequestEditText,
  onContextMenu,
  onDragStart,
  onDragMove,
  onDragEnd,
}: TextNodeProps) {
  const groupRef = useRef<Konva.Group>(null);
  // Only auto-open editor once on first mount when text is empty (newly created)
  const autoOpenedRef = useRef(false);

  useEffect(() => {
    const node = groupRef.current;
    if (node) node.setAttr("data-elementId", textElement.id);
  }, [textElement.id]);

  const openEditor = useCallback(() => {
    onRequestEditText?.(textElement.id);
  }, [textElement.id, onRequestEditText]);

  useEffect(() => {
    if (!autoOpenedRef.current && textElement.text === "" && onRequestEditText) {
      autoOpenedRef.current = true;
      const id = requestAnimationFrame(() => openEditor());
      return () => cancelAnimationFrame(id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDblClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      e.cancelBubble = true;
      openEditor();
    },
    [openEditor]
  );

  const handlePointer = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      const shiftKey = "shiftKey" in e.evt ? e.evt.shiftKey : false;
      if (isSelected && !shiftKey) {
        e.cancelBubble = true;
        openEditor();
      } else {
        onSelect?.(shiftKey);
      }
    },
    [isSelected, onSelect, openEditor]
  );

  const handleDragMove = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      const node = e.target;
      onDragMove?.(node.x(), node.y());
    },
    [onDragMove]
  );

  const handleDragEndCallback = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      const node = e.target;
      onDragEnd(node.x(), node.y());
    },
    [onDragEnd]
  );

  const handleContextMenu = useCallback(
    (e: Konva.KonvaEventObject<PointerEvent>) => {
      e.evt.preventDefault();
      onContextMenu?.(e.evt);
    },
    [onContextMenu]
  );

  // Height estimate for the invisible hit rect
  const hitHeight = Math.max(40, textElement.fontSize * 2.5);

  return (
    <Group
      ref={groupRef}
      name="text-element"
      x={textElement.x}
      y={textElement.y}
      draggable
      onClick={onSelect ? handlePointer : undefined}
      onTap={onSelect ? handlePointer : undefined}
      onDblClick={handleDblClick}
      onContextMenu={handleContextMenu}
      onDragStart={onDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEndCallback}
      dragBoundFunc={(pos) => ({
        x: Math.max(0, pos.x),
        y: Math.max(0, pos.y),
      })}
    >
      {/* Invisible hit area — visual rendering is in the HTML overlay */}
      <Rect
        width={textElement.width}
        height={hitHeight}
        listening={true}
        opacity={0}
      />
    </Group>
  );
}
