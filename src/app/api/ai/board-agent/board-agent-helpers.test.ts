/**
 * Reproduces the "what's on the board" behavior: when the user asks and we have
 * multiple elements, the reply must list every element, not just one (e.g. not
 * only "a red circle").
 */
import { isAskingWhatIsOnBoard, formatBoardStateList } from "./board-agent-helpers";
import type { BoardStateSummary } from "@/features/ai-agent/board-agent-types";

describe("isAskingWhatIsOnBoard", () => {
  it("detects 'What is on the board?'", () => {
    expect(isAskingWhatIsOnBoard("What is on the board?")).toBe(true);
  });

  it("detects 'What's on the board?'", () => {
    expect(isAskingWhatIsOnBoard("What's on the board?")).toBe(true);
  });

  it("detects 'what is currently on the board'", () => {
    expect(isAskingWhatIsOnBoard("what is currently on the board")).toBe(true);
  });

  it("does not detect unrelated messages", () => {
    expect(isAskingWhatIsOnBoard("Add a red circle")).toBe(false);
    expect(isAskingWhatIsOnBoard("Delete the frame")).toBe(false);
  });
});

describe("formatBoardStateList", () => {
  /** Same scenario as the bug: 4 elements (red circle, blue rect, 2 sticky notes). */
  const fourElements: BoardStateSummary[] = [
    { id: "s1", type: "shape", x: 0, y: 0, width: 80, height: 80, fill: "red", kind: "circle" },
    { id: "s2", type: "shape", x: 100, y: 0, width: 100, height: 60, fill: "blue", kind: "rectangle" },
    { id: "n1", type: "sticky-note", text: "Sticky Note 2", x: 0, y: 100, width: 160, height: 120, color: "pink" },
    { id: "n2", type: "sticky-note", text: "Double-click to edit", x: 200, y: 100, width: 160, height: 120, color: "yellow" },
  ];

  it("lists all 4 elements when board has red circle, blue rectangle, and 2 sticky notes", () => {
    const reply = formatBoardStateList(fourElements);
    expect(reply).toContain("red");
    expect(reply).toContain("circle");
    expect(reply).toContain("blue");
    expect(reply).toContain("rectangle");
    expect(reply).toContain("pink");
    expect(reply).toContain("Sticky Note 2");
    expect(reply).toContain("yellow");
    expect(reply).toContain("Double-click to edit");
    expect(reply).toMatch(/\(1\).*\(2\).*\(3\).*\(4\)/);
    expect(reply).toContain("The board has:");
  });

  it("returns exactly one sentence per element (no truncation to only first item)", () => {
    const reply = formatBoardStateList(fourElements);
    const count = (reply.match(/\(\d+\)/g) ?? []).length;
    expect(count).toBe(4);
  });

  it("returns 'The board is empty.' when state is empty", () => {
    expect(formatBoardStateList([])).toBe("The board is empty.");
  });
});
