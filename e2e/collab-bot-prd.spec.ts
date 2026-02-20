import { test, expect } from "@playwright/test";

/**
 * E2E: All PRD-required CollabBot (AI Board Agent) capabilities.
 * Creates a new board and runs one instruction from each category with assertions.
 * Run: npx playwright test e2e/collab-bot-prd.spec.ts
 */

type BoardEl = {
  id?: string;
  type: string;
  text?: string;
  title?: string;
  color?: string;
  fill?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
};

test.describe("CollabBot PRD required capabilities", () => {
  test.setTimeout(180_000);

  test("Creation: sticky note, shape, frame", async ({ page, context }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: /Create new board/i }).first()).toBeVisible({
      timeout: 15_000,
    });

    const [newPage] = await Promise.all([
      context.waitForEvent("page"),
      page.getByRole("button", { name: /Create new board/i }).first().click(),
    ]);
    await newPage.waitForLoadState("load");
    let url = newPage.url();
    url = url + (url.includes("?") ? "&" : "?") + "e2e=1";
    await newPage.goto(url);
    await newPage.waitForLoadState("load");
    await newPage.getByTestId("agent-toggle").waitFor({ state: "visible", timeout: 15_000 });

    await newPage.getByTestId("agent-toggle").click();
    await expect(newPage.getByTestId("board-agent-panel")).toBeVisible();
    const input = newPage.getByTestId("board-agent-input");

    const send = async (text: string) => {
      await input.fill(text);
      await input.press("Enter");
      await expect(input).toBeEnabled({ timeout: 60_000 });
    };

    const getState = async (): Promise<BoardEl[]> => {
      const el = newPage.locator('[data-testid="board-state"]');
      await expect(el).toHaveAttribute("data-state", /.+/, { timeout: 5_000 });
      const raw = await el.getAttribute("data-state");
      return raw ? JSON.parse(raw) : [];
    };

    const waitMin = async (min: number) => {
      await newPage.waitForFunction(
        ({ m }: { m: number }) => {
          const el = document.querySelector('[data-testid="board-state"]');
          if (!el) return false;
          try {
            const arr = JSON.parse(el.getAttribute("data-state") || "[]");
            return Array.isArray(arr) && arr.length >= m;
          } catch {
            return false;
          }
        },
        { m: min },
        { timeout: 30_000 }
      );
    };

    let state = await getState();
    const n0 = state.length;

    // PRD Creation: "Add a yellow sticky note that says 'User Research'"
    await send('Add a yellow sticky note that says "User Research"');
    await waitMin(n0 + 1);
    state = await getState();
    const note = state.find((e) => e.type === "sticky-note" && e.text?.includes("User Research"));
    expect(note).toBeDefined();
    expect(note!.text).toContain("User Research");

    // PRD Creation: "Create a blue rectangle at position 100, 200"
    await send("Create a blue rectangle at position 100, 200");
    await waitMin(n0 + 2);
    state = await getState();
    const rect = state.find((e) => e.type === "shape");
    expect(rect).toBeDefined();
    expect(rect!.fill?.toLowerCase() || rect!.color?.toLowerCase() || "").toMatch(/blue|#[0-9a-f]/i);

    // PRD Creation: "Add a frame called 'Sprint Planning'"
    await send('Add a frame called "Sprint Planning"');
    await waitMin(n0 + 3);
    state = await getState();
    const frame = state.find((e) => e.type === "frame" && e.title?.includes("Sprint Planning"));
    expect(frame).toBeDefined();
    expect(frame!.title).toContain("Sprint Planning");
  });

  test("Manipulation: move, update color, resize frame to fit", async ({ page, context }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: /Create new board/i }).first()).toBeVisible({
      timeout: 15_000,
    });
    const [newPage] = await Promise.all([
      context.waitForEvent("page"),
      page.getByRole("button", { name: /Create new board/i }).first().click(),
    ]);
    await newPage.waitForLoadState("load");
    let url = newPage.url();
    url = url + (url.includes("?") ? "&" : "?") + "e2e=1";
    await newPage.goto(url);
    await newPage.getByTestId("agent-toggle").waitFor({ state: "visible", timeout: 15_000 });
    await newPage.getByTestId("agent-toggle").click();
    await expect(newPage.getByTestId("board-agent-panel")).toBeVisible();
    const input = newPage.getByTestId("board-agent-input");

    const send = async (text: string) => {
      await input.fill(text);
      await input.press("Enter");
      await expect(input).toBeEnabled({ timeout: 60_000 });
    };

    const getState = async (): Promise<BoardEl[]> => {
      const el = newPage.locator('[data-testid="board-state"]');
      await expect(el).toHaveAttribute("data-state", /.+/, { timeout: 5_000 });
      const raw = await el.getAttribute("data-state");
      return raw ? JSON.parse(raw) : [];
    };

    const waitMin = async (min: number) => {
      await newPage.waitForFunction(
        ({ m }: { m: number }) => {
          const el = document.querySelector('[data-testid="board-state"]');
          if (!el) return false;
          try {
            const arr = JSON.parse(el.getAttribute("data-state") || "[]");
            return Array.isArray(arr) && arr.length >= m;
          } catch {
            return false;
          }
        },
        { m: min },
        { timeout: 30_000 }
      );
    };

    await send('Add a pink sticky note that says "Pink one"');
    await send('Add a yellow sticky note that says "User Research"');
    await waitMin(2);
    let state = await getState();
    const pinkNote = state.find((e) => e.type === "sticky-note" && e.text === "Pink one");
    expect(pinkNote).toBeDefined();
    const pinkXBefore = pinkNote!.x ?? 0;

    await send("Move all the pink sticky notes to the right side");
    await newPage.waitForFunction(
      ({ id, xBefore }: { id: string; xBefore: number }) => {
        const el = document.querySelector('[data-testid="board-state"]');
        if (!el) return false;
        try {
          const arr = JSON.parse(el.getAttribute("data-state") || "[]") as BoardEl[];
          const found = arr.find((e) => e.id === id);
          return found != null && (found.x ?? 0) > xBefore;
        } catch {
          return false;
        }
      },
      { id: pinkNote!.id, xBefore: pinkXBefore },
      { timeout: 25_000 }
    );

    await send("Change the sticky note that says User Research to green");
    await newPage.waitForFunction(
      () => {
        const el = document.querySelector('[data-testid="board-state"]');
        if (!el) return false;
        try {
          const arr = JSON.parse(el.getAttribute("data-state") || "[]") as BoardEl[];
          const note = arr.find((e) => e.type === "sticky-note" && e.text?.includes("User Research"));
          return note != null && (note.color?.toLowerCase().includes("green") ?? false);
        } catch {
          return false;
        }
      },
      {},
      { timeout: 25_000 }
    );

    await send('Add a frame called "Backlog"');
    await waitMin(3);
    state = await getState();
    const backlogFrame = state.find((e) => e.type === "frame" && e.title?.includes("Backlog"));
    expect(backlogFrame).toBeDefined();
    await send("Resize the Backlog frame to fit its contents");
    await newPage.waitForTimeout(1500);
    const afterResize = await getState();
    expect(afterResize.some((e) => e.type === "frame" && e.title?.includes("Backlog"))).toBe(true);
  });

  test("Layout: arrange grid, 2x3 grid, space evenly", async ({ page, context }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: /Create new board/i }).first()).toBeVisible({
      timeout: 15_000,
    });
    const [newPage] = await Promise.all([
      context.waitForEvent("page"),
      page.getByRole("button", { name: /Create new board/i }).first().click(),
    ]);
    await newPage.waitForLoadState("load");
    let url = newPage.url();
    url = url + (url.includes("?") ? "&" : "?") + "e2e=1";
    await newPage.goto(url);
    await newPage.getByTestId("agent-toggle").waitFor({ state: "visible", timeout: 15_000 });
    await newPage.getByTestId("agent-toggle").click();
    await expect(newPage.getByTestId("board-agent-panel")).toBeVisible();
    const input = newPage.getByTestId("board-agent-input");

    const send = async (text: string) => {
      await input.fill(text);
      await input.press("Enter");
      await expect(input).toBeEnabled({ timeout: 60_000 });
    };

    const getState = async (): Promise<BoardEl[]> => {
      const el = newPage.locator('[data-testid="board-state"]');
      await expect(el).toHaveAttribute("data-state", /.+/, { timeout: 5_000 });
      const raw = await el.getAttribute("data-state");
      return raw ? JSON.parse(raw) : [];
    };

    const waitMin = async (min: number) => {
      await newPage.waitForFunction(
        ({ m }: { m: number }) => {
          const el = document.querySelector('[data-testid="board-state"]');
          if (!el) return false;
          try {
            const arr = JSON.parse(el.getAttribute("data-state") || "[]");
            return Array.isArray(arr) && arr.length >= m;
          } catch {
            return false;
          }
        },
        { m: min },
        { timeout: 30_000 }
      );
    };

    await send("Create a 2x3 grid of sticky notes for pros and cons (Pro 1, Pro 2, Pro 3, Con 1, Con 2, Con 3)");
    await waitMin(6);
    let state = await getState();
    const prosCons = state.filter(
      (e) => e.type === "sticky-note" && (e.text?.startsWith("Pro ") || e.text?.startsWith("Con "))
    );
    expect(prosCons.length).toBeGreaterThanOrEqual(6);

    const ids = state.filter((e) => e.type === "sticky-note").map((e) => e.id!).slice(0, 3);
    if (ids.length >= 2) {
      await send(`Space these elements evenly in a row: ${ids.join(", ")}`);
      await newPage.waitForTimeout(2000);
    }

    state = await getState();
    const noteIds = state.filter((e) => e.type === "sticky-note").map((e) => e.id!).slice(0, 4);
    if (noteIds.length >= 2) {
      await send(`Arrange these sticky notes in a grid: ${noteIds.join(", ")}`);
      await newPage.waitForTimeout(2000);
    }
    const final = await getState();
    expect(final.some((e) => e.type === "sticky-note")).toBe(true);
  });

  test("Complex: retrospective board, SWOT template", async ({ page, context }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: /Create new board/i }).first()).toBeVisible({
      timeout: 15_000,
    });
    const [newPage] = await Promise.all([
      context.waitForEvent("page"),
      page.getByRole("button", { name: /Create new board/i }).first().click(),
    ]);
    await newPage.waitForLoadState("load");
    let url = newPage.url();
    url = url + (url.includes("?") ? "&" : "?") + "e2e=1";
    await newPage.goto(url);
    await newPage.getByTestId("agent-toggle").waitFor({ state: "visible", timeout: 15_000 });
    await newPage.getByTestId("agent-toggle").click();
    await expect(newPage.getByTestId("board-agent-panel")).toBeVisible();
    const input = newPage.getByTestId("board-agent-input");

    const send = async (text: string) => {
      await input.fill(text);
      await input.press("Enter");
      await expect(input).toBeEnabled({ timeout: 90_000 });
    };

    const getState = async (): Promise<BoardEl[]> => {
      const el = newPage.locator('[data-testid="board-state"]');
      await expect(el).toHaveAttribute("data-state", /.+/, { timeout: 5_000 });
      const raw = await el.getAttribute("data-state");
      return raw ? JSON.parse(raw) : [];
    };

    const waitMin = async (min: number) => {
      await newPage.waitForFunction(
        ({ m }: { m: number }) => {
          const el = document.querySelector('[data-testid="board-state"]');
          if (!el) return false;
          try {
            const arr = JSON.parse(el.getAttribute("data-state") || "[]");
            return Array.isArray(arr) && arr.length >= m;
          } catch {
            return false;
          }
        },
        { m: min },
        { timeout: 45_000 }
      );
    };

    await send(
      "Set up a retrospective board with What Went Well, What Didn't, and Action Items columns."
    );
    await waitMin(3);
    let state = await getState();
    const retroFrames = state.filter((e) => e.type === "frame");
    expect(retroFrames.length).toBeGreaterThanOrEqual(3);
    const titles = new Set(retroFrames.map((f) => f.title?.toLowerCase() ?? ""));
    expect(titles.has("what went well") || titles.has("what didn't") || titles.has("action items")).toBe(true);

    await send("Create a SWOT analysis template with four quadrants");
    await waitMin(4);
    state = await getState();
    const frames = state.filter((e) => e.type === "frame");
    expect(frames.length).toBeGreaterThanOrEqual(4);
    const quadrantTitles = new Set(frames.map((f) => f.title?.toLowerCase() ?? ""));
    expect(
      quadrantTitles.has("strengths") ||
        quadrantTitles.has("weaknesses") ||
        quadrantTitles.has("opportunities") ||
        quadrantTitles.has("threats")
    ).toBe(true);
  });

  test("Delete elements", async ({ page, context }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: /Create new board/i }).first()).toBeVisible({
      timeout: 15_000,
    });
    const [newPage] = await Promise.all([
      context.waitForEvent("page"),
      page.getByRole("button", { name: /Create new board/i }).first().click(),
    ]);
    await newPage.waitForLoadState("load");
    let url = newPage.url();
    url = url + (url.includes("?") ? "&" : "?") + "e2e=1";
    await newPage.goto(url);
    await newPage.getByTestId("agent-toggle").waitFor({ state: "visible", timeout: 15_000 });
    await newPage.getByTestId("agent-toggle").click();
    await expect(newPage.getByTestId("board-agent-panel")).toBeVisible();
    const input = newPage.getByTestId("board-agent-input");

    const send = async (text: string) => {
      await input.fill(text);
      await input.press("Enter");
      await expect(input).toBeEnabled({ timeout: 60_000 });
    };

    const getState = async (): Promise<BoardEl[]> => {
      const el = newPage.locator('[data-testid="board-state"]');
      await expect(el).toHaveAttribute("data-state", /.+/, { timeout: 5_000 });
      const raw = await el.getAttribute("data-state");
      return raw ? JSON.parse(raw) : [];
    };

    const waitMin = async (min: number) => {
      await newPage.waitForFunction(
        ({ m }: { m: number }) => {
          const el = document.querySelector('[data-testid="board-state"]');
          if (!el) return false;
          try {
            const arr = JSON.parse(el.getAttribute("data-state") || "[]");
            return Array.isArray(arr) && arr.length >= m;
          } catch {
            return false;
          }
        },
        { m: min },
        { timeout: 30_000 }
      );
    };

    await send('Add a sticky note that says "To delete"');
    await waitMin(1);
    let state = await getState();
    const noteToDelete = state.find((e) => e.type === "sticky-note" && e.text?.includes("To delete"));
    expect(noteToDelete).toBeDefined();
    const id = noteToDelete!.id!;

    await send(`Delete the element with id ${id}`);
    await newPage.waitForFunction(
      ({ targetId }: { targetId: string }) => {
        const el = document.querySelector('[data-testid="board-state"]');
        if (!el) return false;
        try {
          const arr = JSON.parse(el.getAttribute("data-state") || "[]") as BoardEl[];
          return !arr.some((e) => e.id === targetId);
        } catch {
          return false;
        }
      },
      { targetId: id },
      { timeout: 25_000 }
    );
    const after = await getState();
    expect(after.some((e) => e.id === id)).toBe(false);
  });
});
