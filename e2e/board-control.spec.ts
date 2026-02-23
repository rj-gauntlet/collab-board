import { test, expect } from "@playwright/test";
import {
  getBoardState,
  getLastCollabBotReply,
  openCollabBot,
  sendToCollabBot,
  ensureE2EMode,
} from "./helpers/board-and-agent";

/**
 * Control spec: run with an instruction so the agent (or you) can drive the board,
 * talk to CollabBot, and read board state + bot reply.
 *
 * Usage:
 *   # Use a new board (create from home)
 *   E2E_INSTRUCTION="What is on the board?" npx playwright test e2e/board-control.spec.ts
 *
 *   # Use an existing board (must exist and be loadable)
 *   E2E_BOARD_ID=abc123 E2E_INSTRUCTION="Add a red circle" npx playwright test e2e/board-control.spec.ts
 *
 *   # Default instruction if E2E_INSTRUCTION is not set: "What is on the board?"
 *
 * Output: board state and last CollabBot reply are attached to the test report and printed.
 */
const INSTRUCTION = process.env.E2E_INSTRUCTION ?? "What is on the board?";
const BOARD_ID = process.env.E2E_BOARD_ID;

test.describe("Board control (E2E_INSTRUCTION / E2E_BOARD_ID)", () => {
  test.setTimeout(120_000);

  test("run instruction, then report board state and CollabBot reply", async ({
    page,
    context,
  }) => {
    const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

    if (BOARD_ID) {
      await page.goto(`${baseUrl}/${BOARD_ID}?e2e=1`);
    } else {
      await page.goto(baseUrl + "/");
      await expect(
        page.getByRole("button", { name: /Create new board/i })
      ).toBeVisible({ timeout: 15_000 });
      const [newPage] = await Promise.all([
        context.waitForEvent("page"),
        page.getByRole("button", { name: /Create new board/i }).click(),
      ]);
      await newPage.waitForLoadState("domcontentloaded");
      let boardUrl = newPage.url();
      const e2eUrl = boardUrl + (boardUrl.includes("?") ? "&" : "?") + "e2e=1";
      await newPage.goto(e2eUrl);
      await newPage.waitForLoadState("load");
      // Use the new tab as the main page for the rest of the test
      await newPage.bringToFront();
      const boardPage = newPage;
      await ensureE2EMode(boardPage);
      await openCollabBot(boardPage);
      await sendToCollabBot(boardPage, INSTRUCTION);
      const stateAfter = await getBoardState(boardPage);
      const reply = await getLastCollabBotReply(boardPage);

      const report = {
        instruction: INSTRUCTION,
        boardUrl: e2eUrl,
        boardStateElementCount: stateAfter.length,
        boardState: stateAfter,
        collabBotReply: reply,
      };

      const reportJson = JSON.stringify(report, null, 2);
      const shortReport = `Instruction: ${INSTRUCTION}\nBoard elements: ${stateAfter.length}\nCollabBot reply: ${reply.slice(0, 200)}${reply.length > 200 ? "…" : ""}`;

      await test.info().attach("board-control-report.json", {
        body: reportJson,
        contentType: "application/json",
      });
      await test.info().attach("board-control-summary.txt", {
        body: shortReport,
        contentType: "text/plain",
      });
      // eslint-disable-next-line no-console
      console.log("\n--- Board control report ---\n" + shortReport + "\n---\n");
      return;
    }

    await page.waitForLoadState("load");
    await ensureE2EMode(page);
    await openCollabBot(page);
    await sendToCollabBot(page, INSTRUCTION);
    const stateAfter = await getBoardState(page);
    const reply = await getLastCollabBotReply(page);

    const report = {
      instruction: INSTRUCTION,
      boardId: BOARD_ID,
      boardStateElementCount: stateAfter.length,
      boardState: stateAfter,
      collabBotReply: reply,
    };

    const reportJson = JSON.stringify(report, null, 2);
    const shortReport = `Instruction: ${INSTRUCTION}\nBoard elements: ${stateAfter.length}\nCollabBot reply: ${reply.slice(0, 200)}${reply.length > 200 ? "…" : ""}`;

    await test.info().attach("board-control-report.json", {
      body: reportJson,
      contentType: "application/json",
    });
    await test.info().attach("board-control-summary.txt", {
      body: shortReport,
      contentType: "text/plain",
    });
    // eslint-disable-next-line no-console
    console.log("\n--- Board control report ---\n" + shortReport + "\n---\n");
  });
});
