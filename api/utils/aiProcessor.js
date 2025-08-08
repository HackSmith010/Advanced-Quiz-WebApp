import { retryAsync, getMockData } from './retryHelper.js';

// This is the main function that will be called by your routes.
export async function processQuestionsWithAI(text) {
  // This will now default to the local Llama call.
  // The mock data will be used if the local server isn't running.
  console.log('Processing text with local Llama model...');
  try {
    // We can still use the retry helper for robustness
    return await retryAsync(() => callLocalLlamaAPI(text));
  } catch (error) {
    console.error("Fatal error calling local Llama model:", error.message);
    console.log("Falling back to mock data.");
    return getMockData();
  }
}

// Function to call a local Llama API (e.g., Ollama)
async function callLocalLlamaAPI(text) {
  // Standard endpoint for local LLM servers like Ollama
  const apiUrl = `http://localhost:11434/api/generate`;

  const prompt = `
    You are an expert question template generator. Your task is to parse text and extract every question into a specific JSON format.

    CRITICAL INSTRUCTIONS:
    1.  For each question found, you MUST create a JSON object with exactly these 6 keys: "original_text", "question_template", "variables", "correct_answer_formula", "distractor_formulas", and "category".
    2.  The "variables" array is the most important part. You MUST parse the "original_text" and extract every number into a corresponding variable object. Each variable object MUST have a "name", a "value" (the extracted number), and a "unit". The "value" field cannot be null if a number exists in the text.
    3.  The "correct_answer_formula" MUST be a simple, valid mathematical formula string. If you cannot determine a formula, provide the string "null".

    HERE IS A PERFECT EXAMPLE:
    ---
    Input Text: "A casting weighing 250 kg contains 60% copper, 35% zinc and 5% lead. Find the weight of zinc present in the casting."

    Your Output JSON Object for this input:
    {
      "original_text": "A casting weighing 250 kg contains 60% copper, 35% zinc and 5% lead. Find the weight of zinc present in the casting.",
      "question_template": "A casting weighing {total_weight} kg contains {copper_percentage}% copper, {zinc_percentage}% zinc and {lead_percentage}% lead. Find the weight of zinc present in the casting.",
      "variables": [
        {"name": "total_weight", "value": 250, "unit": "kg"},
        {"name": "copper_percentage", "value": 60, "unit": "%"},
        {"name": "zinc_percentage", "value": 35, "unit": "%"},
        {"name": "lead_percentage", "value": 5, "unit": "%"}
      ],
      "correct_answer_formula": "(zinc_percentage / 100) * total_weight",
      "distractor_formulas": [
        "(copper_percentage / 100) * total_weight",
        "(lead_percentage / 100) * total_weight",
        "total_weight / (zinc_percentage / 100)"
      ],
      "category": "Mixture Problems"
    }
    ---

    Now, apply this exact logic to the following text. Your response MUST be ONLY a single, valid JSON array of these objects. Do not include any other text or markdown.

    Text to parse:
    ---
    ${text}
    ---
  `;

  const payload = {
    // You can change 'llama3.1' to whichever model you have downloaded
    model: "llama3.1", 
    prompt: prompt,
    format: "json", // Instructs Ollama to return valid JSON
    stream: false   // We want the full response at once
  };

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`API request to local Llama failed with status ${response.status}: ${errorBody}`);
  }

  const result = await response.json();
  const rawText = result.response; // In Ollama, the response is in the 'response' key

  if (!rawText) {
    throw new Error("No content received from local Llama API");
  }

  try {
    return JSON.parse(rawText);
  } catch (error) {
    console.error("Failed to parse JSON from Llama response. Raw text received:", rawText);
    throw error;
  }
}
