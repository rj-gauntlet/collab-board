"use server";

import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai"; // Import the creator function

export interface ThemeResult {
  title: string;
  summary: string;
}

// 1. Corrected Provider Initialization
const openaiProvider = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY, 
});

export async function clusterNotesIntoThemes(
  noteTexts: string[]
): Promise<ThemeResult[]> {
  if (noteTexts.length === 0) return [];

  const ideasText = noteTexts
    .filter((t) => t.trim().length > 0)
    .map((t, i) => `${i + 1}. ${t.trim()}`)
    .join("\n");

  if (ideasText.length === 0) return [];

  try {
    const { text } = await generateText({
      // 2. Using the corrected provider instance
      model: openaiProvider("gpt-4o-mini"),
      system: `You are a helpful assistant that categorizes brainstorm ideas into logical themes.
Respond ONLY with a JSON array of 3-4 themes. Each theme has "title" and "summary".
Example: [{"title":"Design","summary":"Focuses on the visual elements."}]`,
      prompt: `Categorize these brainstorm ideas: \n${ideasText}`,
    });

    // 3. Robust JSON Parsing
    let jsonStr = text.trim();
    const jsonMatch = jsonStr.match(/\[[\s\S]*\]/);
    if (jsonMatch) jsonStr = jsonMatch[0];
    
    const parsed = JSON.parse(jsonStr) as ThemeResult[];
    return Array.isArray(parsed) ? parsed.slice(0, 4) : [];
    
  } catch (error) {
    console.error("AI Action Error:", error);
    return [{
      title: "Analysis Result",
      summary: "The AI was able to process your notes, but the formatting was unexpected. Please try again."
    }];
  }
}