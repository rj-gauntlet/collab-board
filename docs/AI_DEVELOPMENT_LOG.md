# AI Development Log

**Project:** CollabBoard  
**Document:** AI-First Development Requirements — AI Development Log (1 page)

---

## Tools & Workflow

**AI coding tools used (at least 2 required):**

- **Cursor** — Primary IDE with integrated AI (composer, chat, inline edit). Used for feature implementation (connector UX, flowchart, user journey map, SWOT, CollabBot fixes), refactors, and documentation. Workflow: describe task in chat/composer → accept or edit suggested code → run and iterate.
- **Cursor only** — No second AI coding tool; all AI-assisted development was done in Cursor (composer, chat, inline edit).

**Integration:** AI was used inside Cursor for editing repo files, running commands, and reading PRD/docs. No separate CI step for “AI-generated” code; all changes committed from the same workflow.

---

## MCP Usage

**MCPs used (if any):** No MCPs used.


---

## Effective Prompts

**3–5 prompts that worked well (actual prompt text):**

1. **Flowchart:**  
   *“Add the ability to create a flowchart with a frame, sticky notes, and connectors.”*  
   Result: Toolbar Flowchart button and `createFlowchart()` with frame, notes, and arrows; CollabBot `create_flowchart` tool with optional labels array (e.g. Start, Step 1, Step 2, End).

2. **SWOT Analysis:**  
   *“Add a SWOT Analysis template: a frame with four quadrants (Strengths, Weaknesses, Opportunities, Threats), each with sticky notes inside.”*  
   Result: Toolbar SWOT button and `create_swot_analysis()`; CollabBot `create_swot_analysis` tool with optional `notesPerQuadrant` (1–5); quadrants laid out in a 2×2 grid.

3. **User Journey map:**  
   *“Add a User Journey map template: stages (e.g. Awareness, Consideration, Decision) as columns or rows, with lanes for user actions and touchpoints."*  
   Result: Toolbar User Journey Map button and `create_user_journey_map()`; CollabBot `create_user_journey_map` tool with optional `stages` and `lanes` arrays for custom labels.

4. **Grid of sticky notes:**  
   *“Add a way to create a grid of sticky notes (e.g. 4×4 or 6×6) in one action, with optional labels, so users don't have to add each note manually.”*  
   Result: `create_sticky_notes_grid` tool and UI; takes `rows`, `columns`, optional `labels` (row-major); CollabBot can invoke it when the user asks for a grid of notes.

**You may replace any of the above with your own prompts** — keep 3–5 and the actual prompt text.

---

## Code Analysis

**Rough percentage: AI-generated vs hand-written code**

| Category        | AI-generated (approx.) | Hand-written (approx.) | Notes |
|----------------|------------------------|-------------------------|-------|
| **Overall**    | 100%                   | 0%                       | Cursor-only workflow; all code AI-assisted. |
| **Board Agent**| High                   | Low                     | Route, tools, executor, prompt largely AI-assisted. |
| **Canvas/UI**  | Mixed                  | Mixed                   | Logic and structure often hand-tuned. |
| **Firebase/sync** | Low                 | High                    | Existing patterns; AI used for small edits. |

**How to fill this in:** Use your own estimate, or: (1) Pick 5–10 key files (e.g. `board-agent/route.ts`, `WhiteboardCanvas.tsx`, `executeBoardAgentTools.ts`). (2) For each, estimate % of lines or logic that came from AI suggestions vs written yourself. (3) Average or weight by file importance. If you use `git blame` or “authored by” heuristics, describe the method briefly here.

---

## Strengths & Limitations

**Where AI excelled**

- Boilerplate and repetitive code (tool definitions, switch cases, prop drilling).
- Implementing a clear spec from the PRD (e.g. “create_flowchart with optional labels”).
- Fixing a well-described bug (e.g. “clear_board does nothing” → find hasArgs filter and remove it).
- Turning a short requirements list (e.g. connector UX, SWOT frame height) into targeted code changes.
- Drafting docs (this log, cost analysis) when given the required sections.

**Where AI struggled**

- Keeping the full system in mind when optimizing (e.g. shortening the prompt broke template triggers).
- Knowing project-specific conventions without being told (e.g. “no-args tools must still be executed”).
- Providing numbers that only you have (actual token counts, spend, % of code). It can structure the doc and leave placeholders.

---

## Key Learnings

- **Be explicit in prompts for “when X then Y”** — The model needs clear trigger rules (e.g. “when user says SWOT, call create_swot_analysis”) so behavior is reliable.
- **Validate behavior after big prompt/spec changes** — Condensing the system prompt improved latency but removed template triggers; re-adding explicit instructions fixed it.
- **No-parameter tools need client support** — If the client only runs tools when `args` is present, tools like `clear_board` never run; allow missing/empty args.
- **Use the project document as the source of truth** — When the deliverable format is specified (e.g. “1 page, these 6 sections”), aligning the doc to that format avoids rework.
- **Cost and usage need your data** — AI can structure cost analysis and formulas, but actual spend, token counts, and user metrics must come from your dashboard or logs.

---

*Keep this log to one page when printed; trim or merge bullets if needed.*
