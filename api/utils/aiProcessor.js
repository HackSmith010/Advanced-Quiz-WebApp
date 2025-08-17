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
    You are a meticulous data extraction engine. Your sole purpose is to convert questions from a given text chunk into a PERFECTLY FORMED JSON array.

    CRITICAL DIRECTIVES:
    1.  Your entire output MUST be a single, valid JSON array. Do NOT use markdown or other text.
    2.  **Use Placeholders in Formulas (VERY IMPORTANT):** For "numerical" questions, the "correct_answer_formula" and "distractor_formulas" fields MUST use the variable placeholders you defined (e.g., "{distance} / {time}"), NOT the original numbers from the text (e.g., "600 / 5"). This is the most important rule.
    3.  If no questions are found, return an empty array [].
    4.  Self-Correct: Before outputting, you MUST validate your own work to ensure the result is syntactically perfect JSON.
    5. Only Include the question from the original text don't include its options or anything else.s

    ---
    **SCHEMA & EXAMPLE for "numerical" questions:**
    - "type": "numerical"
    - "original_text": "A person crosses a 600 m street in 5 minutes. What is the speed in km/h?"
    - "question_template": "A person crosses a {distance} m street in {time} minutes. What is the speed in km/h?"
    - "variables": {"distance": 600, "time": 5}
    - "correct_answer_formula": "(distance / 1000) / (time / 60)"  <-- CORRECT: Uses placeholders.
    - "distractor_formulas": [ 
        "(distance / time) * (60 / 1000)", 
        "distance / (time * 60)", 
        "(distance * 60) / (time * 1000)"
      ]
    - "category": "Speed Calculation"
    ---
    **SCHEMA for "conceptual" questions:**
    - "type": "conceptual", "original_text": "...", "question_template": null, "details": { "correct_answer": "...", "distractors": [...] }, "category": "..."
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
