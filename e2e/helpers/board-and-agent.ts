import type { Page } from "@playwright/test";

/** Board element shape exposed by the app when ?e2e=1 (data-state JSON). */
export type BoardStateElement = {
  id?: string;
  type: string;
  text?: string;
  title?: string;
  color?: string;
  fill?: string;
  kind?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  parentFrameId?: string;
  fromId?: string;
  toId?: string;
};

const BOARD_STATE_SELECTOR = '[data-testid="board-state"]';
const E2E_QUERY = "e2e=1";

/**
 * Ensure the page is on a board URL with ?e2e=1 so board state is exposed.
 * If the current URL doesn't have e2e=1, appends it.
 */
export async function ensureE2EMode(page: Page): Promise<void> {
  const url = page.url();
  if (url.includes(E2E_QUERY)) return;
  const separator = url.includes("?") ? "&" : "?";
  await page.goto(url + separator + E2E_QUERY);
}

/**
 * Get the current board state from the page (requires ?e2e=1).
 */
export async function getBoardState(page: Page): Promise<BoardStateElement[]> {
  const raw = await waitForBoardStateAttribute(page);
  return raw ? JSON.parse(raw) : [];
}

async function waitForBoardStateAttribute(page: Page, timeout = 10_000): Promise<string> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const raw = await page.locator(BOARD_STATE_SELECTOR).getAttribute("data-state");
    if (raw != null) return raw;
    await page.waitForTimeout(100);
  }
  return (await page.locator(BOARD_STATE_SELECTOR).getAttribute("data-state")) ?? "[]";
}

/**
 * Open the CollabBot panel (click the agent toggle). Idempotent if already open.
 */
export async function openCollabBot(page: Page): Promise<void> {
  const panel = page.getByTestId("board-agent-panel");
  const toggle = page.getByTestId("agent-toggle");
  await toggle.waitFor({ state: "visible", timeout: 15_000 });
  const visible = await panel.isVisible().catch(() => false);
  if (!visible) await toggle.click();
  await panel.waitFor({ state: "visible", timeout: 5_000 });
}

/**
 * Send a message to CollabBot and wait until it has finished replying (streaming done).
 */
export async function sendToCollabBot(
  page: Page,
  text: string,
  options?: { timeout?: number }
): Promise<void> {
  const agentInput = page.getByTestId("board-agent-input");
  await agentInput.fill(text);
  await agentInput.press("Enter");
  const timeout = options?.timeout ?? 90_000;
  await page.getByTestId("board-agent-streaming").waitFor({ state: "hidden", timeout }).catch(() => {});
  await agentInput.waitFor({ state: "visible", timeout: 2_000 });
  await page.waitForFunction(
    ({ selector }) => {
      const input = document.querySelector(selector);
      return input && !(input as HTMLInputElement).disabled;
    },
    { selector: '[data-testid="board-agent-input"]' },
    { timeout }
  );
}

/**
 * Get the text of the last CollabBot (assistant) message.
 */
export async function getLastCollabBotReply(page: Page): Promise<string> {
  const assistantMessages = page.getByTestId("board-agent-message-assistant-text");
  const count = await assistantMessages.count();
  if (count === 0) return "";
  const last = assistantMessages.nth(count - 1);
  await last.waitFor({ state: "visible", timeout: 5_000 });
  return last.innerText();
}

/**
 * Wait until the board state has at least minCount elements.
 */
export async function waitForBoardStateCount(
  page: Page,
  minCount: number,
  timeout = 30_000
): Promise<void> {
  await page.waitForFunction(
    ({ selector, min }) => {
      const el = document.querySelector(selector);
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
    { selector: BOARD_STATE_SELECTOR, min: minCount },
    { timeout }
  );
}

/**
 * Wait until the board state includes at least one element of each given type.
 */
export async function waitForBoardStateTypes(
  page: Page,
  types: string[],
  timeout = 30_000
): Promise<void> {
  await page.waitForFunction(
    ({ selector, types: t }) => {
      const el = document.querySelector(selector);
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
    { selector: BOARD_STATE_SELECTOR, types },
    { timeout }
  );
}
