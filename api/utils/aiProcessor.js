export async function processQuestionsWithAI(text) {
  if (!process.env.GEMINI_API_KEY) {
    console.log('GEMINI_API_KEY not found. Using mock AI data.');
    return getMockData();
  }
  console.log('Processing text with Gemini API...');
  return await callGeminiAPI(text);
}

async function callGeminiAPI(text) {
  const apiKey = process.env.GEMINI_API_KEY;
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

  const prompt = `
    Parse the following text and extract questions. For each question found, create a JSON object with:
    1. "original_text": the exact question text
    2. "question_template": the question with numerical values replaced by {{variable_name}}
    3. "variables": an array of objects, each with "name", "value", and "unit"
    4. "correct_answer_formula": a simple mathematical formula string to calculate the answer (e.g., "force / mass")
    5. "distractor_formulas": an array of three incorrect formula strings for multiple choice options
    6. "category": the subject category of the question (e.g., "Physics")
    
    Text to parse:
    ---
    ${text}
    ---
    
    Return ONLY a valid JSON array of the question objects. Do not include any other text or markdown formatting.
  `;

  const payload = {
    contents: [{
      parts: [{ text: prompt }]
    }],
    generationConfig: {
      responseMimeType: "application/json",
    }
  };

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`API request failed with status ${response.status}: ${errorBody}`);
    }

    const result = await response.json();
    
    if (result.candidates && result.candidates.length > 0) {
      const content = result.candidates[0].content.parts[0].text;
      return JSON.parse(content);
    } else {
      throw new Error("No content received from Gemini API");
    }
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    return getMockData();
  }
}

function getMockData() {
  console.log('Processing text with AI (mock implementation)');
  return new Promise(resolve => {
    setTimeout(() => {
      resolve([
        {
          original_text: "A force of 50 N is applied to an object with a mass of 5 kg. What is the resulting acceleration in m/s²?",
          question_template: "A force of {{force}} N is applied to an object with a mass of {{mass}} kg. What is the resulting acceleration in m/s²?",
          variables: [
            { name: "force", value: 50, unit: "N" },
            { name: "mass", value: 5, unit: "kg" }
          ],
          correct_answer_formula: "force / mass",
          distractor_formulas: [
            "force * mass",
            "mass / force",
            "(force / mass) + 10"
          ],
          category: "Physics"
        },
        {
          original_text: "Calculate the area of a rectangle with length 12 cm and width 8 cm.",
          question_template: "Calculate the area of a rectangle with length {{length}} cm and width {{width}} cm.",
          variables: [
            { name: "length", value: 12, unit: "cm" },
            { name: "width", value: 8, unit: "cm" }
          ],
          correct_answer_formula: "length * width",
          distractor_formulas: [
            "length + width",
            "2 * (length + width)",
            "length / width"
          ],
          category: "Mathematics"
        }
      ]);
    }, 1000);
  });
}
