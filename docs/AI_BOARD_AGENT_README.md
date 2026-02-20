# AI Board Agent — How It Works

This document explains how the AI Board Agent in CollabBoard works, in plain language suitable for a junior engineer presenting to a team lead. No prior knowledge of “AI agents” is assumed.

---

## What is the AI Board Agent?

The **AI Board Agent** is a feature that lets users change the whiteboard by typing in plain English instead of using the toolbar. For example:

- *“Add a yellow sticky note that says User Research”*
- *“Move all the pink sticky notes to the right”*
- *“Create a SWOT analysis with four quadrants”*

Under the hood, an **AI model** (GPT-4o-mini) reads the user’s message, decides what to do, and calls **tools** (small functions) that create, move, or edit elements on the board. The “agent” is simply: **user message → model → tool calls → our code runs those tools on the board**.

---

## High-Level Flow (End to End)

1. **User** types a message in the Board Agent chat panel and sends it.
2. **Frontend** sends that message to our API, along with a **snapshot of the current board** (list of elements with id, type, position, text, color, etc.). This snapshot is the “context” the model needs to refer to existing items (e.g. “the blue note” or “move the frame called Sprint Planning”).
3. **API route** (`/api/ai/board-agent`) receives the message and the board snapshot. It calls the AI model with:
   - A **system prompt** that describes the board, coordinate system, and available tools.
   - The **conversation** (user message and any prior messages).
   - A **list of tools** the model is allowed to call (create sticky note, create shape, move elements, delete elements, arrange in a grid, etc.).
4. **Model** thinks and then returns two things:
   - **Text**: a short reply to the user (e.g. “I’ve added a yellow sticky note.”).
   - **Tool calls**: one or more “calls” like “create_sticky_note with text=’User Research’, color=’yellow’, x=100, y=100.” The model chooses which tools to call and with what arguments.
5. **API** streams that response back to the frontend (text + tool calls). On the server we don’t actually run the tools; we just tell the model “OK, done” so it can continue if needed.
6. **Frontend** receives the stream. When the assistant message is finished, it looks at the **tool invocations** in that message. For each tool call (name + arguments), it calls the matching method on the **whiteboard canvas** (e.g. `createNotesFromAI`, `moveElementsByAgent`). Those methods update React state and write to Firestore, so the board updates in real time for the user and for others.

So: **user message + board state → API → model → tool calls → frontend runs those tools on the canvas.**

---

## Main Concepts

### 1. “Tools” (function calling)

A **tool** is a small, well-defined action the model can request. Each tool has:

- A **name** (e.g. `create_sticky_note`, `move_elements`).
- A **description** (so the model knows when to use it).
- A **parameters schema** (e.g. “items: array of { text, color?, x?, y? }”).

The model doesn’t “run” code itself. It outputs: “call tool X with arguments Y.” Our code (API and then frontend) then runs the real logic (e.g. create a note in Firestore, update canvas state).

### 2. Board state context

The model needs to know what’s already on the board so it can:

- Refer to elements (“move the pink sticky note”, “resize the frame called Backlog”).
- Avoid overlapping new elements.
- Use correct IDs when creating connectors or updating elements.

So we send a **compact summary** of the board (id, type, text/title, x, y, width, height, color) with every request. That summary is built by `getBoardState()` on the canvas and passed in the request body.

### 3. Where execution happens

- **Server (API):** Runs the model and defines the tools. Tool `execute` functions on the server return a stub (“Done.”) so the model gets a response; we do **not** write to Firestore or canvas on the server.
- **Client:** When the streamed message is complete, the client reads the **tool invocations** from the message and runs each one via the **whiteboard canvas handle** (e.g. `createNotesFromAI`, `moveElementsByAgent`). That way all writes go through the existing canvas/Firestore logic and stay in sync with the rest of the app.

---

## Where Things Live in the Codebase

| What | Where |
|------|--------|
| **API route** (model + tools, stream response) | `src/app/api/ai/board-agent/route.ts` |
| **Tool argument types** (for the client) | `src/features/ai-agent/board-agent-types.ts` |
| **Execute tool calls on the canvas** | `src/features/ai-agent/executeBoardAgentTools.ts` |
| **Chat UI** (input, messages, send, onFinish) | `src/features/ai-agent/BoardAgentChat.tsx` |
| **Canvas methods used by the agent** | `src/features/whiteboard/WhiteboardCanvas.tsx` (e.g. `getBoardState`, `createNotesFromAI`, `moveElementsByAgent`, …) |
| **Wiring on the board page** | `src/app/[boardId]/page.tsx` (Agent button, render `BoardAgentChat` with `canvasRef` and `getBoardState`) |

**Available tools:** `create_sticky_note`, `create_shape`, `create_frame`, `create_frames`, `create_connector`, `move_elements`, `update_elements`, `delete_elements`, `arrange_grid`, `resize_frame_to_fit`, `distribute_elements`.

---

## How Tool Calling Works (A Bit More Detail)

1. **Defining tools (API)**  
   In `route.ts` we call `streamText({ model, system, messages, tools })`. Each entry in `tools` is created with `tool({ description, parameters, execute })`. `parameters` is a JSON Schema so the model knows the shape of arguments (e.g. `create_sticky_note` has `items: array of { text, color?, x?, y? }`). `execute` on the server just returns `"Done."` so the model can continue; the real effect happens on the client.

2. **Model returns tool calls**  
   The model’s response can include “tool call” parts: tool name + arguments. The stream sends these to the client; the client stores them in the assistant message’s `toolInvocations` (or in `parts` as tool-invocation parts).

3. **Client runs them**  
   When the message is finished, we call `getToolCallsFromMessage(message)` to get a list of `{ toolName, args }`. Then we call `executeBoardAgentTools(canvasRef.current, toolCalls)`, which switches on `toolName` and calls the right canvas method (e.g. `createNotesFromAI(args.items)` for `create_sticky_note`).

So: **tools are defined in the API; the model chooses which to call and with what args; the client interprets those calls and runs the canvas methods.**

---

## How to Add a New Tool

1. **API (`route.ts`)**  
   Add a new entry to the `tools` object, e.g. `create_text: tool({ description: "...", parameters: jsonSchema<...>({ ... }), execute: async () => "Done." })`.

2. **Types (`board-agent-types.ts`)**  
   Add an args type and, if you like, the tool name to `BoardAgentToolName`.

3. **Executor (`executeBoardAgentTools.ts`)**  
   In the `switch (inv.toolName)` add a `case "create_text":` that reads `inv.args` and calls a new method on the handle (e.g. `handle.createTextFromAI(...)`).

4. **Canvas (`WhiteboardCanvas.tsx`)**  
   Implement the new method on the canvas (and on `WhiteboardCanvasHandle`), e.g. create the element and persist it to Firestore, same pattern as `createNotesFromAI`.

5. **Handle interface**  
   Extend `WhiteboardCanvasHandle` in `WhiteboardCanvas.tsx` with the new method signature.

---

## Environment

- The API route uses **OpenAI** (GPT-4o-mini). Set **`OPENAI_API_KEY`** in the environment (e.g. in `.env.local`) so the server can call the model.

---

## Summary for Your Team Lead

- **What it is:** A chat-driven way to change the board via natural language; the model turns user intent into structured tool calls; our client executes those tools against the canvas and Firestore.
- **Why tools:** The model doesn’t run code; it only outputs “call this function with these arguments.” We define the tools and run them in our app.
- **Why client-side execution:** All board updates go through the same canvas and Firestore logic, so we don’t need Firebase Admin or duplicate write logic on the server.
- **Flow in one sentence:** User message + board snapshot go to the API → model returns text + tool calls → client runs those tool calls on the canvas and the board updates.

If you need to extend it, add a new tool in the API, implement the corresponding canvas method and executor case, and expose it on the handle.
