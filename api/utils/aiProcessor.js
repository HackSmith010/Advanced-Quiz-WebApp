import { retryAsync } from './retryHelper.js';

// This is the main function that will be called by your routes.
export async function processQuestionsWithAI(text) {
  if (!process.env.GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY not found. Unable to generate questions template.');
    throw new Error('API key not configured. Unable to generate questions template.');
  }
  console.log('Processing text with Gemini API...');
  try {
    return await retryAsync(() => callGeminiAPI(text));
  } catch (error) {
    console.error("Fatal error after multiple retries:", error.message);
    throw new Error('Unable to generate questions template after multiple attempts.');
  }
}

// Function to call the Gemini API
async function callGeminiAPI(text) {
  const apiKey = process.env.GEMINI_API_KEY;
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  const prompt = `
    You are an expert question template generator. Your task is to parse text and extract every question into a specific JSON format.

    CRITICAL INSTRUCTIONS:
    1.  For each question found, you MUST create a JSON object with exactly these 6 keys: "original_text", "question_template", "variables", "correct_answer_formula", "distractor_formulas", and "category".
    2.  The "variables" array is the most important part. You MUST parse the "original_text" and extract every number into a corresponding variable object. Each variable object MUST have a "name", a "value" (the extracted number), and a "unit". The "value" field cannot be null if a number exists in the text.
    3.  The "correct_answer_formula" MUST be a simple, valid mathematical formula string. If you cannot determine a formula, provide the string "null".
    4.  The "distractor_formulas" array is critical. It MUST contain exactly three plausible but incorrect mathematical formula strings.

    HERE IS A PERFECT EXAMPLE:
    ---
    Input Text: "A casting weighing 250 kg contains 60% copper. Find the weight of copper."

    Your Output:
    <JSON_OUTPUT>
    [
      {
        "original_text": "A casting weighing 250 kg contains 60% copper. Find the weight of copper.",
        "question_template": "A casting weighing {total_weight} kg contains {copper_percentage}% copper. Find the weight of copper.",
        "variables": [
          {"name": "total_weight", "value": 250, "unit": "kg"},
          {"name": "copper_percentage", "value": 60, "unit": "%"}
        ],
        "correct_answer_formula": "(copper_percentage / 100) * total_weight",
        "distractor_formulas": [
            "total_weight / copper_percentage", 
            "total_weight * copper_percentage", 
            "(100 / copper_percentage) * total_weight"
        ],
        "category": "Mixture Problems"
      }
    ]
    </JSON_OUTPUT>
    ---

    Now, apply this exact logic to the following text. Your final output MUST be wrapped in <JSON_OUTPUT> tags.

    Text to parse:
    ---
    ${text}
    ---
  `;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      maxOutputTokens: 8192,
    }
  };

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`API request failed with status ${response.status}: ${errorBody}`);
  }

  const result = await response.json();
  const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!rawText) {
    throw new Error("No content received from Gemini API");
  }

  // --- Multi-pass robust JSON parsing ---
  try {
    let jsonString = rawText;
    const startIndex = rawText.indexOf('<JSON_OUTPUT>');
    if (startIndex !== -1) {
      const endIndex = rawText.lastIndexOf('</JSON_OUTPUT>');
      if (endIndex !== -1) {
        jsonString = rawText.substring(startIndex + '<JSON_OUTPUT>'.length, endIndex).trim();
      }
    }
    const arrayStart = jsonString.indexOf('[');
    const arrayEnd = jsonString.lastIndexOf(']');
    if (arrayStart !== -1 && arrayEnd !== -1) {
      jsonString = jsonString.substring(arrayStart, arrayEnd + 1).trim();
    }
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Failed to parse JSON from Gemini response. Raw text received:", rawText);
    throw error;
  }
}
