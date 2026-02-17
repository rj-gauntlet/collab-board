"use server";

import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

const THEME_COLORS = [
  "#a78bfa", // purple
  "#c084fc", // violet
  "#e879f9", // fuchsia
  "#d8b4fe", // light purple
];

export interface ThemeResult {
  title: string;
  summary: string;
}

export async function clusterNotesIntoThemes(
  noteTexts: string[]
): Promise<ThemeResult[]> {
  if (noteTexts.length === 0) {
    return [];
  }

  const ideasText = noteTexts
    .filter((t) => t.trim().length > 0)
    .map((t, i) => `${i + 1}. ${t.trim()}`)
    .join("\n");

  if (ideasText.length === 0) {
    return [];
  }

  const { text } = await generateText({
    model: openai("gpt-4o-mini"),
    system: `You are a helpful assistant that categorizes brainstorm ideas into logical themes.
Respond with a JSON array of 3-4 themes. Each theme has "title" (short, 2-5 words) and "summary" (1-2 sentences describing the theme).
Output ONLY valid JSON, no markdown or extra text. Example: [{"title":"Theme A","summary":"..."},{"title":"Theme B","summary":"..."}]`,
    prompt: `Categorize these brainstorm ideas into 3-4 logical themes. Return a JSON array of objects with "title" and "summary" fields.

Ideas:
${ideasText}`,
  });

  try {
    let jsonStr = text.trim();
    const jsonMatch = jsonStr.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }
    const parsed = JSON.parse(jsonStr) as ThemeResult[];
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.slice(0, 4);
    }
  } catch {
    // Fallback: return a single theme with raw text
    return [
      {
        title: "Themes",
        summary: text.slice(0, 200) || "Could not parse themes.",
      },
    ];
  }

  return [];
}
