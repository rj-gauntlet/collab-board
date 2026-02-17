"use client";

import { useCallback } from "react";
import Konva from "konva";
import { Stage, Layer } from "react-konva";
import { useSyncCursor } from "./useSyncCursor";
import { RemoteCursors } from "./RemoteCursors";
import { CursorErrorBoundary } from "./CursorErrorBoundary";

interface BoardStageProps {
  boardId: string;
  userId: string;
  width: number;
  height: number;
}

export function BoardStage({ boardId, userId, width, height }: BoardStageProps) {
  const { syncCursor } = useSyncCursor(boardId, userId);

  const handleMouseMove = useCallback(
    (evt: Konva.KonvaEventObject<MouseEvent>) => {
      const stage = evt.target.getStage();
      const pos = stage?.getPointerPosition();
      if (pos) {
        syncCursor(pos.x, pos.y);
      }
    },
    [syncCursor]
  );

  return (
    <CursorErrorBoundary>
      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <Stage
          width={width}
          height={height}
          onMouseMove={handleMouseMove}
          style={{ cursor: "crosshair" }}
        >
          <Layer />
          <RemoteCursors boardId={boardId} excludeUserId={userId} />
        </Stage>
      </div>
    </CursorErrorBoundary>
  );
}
