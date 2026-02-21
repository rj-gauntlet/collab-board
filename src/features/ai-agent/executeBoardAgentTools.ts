/**
 * Executes board-agent tool invocations from the API against the canvas handle.
 * Called on the client when the assistant message contains tool calls.
 * Command breadth: Create, Delete, Move, Update, Clear board, Arrange/Resize/Distribute, Connect, Templates (flowchart, journey map, SWOT).
 * Tools with no parameters (e.g. clear_board) are included via parseArgs(inv.args) returning {} when args is missing.
 */
import type { WhiteboardCanvasHandle } from "@/features/whiteboard";

export interface ToolInvocationCall {
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
}

export function executeBoardAgentTools(
  handle: WhiteboardCanvasHandle | null,
  invocations: ToolInvocationCall[]
): void {
  if (!handle) return;

  for (const inv of invocations) {
    try {
      switch (inv.toolName) {
        case "create_sticky_note": {
          const items = inv.args.items as Array<{
            text: string;
            color?: string;
            x?: number;
            y?: number;
            width?: number;
            height?: number;
          }>;
          if (Array.isArray(items)) {
            handle.createNotesFromAI(items);
          }
          break;
        }
        case "create_sticky_notes_grid": {
          const rows = inv.args.rows as number;
          const columns = inv.args.columns as number;
          if (typeof rows === "number" && typeof columns === "number" && rows >= 1 && columns >= 1) {
            const labels = inv.args.labels as string[] | undefined;
            handle.createStickyNotesGridFromAI(rows, columns, {
              labels: Array.isArray(labels) ? labels : undefined,
              startX: inv.args.startX as number | undefined,
              startY: inv.args.startY as number | undefined,
              spacing: inv.args.spacing as number | undefined,
            });
          }
          break;
        }
        case "create_shape": {
          const shapeType = inv.args.shapeType as "rect" | "circle" | "triangle";
          if (shapeType) {
            handle.createShapesFromAI([
              {
                shapeType,
                fill: inv.args.fill as string | undefined,
                x: inv.args.x as number | undefined,
                y: inv.args.y as number | undefined,
                width: inv.args.width as number | undefined,
                height: inv.args.height as number | undefined,
              },
            ]);
          }
          break;
        }
        case "create_shapes": {
          const items = inv.args.items as Array<{
            shapeType: "rect" | "circle" | "triangle";
            fill?: string;
            x?: number;
            y?: number;
            width?: number;
            height?: number;
          }>;
          if (Array.isArray(items) && items.length > 0) {
            handle.createShapesFromAI(items);
          }
          break;
        }
        case "create_frame": {
          const title = inv.args.title as string;
          if (title != null) {
            handle.createFramesFromAI([
              {
                title,
                x: inv.args.x as number | undefined,
                y: inv.args.y as number | undefined,
                width: inv.args.width as number | undefined,
                height: inv.args.height as number | undefined,
              },
            ]);
          }
          break;
        }
        case "create_frames": {
          const items = inv.args.items as Array<{
            title: string;
            x?: number;
            y?: number;
            width?: number;
            height?: number;
          }>;
          if (Array.isArray(items) && items.length > 0) {
            handle.createFramesFromAI(items);
          }
          break;
        }
        case "create_flowchart": {
          const labels = inv.args.labels as string[] | undefined;
          handle.createFlowchart(Array.isArray(labels) && labels.length >= 2 ? labels : undefined);
          break;
        }
        case "create_user_journey_map": {
          const stages = inv.args.stages as string[] | undefined;
          const lanes = inv.args.lanes as string[] | undefined;
          handle.createUserJourneyMap(
            Array.isArray(stages) && stages.length >= 2 ? stages : undefined,
            Array.isArray(lanes) && lanes.length >= 1 ? lanes : undefined
          );
          break;
        }
        case "create_swot_analysis": {
          const notesPerQuadrant = inv.args.notesPerQuadrant as number | undefined;
          const n =
            typeof notesPerQuadrant === "number" && notesPerQuadrant >= 1 && notesPerQuadrant <= 5
              ? notesPerQuadrant
              : 3;
          handle.createSwotAnalysis(n);
          break;
        }
        case "create_connector": {
          const fromId = inv.args.fromId as string;
          const toId = inv.args.toId as string;
          if (fromId != null && toId != null) {
            handle.createConnectorsFromAI([
              {
                fromId,
                toId,
                label: inv.args.label as string | undefined,
                style: inv.args.style as "line" | "arrow" | undefined,
                stroke: inv.args.stroke as string | undefined,
                strokeWidth: inv.args.strokeWidth as number | undefined,
                dashed: inv.args.dashed as boolean | undefined,
                curved: inv.args.curved as boolean | undefined,
                bidirectional: inv.args.bidirectional as boolean | undefined,
              },
            ]);
          }
          break;
        }
        case "move_elements": {
          const ids = inv.args.ids as string[];
          const dx = (inv.args.dx as number) ?? 0;
          const dy = (inv.args.dy as number) ?? 0;
          if (Array.isArray(ids) && ids.length > 0) {
            handle.moveElementsByAgent(ids, dx, dy);
          }
          break;
        }
        case "update_elements": {
          const updates = inv.args.updates as Array<{
            id: string;
            text?: string;
            title?: string;
            color?: string;
            fill?: string;
            x?: number;
            y?: number;
            width?: number;
            height?: number;
            stroke?: string;
            strokeWidth?: number;
            dashed?: boolean;
            curved?: boolean;
            bidirectional?: boolean;
            label?: string;
            style?: "line" | "arrow";
          }>;
          if (Array.isArray(updates) && updates.length > 0) {
            handle.updateElementsByAgent(updates);
          }
          break;
        }
        case "delete_elements": {
          const ids = inv.args.ids as string[];
          if (Array.isArray(ids) && ids.length > 0) {
            handle.deleteElementsByAgent(ids);
          }
          break;
        }
        case "clear_board": {
          void handle.clearCanvas();
          break;
        }
        case "arrange_grid": {
          const ids = inv.args.ids as string[];
          const columns = (inv.args.columns as number) ?? 2;
          const spacing = (inv.args.spacing as number) ?? 24;
          if (Array.isArray(ids) && ids.length > 0) {
            handle.arrangeGridByAgent(ids, columns, spacing);
          }
          break;
        }
        case "resize_frame_to_fit": {
          const frameId = inv.args.frameId as string;
          const padding = (inv.args.padding as number) ?? 16;
          if (frameId) {
            handle.resizeFrameToFitByAgent(frameId, padding);
          }
          break;
        }
        case "distribute_elements": {
          const ids = inv.args.ids as string[];
          const direction = inv.args.direction as "horizontal" | "vertical";
          const spacing = (inv.args.spacing as number) ?? 24;
          if (Array.isArray(ids) && ids.length > 0 && (direction === "horizontal" || direction === "vertical")) {
            handle.distributeElementsByAgent(ids, direction, spacing);
          }
          break;
        }
        default:
          console.warn("Unknown board-agent tool:", inv.toolName);
      }
    } catch (err) {
      console.error(`Board agent tool ${inv.toolName} failed:`, err);
    }
  }
}

function parseArgs(args: unknown): Record<string, unknown> {
  if (args == null) return {};
  if (typeof args === "object" && !Array.isArray(args) && args !== null) return args as Record<string, unknown>;
  if (typeof args === "string") {
    try {
      const parsed = JSON.parse(args) as Record<string, unknown>;
      return typeof parsed === "object" && parsed !== null ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

const EXECUTABLE_STATES = ["call", "partial-call", "result"];

/**
 * Extract tool invocations (with args) from an assistant message.
 * Handles both message.toolInvocations and message.parts.
 * Accepts state "call", "partial-call", and "result" (SDK often sets "result" after
 * server sends tool_result; we still need to run the tool on the client).
 */
export function getToolCallsFromMessage(message: {
  toolInvocations?: Array<{
    state: string;
    toolCallId?: string;
    toolName?: string;
    args?: unknown;
  }>;
  parts?: Array<{ type: string; toolInvocation?: { state: string; toolCallId?: string; toolName?: string; args?: unknown } }>;
}): ToolInvocationCall[] {
  const out: ToolInvocationCall[] = [];
  const list = message.toolInvocations ?? [];
  for (const inv of list) {
    const isExecutable = EXECUTABLE_STATES.includes(inv.state);
    if (isExecutable && inv.toolCallId && inv.toolName) {
      out.push({
        toolCallId: inv.toolCallId,
        toolName: inv.toolName,
        args: parseArgs(inv.args),
      });
    }
  }
  if (out.length > 0) return out;
  const parts = message.parts ?? [];
  for (const part of parts) {
    if (part.type === "tool-invocation" && part.toolInvocation) {
      const inv = part.toolInvocation;
      const isExecutable = EXECUTABLE_STATES.includes(inv.state);
      if (isExecutable && inv.toolCallId && inv.toolName) {
        out.push({
          toolCallId: inv.toolCallId,
          toolName: inv.toolName,
          args: parseArgs(inv.args),
        });
      }
    }
  }
  return out;
}
