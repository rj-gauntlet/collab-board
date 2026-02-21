"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import { Group, Rect, Text, Transformer } from "react-konva";
import Konva from "konva";
import type { StickyNoteElement } from "./types";

const PADDING = 8;
const FONT_SIZE = 14;
const MIN_WIDTH = 80;
const MIN_HEIGHT = 60;

interface StickyNoteProps {
  note: StickyNoteElement;
  isEditing: boolean;
  isSelected?: boolean;
  /** When true, this note is the connector "from" endpoint (show connecting-from highlight). */
  isConnectorFrom?: boolean;
  isMultiSelectMode?: boolean;
  onSelect?: (shiftKey: boolean) => void;
  onEditStart: () => void;
  onEditEnd: (text: string) => void;
  onDragStart: () => void;
  onDragMove?: (x: number, y: number) => void;
  onDragEnd: (x: number, y: number) => void;
  onResizeEnd?: (updates: { x: number; y: number; width: number; height: number }) => void;
  onRegisterSelectRef?: (id: string, node: Konva.Node | null) => void;
  onContextMenu?: (evt: MouseEvent) => void;
}

export function StickyNote({
  note,
  isEditing,
  isSelected = false,
  isConnectorFrom = false,
  isMultiSelectMode = false,
  onSelect,
  onEditStart,
  onEditEnd,
  onDragStart,
  onDragMove,
  onDragEnd,
  onResizeEnd,
  onRegisterSelectRef,
  onContextMenu,
}: StickyNoteProps) {
  const groupRef = useRef<Konva.Group>(null);
  const textRef = useRef<Konva.Text>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const [editValue, setEditValue] = useState(note.text);

  useEffect(() => {
    if (isSelected && !isMultiSelectMode && trRef.current && groupRef.current) {
      trRef.current.nodes([groupRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected, isMultiSelectMode]);

  useEffect(() => {
    if (isSelected && isMultiSelectMode && onRegisterSelectRef) {
      const node = groupRef.current;
      onRegisterSelectRef(note.id, node);
      return () => onRegisterSelectRef(note.id, null);
    }
  }, [isSelected, isMultiSelectMode, note.id, onRegisterSelectRef]);

  const handleTransformEnd = useCallback(() => {
    const node = groupRef.current;
    if (!node || !onResizeEnd) return;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    node.scaleX(1);
    node.scaleY(1);
    onResizeEnd({
      x: node.x(),
      y: node.y(),
      width: Math.max(MIN_WIDTH, node.width() * scaleX),
      height: Math.max(MIN_HEIGHT, node.height() * scaleY),
    });
  }, [onResizeEnd]);

  const handleDblClick = useCallback(() => {
    setEditValue(note.text);
    onEditStart();
  }, [note.text, onEditStart]);

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

  useEffect(() => {
    const node = groupRef.current;
    if (node) node.setAttr("data-elementId", note.id);
  }, [note.id]);

  return (
    <>
      <Group
        ref={groupRef}
        name="sticky-note"
        x={note.x}
        y={note.y}
        width={note.width}
        height={note.height}
        draggable={!isEditing}
        onClick={onSelect ? (e) => onSelect(e.evt.shiftKey) : undefined}
        onTap={onSelect ? (e) => onSelect(e.evt.shiftKey) : undefined}
        onDragStart={onDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        onDblClick={handleDblClick}
        onContextMenu={handleContextMenu}
        dragBoundFunc={(pos) => ({
          x: Math.max(0, pos.x),
          y: Math.max(0, pos.y),
        })}
      >
        <Rect
          width={note.width}
          height={note.height}
          fill={note.color}
          stroke={isConnectorFrom ? "#ff8f00" : isSelected ? "#ff8f00" : "#d4d4d8"}
          strokeWidth={isConnectorFrom ? 3 : isSelected ? 2 : 1}
          dash={isConnectorFrom ? [6, 4] : undefined}
          shadowColor="rgba(0,0,0,0.2)"
          shadowBlur={4}
          shadowOffsetY={2}
          cornerRadius={4}
        />
        <Text
          ref={textRef}
          x={PADDING}
          y={PADDING}
          width={note.width - PADDING * 2}
          height={note.height - PADDING * 2}
          text={note.text || "Double-click to edit"}
          fontSize={FONT_SIZE}
          fontFamily="sans-serif"
          fill={note.text ? "#1f2937" : "#9ca3af"}
          padding={4}
          wrap="word"
          ellipsis
          listening={true}
        />
      </Group>
      {isSelected && !isMultiSelectMode && (
        <Transformer
          ref={trRef}
          name="transformer"
          flipEnabled={false}
          rotateEnabled={false}
          boundBoxFunc={(oldBox, newBox) => {
            if (Math.abs(newBox.width) < MIN_WIDTH || Math.abs(newBox.height) < MIN_HEIGHT) {
              return oldBox;
            }
            return newBox;
          }}
          onTransformEnd={handleTransformEnd}
        />
      )}
      {isEditing && (
        <StickyNoteEditor
          note={note}
          value={editValue}
          onChange={setEditValue}
          onCommit={(text) => onEditEnd(text)}
          onCancel={() => onEditEnd(note.text)}
          groupRef={groupRef}
          textRef={textRef}
        />
      )}
    </>
  );
}

interface StickyNoteEditorProps {
  note: StickyNoteElement;
  value: string;
  onChange: (v: string) => void;
  onCommit: (text: string) => void;
  onCancel: () => void;
  groupRef: React.RefObject<Konva.Group | null>;
  textRef: React.RefObject<Konva.Text | null>;
}

function StickyNoteEditor({
  note,
  value,
  onChange,
  onCommit,
  onCancel,
  groupRef,
}: StickyNoteEditorProps) {
  React.useEffect(() => {
    const group = groupRef.current;
    const stage = group?.getStage();

    if (!group || !stage) return;

    const input = document.createElement("textarea");
    input.value = value;
    input.style.position = "absolute";
    input.style.left = "0";
    input.style.top = "0";
    input.style.fontSize = `${FONT_SIZE}px`;
    input.style.fontFamily = "sans-serif";
    input.style.padding = "4px";
    input.style.border = "1px solid #3b82f6";
    input.style.borderRadius = "4px";
    input.style.outline = "none";
    input.style.resize = "none";
    input.style.zIndex = "10";
    input.style.background = note.color;

    const updatePosition = () => {
      const absPos = group.absolutePosition();
      const scale = stage.scaleX();
      input.style.left = `${absPos.x * scale + PADDING}px`;
      input.style.top = `${absPos.y * scale + PADDING}px`;
      input.style.width = `${(note.width - PADDING * 2) * scale}px`;
      input.style.height = `${(note.height - PADDING * 2) * scale}px`;
      input.style.fontSize = `${FONT_SIZE * scale}px`;
    };

    updatePosition();
    const container = stage.container();
    const prevPosition = container.style.position;
    container.style.position = "relative";
    container.appendChild(input);
    input.focus();
    input.select();

    const handleBlur = () => {
      onCommit(input.value);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        onCommit(input.value);
      }
      if (e.key === "Escape") {
        onCancel();
      }
    };

    input.addEventListener("blur", handleBlur);
    input.addEventListener("keydown", handleKeyDown);

    return () => {
      input.removeEventListener("blur", handleBlur);
      input.removeEventListener("keydown", handleKeyDown);
      if (input.parentNode) {
        input.parentNode.removeChild(input);
      }
      container.style.position = prevPosition;
    };
  }, [groupRef, note, value, onCommit, onCancel]);

  return null;
}
