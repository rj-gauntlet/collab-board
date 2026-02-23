import { streamText, tool, createDataStreamResponse, formatDataStreamPart } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { jsonSchema } from "ai";
import type { BoardStateSummary } from "@/features/ai-agent/board-agent-types";
import { isAskingWhatIsOnBoard, formatBoardStateList } from "./board-agent-helpers";

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MAX_BOARD_STATE_ELEMENTS = 80;

const BOARD_STATE_CONTEXT = `You modify a collaborative whiteboard. Board state is JSON (id, type, text/title, x, y, width, height, color). Coords in board space; use x,y 100-200, spacing 24-40. Defaults: note 160x120, frame 320x200, shape 120x80.

When the user asks what is on the board (or "what's currently on the board" or "describe the board"): you MUST list every single element in the Board state JSON below. The Board state array has one entry per element—your reply must mention every entry. For each: say the type (sticky-note, shape, text, frame, connector), color/fill if present, and text for notes. Example format: "The board has: (1) a red circle (shape), (2) a blue rectangle (shape), (3) a pink sticky note with text 'X', (4) a yellow sticky note with text 'Y'." Never reply with only one item when the Board state contains multiple elements.

You MUST call a tool to change the board. Do not only describe—invoke the tool so the board updates. Then reply in one sentence.

Command types:
1) Create: create_sticky_note, create_sticky_notes_grid, create_shape/create_shapes, create_frame/create_frames, create_connector.
2) Templates—call only the template tool(s) that match what the user asked for. Do not call create_swot_analysis when the user asked for a flowchart; do not call create_flowchart when the user asked for SWOT; etc. If the user asks for multiple (e.g. "flowchart and SWOT"), then call both.
- Flowchart: When the user says "flowchart" or "flow chart", call create_flowchart. Pass labels array for custom node names (e.g. ["Start","Consideration","Validation","Decision","Success"]); omit for default (Start, Step 1, Step 2, End).
- User journey map: When the user says "user journey", "journey map", or "customer journey", call create_user_journey_map. Optionally pass stages and/or lanes arrays; omit for defaults.
- SWOT: When the user says "SWOT" or "SWOT analysis", call create_swot_analysis. Optionally pass notesPerQuadrant (1-5); omit for 3.
3) Delete: delete_elements(ids) for specific items; clear_board (no params) for "delete all"/"clear board"/"remove everything". When the user asks to delete a frame "and its contents" or "and everything inside it", pass the frame's id AND the id of every element whose parentFrameId equals that frame's id (from board state). That removes the frame and only the notes/shapes/text inside it; elements outside the frame (different or no parentFrameId) must not be included.
4) Move: move_elements(ids, dx, dy).
5) Update: update_elements(updates).
6) Arrange: arrange_grid(ids, columns?, spacing?); distribute_elements(ids, direction, spacing?); resize_frame_to_fit(frameId).

Rules: Match "the pink note"/"frame X" to board state; use element id. Board state includes parentFrameId on notes, shapes, and text—use it to know which elements are inside a frame. When deleting "the frame and its contents", ids must be [frameId, ...all ids with parentFrameId === frameId]; do not include elements outside the frame. Frames: content area y >= frame.y+28. Grids: create_sticky_notes_grid with labels in row-major order. Colors: hex or name. For complex requests, call multiple tools in sequence.

Sticky notes in frames: When creating N sticky notes inside a frame you MUST size the frame so every note is fully inside (with 20px padding). Sticky size 160x120, spacing 24, title bar 28, padding 20. (1) Choose grid: e.g. 5 notes = 2x3, 8 notes = 4x2. (2) Frame dimensions (use these formulas exactly): frame_width = 40 + cols*160 + (cols-1)*24. frame_height = 28 + 40 + rows*120 + (rows-1)*24. (3) First note position: startX = frame.x+20, startY = frame.y+28+20 (content is below the 28px title bar). Step: stepX = 184, stepY = 144. Note at (col,row) = (startX + col*184, startY + row*144). (4) Create the frame with that exact width and height, then create_sticky_note with those positions. Check: rightmost note right edge = startX + (cols-1)*184 + 160 must be <= frame.x+frame_width-20; bottom note bottom = startY + (rows-1)*144 + 120 must be <= frame.y+frame_height-20.

Example 5 inside + 3 outside: create_frame x 100 y 100 width 384 height 476. create_sticky_note 8 items: inside (120,148),(304,148),(120,292),(304,292),(120,436); outside (524,100),(524,244),(524,388).
Example 8 notes in frame only: 4 cols x 2 rows. create_frame x 100 y 100 width 752 height 332. create_sticky_note 8 items at (120,148),(304,148),(488,148),(672,148),(120,292),(304,292),(488,292),(672,292).`;

function buildSystemPrompt(boardState: BoardStateSummary[]): string {
  const state =
    boardState.length > MAX_BOARD_STATE_ELEMENTS
      ? boardState.slice(-MAX_BOARD_STATE_ELEMENTS)
      : boardState;
  const stateJson =
    state.length > 0 ? JSON.stringify(state, null, 0) : "[] (empty board)";
  const countLine =
    state.length > 0
      ? `Board state has ${state.length} element(s). When the user asks what is on the board, list all ${state.length} in your reply:\n`
      : "";
  return `${BOARD_STATE_CONTEXT}

${countLine}Board state:
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

    const normalizeContent = (c: string | unknown): string => {
      if (typeof c === "string") return c;
      if (Array.isArray(c)) {
        const text = c.find((p: { type?: string; text?: string }) => p?.type === "text");
        return typeof text?.text === "string" ? text.text : "";
      }
      return String(c ?? "");
    };

    const lastMessage = messages[messages.length - 1];
    const lastUserContent =
      lastMessage?.role === "user" ? normalizeContent(lastMessage.content) : "";
    const stateArray = Array.isArray(boardState) ? boardState : [];
    const forcedWhatOnBoardReply = isAskingWhatIsOnBoard(lastUserContent)
      ? formatBoardStateList(
          stateArray.length > MAX_BOARD_STATE_ELEMENTS
            ? stateArray.slice(-MAX_BOARD_STATE_ELEMENTS)
            : stateArray
        )
      : undefined;

    // Bypass the model for "what's on the board" so we always return the full list (model often ignored prompt).
    if (forcedWhatOnBoardReply != null) {
      return createDataStreamResponse({
        execute: (dataStream) => {
          dataStream.write(formatDataStreamPart("text", forcedWhatOnBoardReply));
          dataStream.write(formatDataStreamPart("finish_message", { finishReason: "stop" }));
        },
      });
    }

    const system = buildSystemPrompt(boardState);

    const result = streamText({
      model: openai("gpt-4o-mini"),
      system,
      messages: messages.map((m) => ({
        role: m.role as "user" | "assistant" | "system",
        content: normalizeContent(m.content),
      })),
      maxSteps: 5,
      maxTokens: 2048,
      temperature: 0,
      tools: {
        create_sticky_note: tool({
          description:
            "Create one or more sticky notes. Pass items: array of { text, color?, x?, y?, width?, height? }. Each element of items becomes exactly one sticky note on the board. Use one item per note with a single text string (e.g. 'Note 1'); do not put multiple note labels or newlines in one item's text. For an NxM grid use create_sticky_notes_grid instead. To add notes inside a frame use x,y within the frame content area (y >= frame.y+28).",
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
            "Create a single frame (labeled container with 28px title bar; content area is below y+28). Use for one frame only. When the frame will contain sticky notes, set width and height so notes fit in a grid with 20px padding inside the frame; each note is 160x120, use 24px spacing between notes.",
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
            "Create a flowchart. Use only when the user asked for a flowchart or flow chart (not when they asked for SWOT, journey map, or something else). One frame titled 'Flowchart', sticky notes in a vertical column with arrows between them. Pass labels: array of node names in order (e.g. ['Start', 'Consideration', 'Validation', 'Decision', 'Success']). Minimum 2 nodes. If the user does not specify node names, omit labels for default: Start, Step 1, Step 2, End.",
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
        create_user_journey_map: tool({
          description:
            "Create a user journey map. Use only when the user asked for a journey map, user journey, or customer journey (not when they asked for a flowchart, SWOT, or something else). Stage frames in a row with lane rows inside each. Pass stages and/or lanes arrays; omit for defaults.",
          parameters: jsonSchema<{ stages?: string[]; lanes?: string[] }>({
            type: "object",
            properties: {
              stages: {
                type: "array",
                items: { type: "string" },
                description: "Stage names left to right (e.g. Awareness, Consideration, Decision, Purchase, Loyalty). Omit for default.",
              },
              lanes: {
                type: "array",
                items: { type: "string" },
                description: "Row names top to bottom (e.g. Actions, Touchpoints, Thoughts, Pain points, Opportunities). Omit for default.",
              },
            },
          }),
          execute: async () => "Done.",
        }),
        create_swot_analysis: tool({
          description:
            "Create a SWOT analysis. Use only when the user asked for SWOT or SWOT analysis (not when they asked for a flowchart, journey map, or something else). 4 quadrants in 2x2 layout (Strengths, Weaknesses, Opportunities, Threats), each with placeholder sticky notes. Pass notesPerQuadrant (1–5, default 3) to set how many empty notes per quadrant.",
          parameters: jsonSchema<{ notesPerQuadrant?: number }>({
            type: "object",
            properties: {
              notesPerQuadrant: {
                type: "number",
                description: "Number of placeholder notes per quadrant (1–5). Omit for default 3.",
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
            "Delete specific elements by ID. Use when the user names which items to remove (e.g. 'delete the pink note'). When the user asks to delete a frame and its contents (or 'the frame and everything inside'), pass ids: [frameId, ...every element id where parentFrameId === frameId from board state]. That deletes the frame and only the elements inside it; leave elements outside the frame (parentFrameId different or missing) out of ids. For 'delete all' or 'clear the board' use clear_board instead.",
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
