import { test, expect } from "@playwright/test";

/**
 * E2E: Create a board, use the AI Board Agent to create and delete elements,
 * and verify the board state. Uses all object types: sticky note, shapes (rect/circle/triangle),
 * frame, connector; then deletes some and verifies.
 *
 * Run with: npx playwright test e2e/board-agent.spec.ts
 * To watch the board while the test runs, open the URL printed in the test output (with ?e2e=1).
 */
test.describe("Board Agent E2E", () => {
  test.setTimeout(120_000);

  test("creates board, uses agent to create/delete elements, verifies state", async ({
    page,
    context,
  }) => {
    // 1. Home: wait for anonymous sign-in (localhost:3000 only), then create a new board
    await page.goto("/");
    await expect(
      page.getByRole("button", { name: /Create new board/i })
    ).toBeVisible({ timeout: 15_000 });

    const [newPage] = await Promise.all([
      context.waitForEvent("page"),
      page.getByRole("button", { name: /Create new board/i }).click(),
    ]);

    await newPage.waitForLoadState("domcontentloaded");
    let boardUrl = newPage.url();
    const e2eBoardUrl =
      boardUrl + (boardUrl.includes("?") ? "&" : "?") + "e2e=1";
    await newPage.goto(e2eBoardUrl);
    // Don't use "networkidle" — Firebase/real-time connections prevent it. Wait for the board UI instead.
    await newPage.waitForLoadState("load");
    await newPage.getByTestId("agent-toggle").waitFor({ state: "visible", timeout: 15_000 });

    // Share URL so you can open it in a browser to monitor activity
    // eslint-disable-next-line no-console
    console.log("\n--- Board URL (open in browser to watch): " + e2eBoardUrl + " ---\n");
    await test.info().attach("board-url", {
      body: e2eBoardUrl,
      contentType: "text/plain",
    });

    const boardPage = newPage;

    // 2. Open Agent panel and ensure we're on the board
    await expect(boardPage.getByTestId("agent-toggle")).toBeVisible({ timeout: 10_000 });
    await boardPage.getByTestId("agent-toggle").click();
    await expect(boardPage.getByTestId("board-agent-panel")).toBeVisible();
    const agentInput = boardPage.getByTestId("board-agent-input");

    const sendInstruction = async (text: string) => {
      await agentInput.fill(text);
      await agentInput.press("Enter");
      // Wait for streaming to finish (input re-enabled)
      await expect(agentInput).toBeEnabled({ timeout: 60_000 });
    };

    const getBoardState = async (): Promise<Array<{ type: string; id?: string }>> => {
      const el = boardPage.locator('[data-testid="board-state"]');
      await expect(el).toHaveAttribute("data-state", /.+/, { timeout: 5_000 });
      const raw = await el.getAttribute("data-state");
      return raw ? JSON.parse(raw) : [];
    };

    const waitForBoardStateCount = async (minCount: number) => {
      await boardPage.waitForFunction(
        ({ min }) => {
          const el = document.querySelector('[data-testid="board-state"]');
          if (!el) return false;
          const raw = el.getAttribute("data-state");
          if (!raw) return false;
          try {
            const arr = JSON.parse(raw);
            return Array.isArray(arr) && arr.length >= min;
          } catch {
            return false;
          }
        },
        { min: minCount },
        { timeout: 30_000 }
      );
    };

    const waitForBoardStateTypes = async (types: string[]) => {
      await boardPage.waitForFunction(
        ({ types: t }) => {
          const el = document.querySelector('[data-testid="board-state"]');
          if (!el) return false;
          const raw = el.getAttribute("data-state");
          if (!raw) return false;
          try {
            const arr = JSON.parse(raw) as Array<{ type: string }>;
            if (!Array.isArray(arr)) return false;
            const have = new Set(arr.map((x) => x.type));
            return t.every((type) => have.has(type));
          } catch {
            return false;
          }
        },
        { types },
        { timeout: 30_000 }
      );
    };

    // 3. Create one sticky note
    await sendInstruction(
      "Add a yellow sticky note that says User Research"
    );
    await waitForBoardStateCount(1);
    let state = await getBoardState();
    expect(state.some((e) => e.type === "sticky-note")).toBe(true);

    // 4. Create shapes: rect, circle, triangle
    await sendInstruction(
      "Add a blue rectangle, a green circle, and a red triangle on the board"
    );
    await waitForBoardStateTypes(["sticky-note", "shape"]);
    await waitForBoardStateCount(4);
    state = await getBoardState();
    const shapes = state.filter((e) => e.type === "shape");
    expect(shapes.length).toBeGreaterThanOrEqual(3);

    // 5. Create a frame
    await sendInstruction('Add a frame titled "Sprint 1"');
    await waitForBoardStateTypes(["sticky-note", "shape", "frame"]);
    state = await getBoardState();
    expect(state.some((e) => e.type === "frame")).toBe(true);

    // 6. Create a connector between two elements (use IDs from current state)
    const ids = state.map((e) => e.id).filter(Boolean) as string[];
    if (ids.length >= 2) {
      await sendInstruction(
        `Draw an arrow connector from the element ${ids[0]} to ${ids[1]} with label "link"`
      );
      await waitForBoardStateTypes(["sticky-note", "shape", "frame", "connector"]);
    }

    state = await getBoardState();
    const countAfterCreates = state.length;
    expect(countAfterCreates).toBeGreaterThanOrEqual(4);

    // 7. Delete some elements (e.g. delete the connector and one shape)
    const toDelete = state
      .filter((e) => e.type === "connector" || e.type === "shape")
      .slice(0, 2)
      .map((e) => e.id)
      .filter(Boolean);
    if (toDelete.length > 0) {
      await sendInstruction(
        `Delete the elements with these IDs: ${toDelete.join(", ")}`
      );
      await boardPage.waitForFunction(
        ({ prevCount }) => {
          const el = document.querySelector('[data-testid="board-state"]');
          if (!el) return false;
          const raw = el.getAttribute("data-state");
          if (!raw) return false;
          try {
            const arr = JSON.parse(raw);
            return Array.isArray(arr) && arr.length < prevCount;
          } catch {
            return false;
          }
        },
        { prevCount: countAfterCreates },
        { timeout: 30_000 }
      );
      const stateAfterDelete = await getBoardState();
      expect(stateAfterDelete.length).toBeLessThan(countAfterCreates);
    }

    // 8. Final state: we should still have sticky-note and frame at least
    const finalState = await getBoardState();
    expect(finalState.some((e) => e.type === "sticky-note")).toBe(true);
    expect(finalState.some((e) => e.type === "frame")).toBe(true);
  });
});
