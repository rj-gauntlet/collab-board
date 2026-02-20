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
When creating multiple items (e.g. grid, template), place them so they don't overlap and use consistent spacing (e.g. 24-40px gaps).

Frames:
- Each frame has a 28px title bar at the top. When placing sticky notes or shapes inside a frame, use y at least frame.y + 28 (e.g. frame.y + 36 with padding) so content appears in the body below the title bar, not overlapping it.
- For a single frame use create_frame. For two or more frames or columns always use create_frames with an items array (one item per frame). Use different x positions so frames sit side by side (e.g. x: 100, 420, 740 for three; add ~320 per column).
- Templates: "SWOT analysis" = create_frames with 4 items: Strengths, Weaknesses, Opportunities, Threats in a 2x2 layout (e.g. Strengths 100,100 / Weaknesses 420,100 / Opportunities 100,340 / Threats 420,340). When adding notes inside each quadrant, use y = frame.y + 36 or higher.
- "Retrospective board" or "What Went Well, What Didn't, Action Items" = create_frames with 3 items: "What Went Well", "What Didn't Go Well" (or "What Didn't"), "Action Items", with x: 100, 420, 740.
- "User journey map with N stages" = create_frames with N items (e.g. 5 stages: Discover, Define, Design, Develop, Deliver or similar). Optionally add connectors between consecutive frames using create_connector and the frame IDs from the board state after creation.

Referring to elements:
- When the user says "these", "selected", "the pink note", "the frame called X", match from the board state by description (text/title/color/type) and use the element id. If multiple match (e.g. "pink notes"), use all their ids.
- If no IDs are clear, prefer the most recently created or mentioned elements, or ask once for clarification.

Colors: Use hex (e.g. #fef08a) or names (yellow, blue, pink, green, orange, purple).

IMPORTANT: You MUST use the provided tools to make changes. Do not only describe—call the tool(s) so the board updates. After calling tools, briefly confirm in one sentence.
- resize_frame_to_fit: when the user asks to resize a frame to fit its contents.
- distribute_elements: when they ask to space elements evenly, in a row/column, or with equal gaps (direction "horizontal" or "vertical").
- For "arrange in a grid" use arrange_grid with the element ids and optional columns/spacing.
- For multiple shapes at once (e.g. "4 circles", "2x2 grid of rectangles") use create_shapes with an items array.`;

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
      maxSteps: 3,
      tools: {
        create_sticky_note: tool({
          description:
            "Create one or more sticky notes. Pass items: array of { text, color?, x?, y?, width?, height? }. For a 2x3 grid use 6 items with x,y spaced (e.g. row1: 100,100 / 280,100 / 460,100; row2: 100,260 / 280,260 / 460,260).",
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
            "Create a single shape (rect, circle, or triangle). For multiple shapes use create_shapes instead.",
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
        create_shapes: tool({
          description:
            "Create multiple shapes in one call. Use for grids (e.g. 2x2 rectangles), multiple circles, or several shapes with different positions. Each item has shapeType (rect/circle/triangle) and optional fill, x, y, width, height. Space positions (e.g. x: 100, 240, 380 for three in a row).",
          parameters: jsonSchema<{
            items: Array<{
              shapeType: "rect" | "circle" | "triangle";
              fill?: string;
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
                    shapeType: { type: "string", enum: ["rect", "circle", "triangle"] },
                    fill: { type: "string" },
                    x: { type: "number" },
                    y: { type: "number" },
                    width: { type: "number" },
                    height: { type: "number" },
                  },
                  required: ["shapeType"],
                },
              },
            },
            required: ["items"],
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
            "Create multiple frames in one call. Pass items: array of { title, x?, y?, width?, height? }. One item per frame. Use different x for side-by-side (e.g. 100, 420, 740 for 3). For SWOT use 4 titles: Strengths, Weaknesses, Opportunities, Threats. For retrospective use 3: What Went Well, What Didn't, Action Items. For user journey use N stage names.",
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
