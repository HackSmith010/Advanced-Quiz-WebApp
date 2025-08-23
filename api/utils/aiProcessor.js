import { GoogleGenerativeAI } from "@google/generative-ai";
import { retryAsync } from "./retryHelper.js";

function parseJsonFromResponse(rawText) {
  const startIndex = rawText.indexOf("[");
  const endIndex = rawText.lastIndexOf("]");

  if (startIndex === -1 || endIndex === -1) {
    throw new Error(
      "No valid JSON array found in the AI's response (missing '[' or ']')."
    );
  }

  const jsonString = rawText.substring(startIndex, endIndex + 1);

  try {
    return JSON.parse(jsonString);
  } catch (e) {
    console.error("--- FAILED TO PARSE THIS JSON STRING ---");
    console.error(jsonString);
    console.error("-----------------------------------------");
    throw new Error(`Failed to parse the extracted JSON string: ${e.message}`);
  }
}

async function generateAllQuestionsInOneCall(text) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  const prompt = `
    Analyze the following text, which is a CHUNK from a larger document. Your task is to identify every complete question and provide detailed, structured data for each.

    **CRITICAL LOGIC:**
    1.  A question is "conceptual" if it asks for a definition OR a direct lookup of a trigonometric value (e.g., "Find sin(30°)", "What is tan(72°)?").
    2.  A question is "numerical" if it requires a multi-step calculation or the application of a formula with variables (e.g., "If base=5 and height=12, find the hypotenuse.", "Convert 92.66° to DMS.").
    3.  For EVERY "numerical" question, you MUST provide executable JavaScript "Math.*" formulas in the formula fields.
    4.  For EVERY "conceptual" question, you MUST provide a direct string or number answer in "correct_answer" and plausible distractors. The formula fields for conceptual questions must be null.
    5.  Ignore incomplete questions at the start or end of the chunk.
    6.  Your entire output must be a single, valid JSON array of objects. Double-check your output for syntax errors like trailing commas. If no questions are found, return an empty array [].

    **UNIFIED JSON SCHEMA:**
    [{
      "type": "numerical" | "conceptual",
      "original_text": "The full original text of the question...",
      "category": "The category of the question...",
      "question_template": "... {placeholder1} ...",
      "details": {
        // --- Fields for NUMERICAL questions ---
        "variables": { "base": 5, "height": 12 },
        "correct_answer_formula": "Math.sqrt(base**2 + height**2)",
        "distractor_formulas": [ "base + height", "base * 2 + height * 2", "base**2 + height**2" ],
        
        // --- Fields for CONCEPTUAL questions (must be null for numerical) ---
        "correct_answer": "The final calculated value or textual answer.", // e.g., for "tan(45°)", this would be 1
        "distractors": [ "Distractor 1", "Distractor 2", "Distractor 3" ]
      }
    }]

    Text to Analyze:
    ${text}
  `;

  const result = await model.generateContent(prompt);
  const rawText = result.response.text();
  if (!rawText) return [];

  try {
    return parseJsonFromResponse(rawText);
  } catch (e) {
    console.error(
      "Fatal Error: Could not parse the consolidated AI response.",
      e.message
    );
    throw new Error("Failed to parse the JSON response from the AI.");
  }
}

export async function processQuestionsWithAI(text) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("API key not configured.");
  }

  try {
    console.log("Starting unified question generation process...");
    const allGeneratedQuestions = await retryAsync(() =>
      generateAllQuestionsInOneCall(text)
    );
    console.log(
      ` > Unified process complete. Found ${allGeneratedQuestions.length} valid questions.`
    );
    return allGeneratedQuestions;
  } catch (error) {
    console.error(
      "Fatal error during the question generation process:",
      error.message
    );
    throw new Error("Unable to generate questions after multiple attempts.");
  }
}
