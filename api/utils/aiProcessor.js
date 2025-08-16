import { GoogleGenerativeAI } from "@google/generative-ai";
import { retryAsync } from "./retryHelper.js";
import dJSON from "dirty-json";

export async function processQuestionsWithAI(text) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("API key not configured.");
  }
  try {
    return await retryAsync(() => callGeminiAPI(text));
  } catch (error) {
    console.error("Fatal error after multiple retries:", error.message);
    throw new Error("Unable to generate questions after multiple attempts.");
  }
}

async function callGeminiAPI(text) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

  const prompt = `
    You are a meticulous data extraction engine. Your task is to analyze the provided text chunk and convert all questions into a PERFECTLY FORMED JSON ARRAY.

    CRITICAL DIRECTIVES:
    1.  Your entire output MUST be a single, valid JSON array. Do NOT use markdown like \`\`\`json or other text.
    2.  If the text chunk contains no questions, return an empty array [].
    3.  Self-Correct: Before outputting, you MUST validate your own work to ensure the result is syntactically perfect JSON.

    ---
    **SCHEMA for "numerical" questions:**
    { "type": "numerical", "original_text": "...", "question_template": "...", "variables": {...}, "correct_answer_formula": "...", "distractor_formulas": [...], "category": "..." }
    ---
    **SCHEMA for "conceptual" questions:**
    { "type": "conceptual", "original_text": "...", "question_template": null, "details": { "correct_answer": "...", "distractors": [...] }, "category": "..." }
    ---
    Text Chunk to Analyze:
    ${text}
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const rawText = response.text();

    if (!rawText) throw new Error("No content received from Gemini API");

    const startIndex = rawText.indexOf("[");
    const endIndex = rawText.lastIndexOf("]");
    if (startIndex === -1 || endIndex === -1) {
      console.warn("AI response did not contain a valid JSON array.");
      return [];
    }
    const jsonString = rawText.substring(startIndex, endIndex + 1);

    try {
      return JSON.parse(jsonString);
    } catch (strictParseError) {
      console.warn(
        "Standard JSON.parse failed. Attempting to fix with dirty-json..."
      );
      try {
        return dJSON.parse(jsonString);
      } catch (dirtyJsonError) {
        console.error(
          "Fatal Error: Even dirty-json could not parse the response.",
          dirtyJsonError
        );
        throw new Error(
          "Could not understand the format of the generated questions."
        );
      }
    }
  } catch (error) {
    console.error("Fatal Error processing AI response:", error);
    throw new Error("The AI model returned an error or invalid format.");
  }
}
