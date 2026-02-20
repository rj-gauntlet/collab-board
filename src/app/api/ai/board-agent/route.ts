import { streamText, tool } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { jsonSchema } from "ai";
import type { BoardStateSummary } from "@/features/ai-agent/board-agent-types";

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

const BOARD_STATE_CONTEXT = `
You are an AI assistant that helps users modify a real-time collaborative whiteboard.
You receive a JSON snapshot of the current board state (elements with id, type, text/title, position, size, color).
All coordinates and sizes are in board space (not screen pixels). Use sensible values: e.g. x,y starting around 100-200, spacing 20-40px.
Default sticky note size: 160x120. Default frame: 320x200. Default shape: 120x80.
When creating multiple items (e.g. grid, template), place them so they don't overlap and use consistent spacing.
To create frames, always use create_frames (with an items array). One frame = one item; multiple columns = multiple items with different title and x (e.g. x: 100, 420, 740).
For multiple frames or columns (e.g. "three columns", "retrospective with What Went Well, What Didn't, Action Items", "six sections"), always use create_frames with an items array that has one entry per frame—e.g. 3 columns means 3 items, 6 frames means 6 items. Use different x positions so frames sit side by side (e.g. x: 100, 420, 740 for three).
When the user refers to "these" or "selected" elements without IDs, use the most recently mentioned or created elements, or ask for clarification.
Colors can be hex (e.g. #fef08a) or names (yellow, blue, pink, green, etc.).

IMPORTANT: You MUST use the provided tools to make changes. Do not only describe what you would do—call the appropriate tool (e.g. create_sticky_note, create_shape) so the board is actually updated. After calling the tool(s), you may briefly confirm what you did in one sentence.

Use resize_frame_to_fit when the user asks to resize a frame to fit its contents. Use distribute_elements with direction "horizontal" or "vertical" when the user asks to space elements evenly, distribute them in a row or column, or align with equal gaps.`;

function buildSystemPrompt(boardState: BoardStateSummary[]): string {
  const stateJson =
    boardState.length > 0
      ? JSON.stringify(boardState, null, 0)
      : "[] (empty board)";
  return `${BOARD_STATE_CONTEXT}

Current board state (array of elements):
${stateJson}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, boardState = [], boardId } = body as {
      messages?: Array<{ role: string; content: string | unknown }>;
      boardState?: BoardStateSummary[];
      boardId?: string;
    };

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "messages array required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const system = buildSystemPrompt(boardState);

    const normalizeContent = (c: string | unknown): string => {
      if (typeof c === "string") return c;
      if (Array.isArray(c)) {
        const text = c.find((p: { type?: string; text?: string }) => p?.type === "text");
        return typeof text?.text === "string" ? text.text : "";
      }
      return String(c ?? "");
    };

    const result = streamText({
      model: openai("gpt-4o-mini"),
      system,
      messages: messages.map((m) => ({
        role: m.role as "user" | "assistant" | "system",
        content: normalizeContent(m.content),
      })),
      maxSteps: 2,
      tools: {
        create_sticky_note: tool({
          description:
            "Create one or more sticky notes. Use for single notes or grids of notes (e.g. 2x3).",
          parameters: jsonSchema<{
            items: Array<{
              text: string;
              color?: string;
              x?: number;
              y?: number;
              width?: number;
              height?: number;
            }>;
          }>({
            type: "object",
            properties: {
              items: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    text: { type: "string", description: "Note content" },
                    color: { type: "string", description: "Hex or name" },
                    x: { type: "number" },
                    y: { type: "number" },
                    width: { type: "number" },
                    height: { type: "number" },
                  },
                  required: ["text"],
                },
              },
            },
            required: ["items"],
          }),
          execute: async () => "Done.",
        }),
        create_shape: tool({
          description:
            "Create a shape: rect, circle, or triangle. Optional position and size.",
          parameters: jsonSchema<{
            shapeType: "rect" | "circle" | "triangle";
            fill?: string;
            x?: number;
            y?: number;
            width?: number;
            height?: number;
          }>({
            type: "object",
            properties: {
              shapeType: { type: "string", enum: ["rect", "circle", "triangle"] },
              fill: { type: "string" },
              x: { type: "number" },
              y: { type: "number" },
              width: { type: "number" },
              height: { type: "number" },
            },
            required: ["shapeType"],
          }),
          execute: async () => "Done.",
        }),
        create_frame: tool({
          description:
            "Create a single frame (labeled container). Use for one frame only. For multiple frames or columns use create_frames instead.",
          parameters: jsonSchema<{
            title: string;
            x?: number;
            y?: number;
            width?: number;
            height?: number;
          }>({
            type: "object",
            properties: {
              title: { type: "string" },
              x: { type: "number" },
              y: { type: "number" },
              width: { type: "number" },
              height: { type: "number" },
            },
            required: ["title"],
          }),
          execute: async () => "Done.",
        }),
        create_frames: tool({
          description:
            "Create multiple frames in one call. Pass items: an array of objects, one per frame. Each object has title (required) and optional x, y, width, height. The number of items must match the number of frames requested (e.g. 3 columns = 3 items, 6 frames = 6 items). Use different x values so frames sit side by side (e.g. 100, 420, 740 for 3; add ~320 per frame). Use this whenever the user asks for more than one frame or column.",
          parameters: jsonSchema<{
            items: Array<{
              title: string;
              x?: number;
              y?: number;
              width?: number;
              height?: number;
            }>;
          }>({
            type: "object",
            properties: {
              items: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    x: { type: "number" },
                    y: { type: "number" },
                    width: { type: "number" },
                    height: { type: "number" },
                  },
                  required: ["title"],
                },
              },
            },
            required: ["items"],
          }),
          execute: async () => "Done.",
        }),
        create_connector: tool({
          description:
            "Draw a line/arrow between two elements. Use element IDs from board state.",
          parameters: jsonSchema<{
            fromId: string;
            toId: string;
            label?: string;
            style?: "line" | "arrow";
          }>({
            type: "object",
            properties: {
              fromId: { type: "string" },
              toId: { type: "string" },
              label: { type: "string" },
              style: { type: "string", enum: ["line", "arrow"] },
            },
            required: ["fromId", "toId"],
          }),
          execute: async () => "Done.",
        }),
        move_elements: tool({
          description: "Move elements by ID by a delta (dx, dy) in board space.",
          parameters: jsonSchema<{
            ids: string[];
            dx: number;
            dy: number;
          }>({
            type: "object",
            properties: {
              ids: { type: "array", items: { type: "string" } },
              dx: { type: "number" },
              dy: { type: "number" },
            },
            required: ["ids", "dx", "dy"],
          }),
          execute: async () => "Done.",
        }),
        update_elements: tool({
          description:
            "Update properties of elements by ID (e.g. text, title, color, position, size).",
          parameters: jsonSchema<{
            updates: Array<{
              id: string;
              text?: string;
              title?: string;
              color?: string;
              fill?: string;
              x?: number;
              y?: number;
              width?: number;
              height?: number;
            }>;
          }>({
            type: "object",
            properties: {
              updates: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    text: { type: "string" },
                    title: { type: "string" },
                    color: { type: "string" },
                    fill: { type: "string" },
                    x: { type: "number" },
                    y: { type: "number" },
                    width: { type: "number" },
                    height: { type: "number" },
                  },
                  required: ["id"],
                },
              },
            },
            required: ["updates"],
          }),
          execute: async () => "Done.",
        }),
        delete_elements: tool({
          description: "Delete elements by ID.",
          parameters: jsonSchema<{ ids: string[] }>({
            type: "object",
            properties: { ids: { type: "array", items: { type: "string" } } },
            required: ["ids"],
          }),
          execute: async () => "Done.",
        }),
        arrange_grid: tool({
          description:
            "Arrange elements in a grid. Provide element IDs and optional columns and spacing.",
          parameters: jsonSchema<{
            ids: string[];
            columns?: number;
            spacing?: number;
          }>({
            type: "object",
            properties: {
              ids: { type: "array", items: { type: "string" } },
              columns: { type: "number" },
              spacing: { type: "number" },
            },
            required: ["ids"],
          }),
          execute: async () => "Done.",
        }),
        resize_frame_to_fit: tool({
          description:
            "Resize a frame to fit its contents. Use when the user asks to resize a frame to fit its contents or to fit the elements inside it. Elements are considered inside if their center is within the frame bounds.",
          parameters: jsonSchema<{ frameId: string; padding?: number }>({
            type: "object",
            properties: {
              frameId: { type: "string", description: "ID of the frame to resize" },
              padding: { type: "number", description: "Padding around contents in pixels (default 16)" },
            },
            required: ["frameId"],
          }),
          execute: async () => "Done.",
        }),
        distribute_elements: tool({
          description:
            "Space elements evenly in a row (horizontal) or column (vertical). Use when the user asks to space elements evenly, distribute them in a line, or align with equal gaps.",
          parameters: jsonSchema<{
            ids: string[];
            direction: "horizontal" | "vertical";
            spacing?: number;
          }>({
            type: "object",
            properties: {
              ids: { type: "array", items: { type: "string" } },
              direction: { type: "string", enum: ["horizontal", "vertical"] },
              spacing: { type: "number", description: "Gap between elements in pixels (default 24)" },
            },
            required: ["ids", "direction"],
          }),
          execute: async () => "Done.",
        }),
      },
    });

    return result.toDataStreamResponse();
  } catch (err) {
    console.error("Board agent API error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
