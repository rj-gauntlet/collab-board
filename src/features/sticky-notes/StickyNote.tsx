"use client";

import React, { useRef, useState, useCallback } from "react";
import { Group, Rect, Text } from "react-konva";
import Konva from "konva";
import type { StickyNoteElement } from "./types";

const PADDING = 8;
const FONT_SIZE = 14;

interface StickyNoteProps {
  note: StickyNoteElement;
  isEditing: boolean;
  onEditStart: () => void;
  onEditEnd: (text: string) => void;
  onDragStart: () => void;
  onDragMove?: (x: number, y: number) => void;
  onDragEnd: (x: number, y: number) => void;
  onContextMenu?: (evt: MouseEvent) => void;
}

export function StickyNote({
  note,
  isEditing,
  onEditStart,
  onEditEnd,
  onDragStart,
  onDragMove,
  onDragEnd,
  onContextMenu,
}: StickyNoteProps) {
  const groupRef = useRef<Konva.Group>(null);
  const textRef = useRef<Konva.Text>(null);
  const [editValue, setEditValue] = useState(note.text);

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
          stroke="#d4d4d8"
          strokeWidth={1}
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
          fill="#1f2937"
          padding={4}
          wrap="word"
          ellipsis
          listening={true}
        />
      </Group>
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
