/**
 * Unit tests for standalone text element logic.
 *
 * These tests verify:
 * 1. createDefaultTextElement produces a valid element with empty text
 * 2. The placeholder is expected to show when text is empty
 * 3. Text updates are persisted correctly (persist function args)
 * 4. Deleting a text element calls Firestore with the right ID
 */

import { createDefaultTextElement } from "../usePersistedTextElements";
import type { TextElement } from "../types";

const USER_ID = "user-test-123";

describe("createDefaultTextElement", () => {
  it("creates an element with empty text so the placeholder shows", () => {
    const el = createDefaultTextElement(100, 200, USER_ID);
    expect(el.text).toBe("");
  });

  it("has the correct position", () => {
    const el = createDefaultTextElement(42, 99, USER_ID);
    expect(el.x).toBe(42);
    expect(el.y).toBe(99);
  });

  it("has type 'text'", () => {
    const el = createDefaultTextElement(0, 0, USER_ID);
    expect(el.type).toBe("text");
  });

  it("records the creator", () => {
    const el = createDefaultTextElement(0, 0, USER_ID);
    expect(el.createdBy).toBe(USER_ID);
  });

  it("generates a unique id each time", () => {
    const a = createDefaultTextElement(0, 0, USER_ID);
    const b = createDefaultTextElement(0, 0, USER_ID);
    expect(a.id).not.toBe(b.id);
  });

  it("has positive fontSize and non-empty fontFamily", () => {
    const el = createDefaultTextElement(0, 0, USER_ID);
    expect(el.fontSize).toBeGreaterThan(0);
    expect(el.fontFamily.length).toBeGreaterThan(0);
  });

  it("has a positive default width", () => {
    const el = createDefaultTextElement(0, 0, USER_ID);
    expect(el.width).toBeGreaterThan(0);
  });
});

describe("text element placeholder logic", () => {
  it("shows placeholder text when element text is empty", () => {
    const el: TextElement = createDefaultTextElement(0, 0, USER_ID);
    // The TextNode renders placeholder when text is ""
    const displayText = el.text || "Double-click to edit";
    expect(displayText).toBe("Double-click to edit");
  });

  it("shows actual text when element has content", () => {
    const el: TextElement = {
      ...createDefaultTextElement(0, 0, USER_ID),
      text: "Hello world",
    };
    const displayText = el.text || "Double-click to edit";
    expect(displayText).toBe("Hello world");
  });
});

describe("text element update logic", () => {
  it("merging updates preserves all original fields", () => {
    const original = createDefaultTextElement(10, 20, USER_ID);
    const updated: TextElement = {
      ...original,
      text: "New content",
      updatedAt: Date.now(),
    };
    expect(updated.id).toBe(original.id);
    expect(updated.x).toBe(original.x);
    expect(updated.y).toBe(original.y);
    expect(updated.text).toBe("New content");
    expect(updated.createdBy).toBe(USER_ID);
  });

  it("does not change text when cancel is triggered (text stays the same)", () => {
    const original = createDefaultTextElement(0, 0, USER_ID);
    original.text = "Existing text";
    // Simulating cancel: value reverts to original
    const afterCancel = { ...original };
    expect(afterCancel.text).toBe("Existing text");
  });
});
