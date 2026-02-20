# E2E tests (Playwright)

## Setup

1. Ensure `.env.local` has `OPENAI_API_KEY` (and Firebase config if not using defaults) so the Board Agent can call the API.
2. Install Playwright browsers once:

```bash
npx playwright install
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

## What the test does

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
