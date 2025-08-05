// AI Processing utility - integrates with OpenAI API
import axios from 'axios'; // Corrected axios import

// Mock AI processing function - in production would use OpenAI API
export async function processQuestionsWithAI(text) { // Corrected: Added 'export'
  // This is a placeholder implementation
  // In production, this would send the text to OpenAI API with proper prompts
  
  console.log('Processing text with AI (mock implementation)');
  
  // Mock extracted questions - in reality, AI would parse the PDF text
  const mockQuestions = [
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
  ];
  
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  return mockQuestions;
}

// Function to call OpenAI API (implementation for production)
export async function callOpenAI(text) { // Corrected: Added 'export'
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }
  
  const prompt = `
    Parse the following text and extract questions. For each question found, create a JSON object with:
    1. original_text: the exact question text
    2. question_template: the question with variables replaced by {{variable_name}}
    3. variables: array of objects with name, value, and unit
    4. correct_answer_formula: mathematical formula to calculate the answer
    5. distractor_formulas: array of incorrect formulas for multiple choice options
    6. category: subject category of the question
    
    Text to parse:
    ${text}
    
    Return only valid JSON array of question objects.
  `;
  
  try {
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at parsing educational content and converting questions into parameterized templates.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1
    }, {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    const content = response.data.choices[0].message.content;
    return JSON.parse(content);
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    throw error;
  }
}
