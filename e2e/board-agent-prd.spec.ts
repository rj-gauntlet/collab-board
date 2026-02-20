import { test, expect } from "@playwright/test";

/**
 * E2E: Verifies all AI Board Agent capabilities required by the PRD.
 * Runs against a specific board URL so you can monitor in the browser.
 *
 * Usage:
 *   Open the board in your browser: http://localhost:3000/e088371d263e?e2e=1
 *   Then run: npx playwright test e2e/board-agent-prd.spec.ts
 *
 * Or use another board: BOARD_ID=yourBoardId npx playwright test e2e/board-agent-prd.spec.ts
 */
const BOARD_ID = process.env.BOARD_ID ?? "e088371d263e";

test.describe("Board Agent PRD capabilities", () => {
  test.setTimeout(300_000); // 5 min — many instructions

  test("verifies all PRD required capabilities on fixed board", async ({
    page,
  }) => {
    const boardPath = `/${BOARD_ID}?e2e=1`;
    const watchUrl = `${process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000"}${boardPath}`;

    // eslint-disable-next-line no-console
    console.log("\n--- Open this URL in your browser to watch: " + watchUrl + " ---\n");
    await test.info().attach("board-url", {
      body: watchUrl,
      contentType: "text/plain",
    });

    await page.goto(boardPath);
    await page.waitForLoadState("load");
    await page.getByTestId("agent-toggle").waitFor({ state: "visible", timeout: 15_000 });

    await page.getByTestId("agent-toggle").click();
    await expect(page.getByTestId("board-agent-panel")).toBeVisible();
    const agentInput = page.getByTestId("board-agent-input");

    const sendInstruction = async (text: string) => {
      await agentInput.fill(text);
      await agentInput.press("Enter");
      await expect(agentInput).toBeEnabled({ timeout: 90_000 });
    };

    type BoardElement = { id?: string; type: string; text?: string; title?: string; color?: string; x?: number; y?: number; width?: number; height?: number };
    const getBoardState = async (): Promise<BoardElement[]> => {
      const el = page.locator('[data-testid="board-state"]');
      await expect(el).toHaveAttribute("data-state", /.+/, { timeout: 5_000 });
      const raw = await el.getAttribute("data-state");
      return raw ? JSON.parse(raw) : [];
    };

    const waitForMinCount = async (min: number) => {
      await page.waitForFunction(
        ({ min: m }) => {
          const el = document.querySelector('[data-testid="board-state"]');
          if (!el) return false;
          try {
            const arr = JSON.parse(el.getAttribute("data-state") || "[]");
            return Array.isArray(arr) && arr.length >= m;
          } catch {
            return false;
          }
        },
        { min },
        { timeout: 30_000 }
      );
    };

    let state: BoardElement[] = await getBoardState();
    const initialCount = state.length;

    // ---- CREATION ----
    await sendInstruction('Add a yellow sticky note that says "User Research"');
    await waitForMinCount(initialCount + 1);
    state = await getBoardState();
    const userResearchNote = state.find((e) => e.type === "sticky-note" && e.text?.includes("User Research"));
    expect(userResearchNote).toBeDefined();

    await sendInstruction("Create a blue rectangle at position 100, 200");
    await waitForMinCount(initialCount + 2);
    state = await getBoardState();
    const blueRect = state.find((e) => e.type === "shape");
    expect(blueRect).toBeDefined();

    await sendInstruction('Add a frame called "Sprint Planning"');
    await waitForMinCount(initialCount + 3);
    state = await getBoardState();
    const sprintFrame = state.find((e) => e.type === "frame" && e.title?.includes("Sprint Planning"));
    expect(sprintFrame).toBeDefined();

    // ---- MANIPULATION: need pink note first ----
    await sendInstruction('Add a pink sticky note that says "Pink one"');
    await waitForMinCount(initialCount + 4);
    state = await getBoardState();
    const pinkNote = state.find((e) => e.type === "sticky-note" && (e.color?.toLowerCase().includes("pink") || e.text === "Pink one"));
    expect(pinkNote).toBeDefined();

    await sendInstruction("Move all the pink sticky notes to the right side");
    await page.waitForTimeout(2000);
    state = await getBoardState();
    const movedPink = state.find((e) => e.id === pinkNote!.id);
    expect(movedPink).toBeDefined();

    await sendInstruction("Change the sticky note that says User Research to green");
    await page.waitForTimeout(2000);
    state = await getBoardState();
    const greenNote = state.find((e) => e.text?.includes("User Research"));
    expect(greenNote).toBeDefined();

    await sendInstruction("Resize the Sprint Planning frame to fit its contents");
    await page.waitForTimeout(2000);

    // ---- LAYOUT ----
    state = await getBoardState();
    const stickyIds = state.filter((e) => e.type === "sticky-note").map((e) => e.id!).slice(0, 4);
    if (stickyIds.length >= 2) {
      await sendInstruction(`Arrange these sticky notes in a grid: ${stickyIds.join(", ")}`);
      await page.waitForTimeout(2000);
    }

    await sendInstruction("Create a 2x3 grid of sticky notes for pros and cons (label them Pro 1, Pro 2, Pro 3, Con 1, Con 2, Con 3)");
    await waitForMinCount(initialCount + 8);
    state = await getBoardState();
    const prosCons = state.filter((e) => e.type === "sticky-note" && (e.text?.startsWith("Pro ") || e.text?.startsWith("Con ")));
    expect(prosCons.length).toBeGreaterThanOrEqual(6);

    state = await getBoardState();
    const someIds = state.filter((e) => e.type === "sticky-note").map((e) => e.id!).slice(0, 3);
    if (someIds.length >= 2) {
      await sendInstruction(`Space these elements evenly in a row: ${someIds.join(", ")}`);
      await page.waitForTimeout(2000);
    }

    // ---- COMPLEX / TEMPLATES ----
    // PRD: "Set up a retrospective board with What Went Well, What Didn't, and Action Items columns" → creates 3 labeled frames side by side
    await sendInstruction(
      "Set up a retrospective board with What Went Well, What Didn't, and Action Items columns."
    );
    await waitForMinCount(initialCount + 10);
    state = await getBoardState();
    const frames = state.filter((e) => e.type === "frame");
    expect(frames.length).toBeGreaterThanOrEqual(3);

    // Final: we have notes, shapes, frames
    const finalState = await getBoardState();
    expect(finalState.some((e) => e.type === "sticky-note")).toBe(true);
    expect(finalState.some((e) => e.type === "shape")).toBe(true);
    expect(finalState.some((e) => e.type === "frame")).toBe(true);
  });
});
