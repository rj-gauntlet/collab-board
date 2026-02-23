# E2E tests (Playwright)

## Setup

1. Ensure `.env.local` has `OPENAI_API_KEY` (and Firebase config if not using defaults) so the Board Agent can call the API.
2. Install Playwright browsers once:

```bash
npx playwright install
```

## Controlling the board and CollabBot from tests

Tests can **control the board**, **send messages to CollabBot**, and **read board state and bot replies** using shared helpers and the control spec.

### Board control spec (run with env vars)

Run a single instruction and get back **board state** and **CollabBot’s reply** as JSON and text in the test report and console:

```bash
# New board, default instruction: "What is on the board?"
npx playwright test e2e/board-control.spec.ts

# Custom instruction
E2E_INSTRUCTION="Add a red circle and a blue sticky note" npx playwright test e2e/board-control.spec.ts

# Existing board (replace with a real board ID)
E2E_BOARD_ID=yourBoardId E2E_INSTRUCTION="What is on the board?" npx playwright test e2e/board-control.spec.ts
```

Output is attached as `board-control-report.json` (full state + reply) and `board-control-summary.txt`, and printed to the console. Use this to drive the board from the agent or scripts.

### Shared helpers (`e2e/helpers/board-and-agent.ts`)

Use these in any spec to control the board and CollabBot:

| Helper | Description |
|--------|-------------|
| `ensureE2EMode(page)` | Ensure the page URL has `?e2e=1` so board state is exposed. |
| `getBoardState(page)` | Return the current board state as an array of elements (requires `?e2e=1`). |
| `openCollabBot(page)` | Click the CollabBot toggle to open the agent panel. |
| `sendToCollabBot(page, text, options?)` | Type a message and press Enter; wait until the bot finishes replying. |
| `getLastCollabBotReply(page)` | Return the text of the last CollabBot (assistant) message. |
| `waitForBoardStateCount(page, minCount, timeout?)` | Wait until the board has at least `minCount` elements. |
| `waitForBoardStateTypes(page, types[], timeout?)` | Wait until the board has at least one element of each type. |

**Test IDs** used by the helpers (and available for your own selectors):

- `board-state` — hidden element with `data-state` JSON of the board (when `?e2e=1`).
- `agent-toggle` — button to open/close CollabBot.
- `board-agent-panel` — CollabBot panel container.
- `board-agent-input` — text input for sending messages.
- `board-agent-messages` — scrollable messages area.
- `board-agent-message-user` / `board-agent-message-assistant` — each chat message.
- `board-agent-message-assistant-text` — text content of an assistant message (use last one for latest reply).
- `board-agent-streaming` — visible while CollabBot is “thinking…”.

### Example: custom spec using helpers

```ts
import { test, expect } from "@playwright/test";
import { getBoardState, openCollabBot, sendToCollabBot, getLastCollabBotReply } from "./helpers/board-and-agent";

test("ask what is on the board and assert reply lists all", async ({ page }) => {
  await page.goto("/someBoardId?e2e=1");
  await openCollabBot(page);
  await sendToCollabBot(page, "What is on the board?");
  const state = await getBoardState(page);
  const reply = await getLastCollabBotReply(page);
  expect(state.length).toBeGreaterThan(0);
  expect(reply).toContain("board has");
});
```

## Run the Board Agent E2E test

```bash
npm run test:e2e
```

Or run only the board-agent test:

```bash
npx playwright test e2e/board-agent.spec.ts
```

When the test runs, it creates a new board and **prints the board URL** to the console so you can open it in a browser and watch the agent create/delete elements in real time. Look for:

```
--- Board URL (open in browser to watch): http://localhost:3000/<boardId>?e2e=1 ---
```

Open that URL in another tab while the test runs to monitor activity. The `?e2e=1` query enables board-state exposure for assertions.

## What the board-agent test does

1. Goes to the home page and waits for sign-in (anonymous on localhost).
2. Clicks "Create new board" and uses the new tab.
3. Opens the Agent panel and sends instructions to create:
   - A yellow sticky note ("User Research")
   - Shapes: blue rectangle, green circle, red triangle
   - A frame titled "Sprint 1"
   - A connector (arrow) between two elements
4. Sends an instruction to delete some elements (connector and a shape).
5. Asserts that the board state (exposed via `?e2e=1`) reflects the expected types and counts.

## Run with UI

```bash
npm run test:e2e:ui
```
