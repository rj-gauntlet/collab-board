"use client";

import React from "react";
import { Layer, Circle, Text } from "react-konva";
import { useRemoteCursors } from "./useRemoteCursors";

interface RemoteCursorsProps {
  boardId: string;
  excludeUserId?: string;
  x?: number;
  y?: number;
  scaleX?: number;
  scaleY?: number;
}

export function RemoteCursors({
  boardId,
  excludeUserId,
  x = 0,
  y = 0,
  scaleX = 1,
  scaleY = 1,
}: RemoteCursorsProps) {
  const cursors = useRemoteCursors(boardId, excludeUserId);

  return (
    <Layer listening={false} x={x} y={y} scaleX={scaleX} scaleY={scaleY}>
      {cursors.map((cursor) => (
          <React.Fragment key={cursor.userId}>
            <Circle
              x={cursor.x}
              y={cursor.y}
              radius={6}
              fill={cursor.color ?? "#3b82f6"}
              stroke="#fff"
              strokeWidth={2}
              shadowColor="rgba(0,0,0,0.3)"
              shadowBlur={4}
              shadowOffsetY={1}
            />
            <Text
              x={cursor.x + 10}
              y={cursor.y - 8}
              text={cursor.displayName ?? cursor.userId.slice(0, 8)}
              fontSize={12}
              fill={cursor.color ?? "#3b82f6"}
              fontFamily="sans-serif"
            />
          </React.Fragment>
        ))}
    </Layer>
  );
}
