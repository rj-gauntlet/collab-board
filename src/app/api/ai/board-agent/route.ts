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
Grid of sticky notes: When the user asks for an NxM grid of sticky notes (e.g. 6x6, 4x4, 2x3 pros and cons), use create_sticky_notes_grid with rows and columns. To add task-appropriate text (e.g. pros and cons, or row/column labels), pass labels: an array of strings in row-major order—e.g. 3 rows × 2 columns for pros and cons: labels ['Pro 1','Con 1','Pro 2','Con 2','Pro 3','Con 3']. This gives correct layout and content in one call. Do not use create_sticky_note with many items for grids.

Frames (containers):
- A frame is a labeled container: it has id, type "frame", title, x, y, width, height. The top 28px is the title bar; the content area is the rectangle from (x, y+28) to (x+width, y+height). Nothing should be placed in the title bar strip.
- Elements inside a frame have "parentFrameId" set to that frame's id. Use this to know which sticky notes/shapes belong to which frame (e.g. "add a note to the Strengths frame" = find the frame with title "Strengths", then create a note with x,y inside that frame's content area).
- To add content inside a frame: use the frame's id from board state and place items with x between frame.x and frame.x+width minus item width, and y at least frame.y+28 (e.g. frame.y+36 for padding). Example: frame at 100,100 320x200 → content area x 100–320, y from 128; first note at (116, 144).
- Single frame: use create_frame. Two or more frames: use create_frames with items array, different x so they sit side by side (e.g. x: 100, 420, 740 for three).
- Templates: "SWOT analysis" = create_frames with 4 items: Strengths, Weaknesses, Opportunities, Threats in 2x2 (e.g. Strengths 100,100 / Weaknesses 420,100 / Opportunities 100,340 / Threats 420,340). Add notes inside each using that frame's bounds and y >= frame.y+36.
- "Retrospective" = create_frames with 3 items: "What Went Well", "What Didn't Go Well", "Action Items", x: 100, 420, 740.
- "User journey with N stages" = create_frames with N items; optionally connect consecutive frames with create_connector using their ids from board state.
- resize_frame_to_fit: use when the user asks to resize a frame to fit its contents. Elements with that frame's id as parentFrameId are considered inside it.

Referring to elements:
- When the user says "these", "selected", "the pink note", "the frame called X", match from the board state by description (text/title/color/type) and use the element id. If multiple match (e.g. "pink notes"), use all their ids.
- If no IDs are clear, prefer the most recently created or mentioned elements, or ask once for clarification.

Colors: Use hex (e.g. #fef08a) or names (yellow, blue, pink, green, orange, purple).

IMPORTANT: You MUST use the provided tools to make changes. Do not only describe—call the tool(s) so the board updates. After calling tools, briefly confirm in one sentence.
- resize_frame_to_fit: when the user asks to resize a frame to fit its contents.
- distribute_elements: when they ask to space elements evenly, in a row/column, or with equal gaps (direction "horizontal" or "vertical").
- For "arrange in a grid" use arrange_grid with the element ids and optional columns/spacing.
- For "NxM grid of sticky notes" use create_sticky_notes_grid with rows and columns. When the grid has a purpose (e.g. pros and cons, voting options, categories), pass labels with the text for each cell in row-major order so notes have the right content.
- For "delete all", "clear the board", "remove everything", or "clear all elements" use clear_board (no parameters). Do not use delete_elements with a list of IDs for clearing the whole board—clear_board removes everything reliably.
- For multiple shapes at once (e.g. "4 circles", "2x2 grid of rectangles") use create_shapes with an items array.
- To connect two elements: use create_connector with fromId and toId. You can set connector appearance: stroke (color, e.g. #3b82f6 or red), strokeWidth (thickness), dashed, curved, bidirectional, label, style (line or arrow). To change an existing connector's color, thickness, or style use update_elements with the connector's id and stroke, strokeWidth, dashed, curved, bidirectional, label, or style.

Flowchart: When the user asks for a flowchart, use create_flowchart. If they specify node names (e.g. "Start, Consideration, Validation, Decision and Success"), pass those exact names in order as the labels array: create_flowchart({ labels: ["Start", "Consideration", "Validation", "Decision", "Success"] }). Use the order the user gives. If they do not specify node names, omit the labels parameter to get the default (Start, Step 1, Step 2, End). Always use create_flowchart so the frame and arrows are included; do not use create_sticky_note alone for flowcharts.`;

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
            "Create one or more sticky notes with custom text/position. Pass items: array of { text, color?, x?, y?, width?, height? }. For an NxM grid of sticky notes (e.g. 6x6, 4x4) use create_sticky_notes_grid instead. To add a note inside a frame: use x,y within that frame's content area (y at least frame.y+28).",
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
        create_sticky_notes_grid: tool({
          description:
            "Create an NxM grid of sticky notes with correct spacing (no overlap). Use for any grid (e.g. 6x6, 2x3). Optionally pass labels: array of strings in row-major order (first row left-to-right, then second row, etc.) to set each note's text—e.g. for '2x3 pros and cons' use rows=3, columns=2, labels: ['Pro 1','Con 1','Pro 2','Con 2','Pro 3','Con 3']. If labels is omitted, notes are empty. Optional startX, startY, spacing.",
          parameters: jsonSchema<{
            rows: number;
            columns: number;
            labels?: string[];
            startX?: number;
            startY?: number;
            spacing?: number;
          }>({
            type: "object",
            properties: {
              rows: { type: "number", description: "Number of rows in the grid" },
              columns: { type: "number", description: "Number of columns in the grid" },
              labels: {
                type: "array",
                items: { type: "string" },
                description: "Optional. Text for each cell in row-major order (row 0 left to right, then row 1, etc.). Length can be rows*columns; extra entries ignored, missing entries get empty text.",
              },
              startX: { type: "number", description: "Left edge of grid (default 100)" },
              startY: { type: "number", description: "Top edge of grid (default 100)" },
              spacing: { type: "number", description: "Gap between notes in px (default 24)" },
            },
            required: ["rows", "columns"],
          }),
          execute: async () => "Done.",
        }),
        create_shape: tool({
          description:
            "Create a single shape (rect, circle, or triangle). To place inside a frame use x,y in the frame's content area (y >= frame.y+28). For multiple shapes use create_shapes instead.",
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
            "Create multiple shapes in one call. Use for grids (e.g. 2x2 rectangles), multiple circles, or several shapes with different positions. Each item has shapeType (rect/circle/triangle) and optional fill, x, y, width, height. To place inside a frame: use x,y in the frame's content area (y >= frame.y+28). Space positions (e.g. x: 100, 240, 380 for three in a row).",
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
            "Create a single frame (labeled container with 28px title bar; content area is below y+28). Use for one frame only. For multiple frames or columns use create_frames instead.",
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
            "Create multiple frames in one call. Each frame has a 28px title bar; content goes below. Pass items: array of { title, x?, y?, width?, height? }. One item per frame. Use different x for side-by-side (e.g. 100, 420, 740 for 3). For SWOT use 4 titles: Strengths, Weaknesses, Opportunities, Threats. For retrospective use 3: What Went Well, What Didn't, Action Items. For user journey use N stage names. When adding notes into a frame later, use that frame's id and bounds from board state.",
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
        create_flowchart: tool({
          description:
            "Create a flowchart: one frame titled 'Flowchart', sticky notes in a vertical column with arrows between them. Pass labels: array of node names in order (e.g. ['Start', 'Consideration', 'Validation', 'Decision', 'Success']). Minimum 2 nodes. If the user does not specify node names, omit labels for default: Start, Step 1, Step 2, End. Use the exact names and order the user gives.",
          parameters: jsonSchema<{ labels?: string[] }>({
            type: "object",
            properties: {
              labels: {
                type: "array",
                items: { type: "string" },
                description: "Node labels in order, top to bottom (e.g. ['Start', 'Consideration', 'Validation', 'Decision', 'Success']). Omit for default 4-node template.",
              },
            },
          }),
          execute: async () => "Done.",
        }),
        create_connector: tool({
          description:
            "Draw a connector (line or arrow) between two elements. Pass fromId and toId from board state. Optional: label (text on line), style ('line' or 'arrow'), stroke (color, e.g. #3b82f6 or 'red'), strokeWidth (number, e.g. 2 or 4), dashed (boolean), curved (boolean), bidirectional (boolean for arrows on both ends).",
          parameters: jsonSchema<{
            fromId: string;
            toId: string;
            label?: string;
            style?: "line" | "arrow";
            stroke?: string;
            strokeWidth?: number;
            dashed?: boolean;
            curved?: boolean;
            bidirectional?: boolean;
          }>({
            type: "object",
            properties: {
              fromId: { type: "string" },
              toId: { type: "string" },
              label: { type: "string" },
              style: { type: "string", enum: ["line", "arrow"] },
              stroke: { type: "string", description: "Line color (hex or name)" },
              strokeWidth: { type: "number", description: "Line thickness in px" },
              dashed: { type: "boolean" },
              curved: { type: "boolean" },
              bidirectional: { type: "boolean" },
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
            "Update properties of elements by ID. For notes: text, color, x, y, width, height. For shapes: fill, x, y, width, height. For text: text, fill, x, y. For frames: title, x, y, width, height. For connectors: stroke (color), strokeWidth (thickness), dashed, curved, bidirectional, label, style ('line' or 'arrow').",
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
              stroke?: string;
              strokeWidth?: number;
              dashed?: boolean;
              curved?: boolean;
              bidirectional?: boolean;
              label?: string;
              style?: "line" | "arrow";
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
                    stroke: { type: "string" },
                    strokeWidth: { type: "number" },
                    dashed: { type: "boolean" },
                    curved: { type: "boolean" },
                    bidirectional: { type: "boolean" },
                    label: { type: "string" },
                    style: { type: "string", enum: ["line", "arrow"] },
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
          description:
            "Delete specific elements by ID. Use when the user names which items to remove (e.g. 'delete the pink note'). For 'delete all' or 'clear the board' use clear_board instead.",
          parameters: jsonSchema<{ ids: string[] }>({
            type: "object",
            properties: { ids: { type: "array", items: { type: "string" } } },
            required: ["ids"],
          }),
          execute: async () => "Done.",
        }),
        clear_board: tool({
          description:
            "Remove ALL elements from the board (notes, shapes, text, frames, connectors). Use when the user asks to delete everything, clear the board, remove all elements, or start fresh. No parameters.",
          parameters: jsonSchema<Record<string, never>>({
            type: "object",
            properties: {},
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
            "Resize a frame to fit its contents. Use when the user asks to resize a frame to fit its contents. Elements with parentFrameId equal to this frame's id (or whose center is within the frame bounds) are considered inside.",
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
