// Utility to generate questions for students based on their roll number
function generateQuestionForStudent(questionTemplate, rollNumber, questionIndex) {
  // Parse the template data
  const variables = JSON.parse(questionTemplate.variables);
  const distractorFormulas = JSON.parse(questionTemplate.distractor_formulas);
  
  // Create a seed based on roll number and question index
  const seed = hashCode(rollNumber + questionIndex.toString());
  const rng = new SeededRandom(seed);
  
  // Generate new values for variables
  const generatedValues = {};
  variables.forEach(variable => {
    // Generate values within a reasonable range based on original value
    const originalValue = variable.value;
    const minValue = Math.max(1, Math.floor(originalValue * 0.5));
    const maxValue = Math.ceil(originalValue * 2);
    generatedValues[variable.name] = rng.nextInt(minValue, maxValue + 1);
  });
  
  // Replace variables in question template
  let generatedQuestion = questionTemplate.question_template;
  Object.keys(generatedValues).forEach(varName => {
    const regex = new RegExp(`{{${varName}}}`, 'g');
    generatedQuestion = generatedQuestion.replace(regex, generatedValues[varName]);
  });
  
  // Calculate correct answer using the formula
  const correctAnswer = evaluateFormula(
    questionTemplate.correct_answer_formula, 
    generatedValues
  );
  
  // Generate distractor options
  const distractorAnswers = distractorFormulas.map(formula => 
    evaluateFormula(formula, generatedValues)
  );
  
  // Create multiple choice options
  const allOptions = [correctAnswer, ...distractorAnswers];
  const shuffledOptions = shuffleArray([...allOptions], rng);
  
  return {
    question: generatedQuestion,
    values: generatedValues,
    correctAnswer: correctAnswer.toString(),
    options: shuffledOptions.map(opt => opt.toString())
  };
}

// Simple hash function for creating seeds
function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// Seeded random number generator
class SeededRandom {
  constructor(seed) {
    this.seed = seed;
  }
  
  next() {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
  
  nextInt(min, max) {
    return Math.floor(this.next() * (max - min)) + min;
  }
}

// Evaluate mathematical formulas
function evaluateFormula(formula, values) {
  try {
    // Replace variable names with their values
    let expression = formula;
    Object.keys(values).forEach(varName => {
      const regex = new RegExp(varName, 'g');
      expression = expression.replace(regex, values[varName]);
    });
    
    // Simple evaluation (in production, use a proper math parser)
    const result = Function('"use strict"; return (' + expression + ')')();
    return Math.round(result * 100) / 100; // Round to 2 decimal places
  } catch (error) {
    console.error('Error evaluating formula:', error);
    return 0;
  }
}

// Shuffle array with seeded random
function shuffleArray(array, rng) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Corrected export syntax
export { generateQuestionForStudent };
