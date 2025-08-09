import { create, all } from 'mathjs';

const math = create(all);

function generateQuestionForStudent(questionTemplate, rollNumber, questionIndex) {
  const variables = questionTemplate.variables;
  const distractorFormulas = questionTemplate.distractor_formulas;
  
  const seed = hashCode(rollNumber + questionIndex.toString());
  const rng = new SeededRandom(seed);
  
  const generatedValues = {};
  variables.forEach(variable => {
    if (typeof variable.value !== 'number') return;
    
    const originalValue = variable.value;
    const minValue = Math.max(1, Math.floor(originalValue * 0.5));
    const maxValue = Math.ceil(originalValue * 1.5);
    generatedValues[variable.name] = rng.nextInt(minValue, maxValue + 1);
  });
  
  let generatedQuestion = questionTemplate.question_template;
  Object.keys(generatedValues).forEach(varName => {
    const regex = new RegExp(`{${varName}}`, 'g');
    generatedQuestion = generatedQuestion.replace(regex, generatedValues[varName]);
  });
  
  const correctAnswer = evaluateFormula(
    questionTemplate.correct_answer_formula, 
    generatedValues
  );

  if (correctAnswer === null) {
    console.error(`Could not generate a valid answer for question: "${questionTemplate.original_text}". Skipping.`);
    return null;
  }
  
  let distractorAnswers = distractorFormulas
    .map(formula => evaluateFormula(formula, generatedValues))
    .filter(opt => opt !== null && opt !== correctAnswer); // Filter out nulls and duplicates of correct answer

  // --- FIX: Ensure there are always 3 distractors ---
  if (distractorAnswers.length < 3) {
    const fallbackDistractors = [
      correctAnswer + rng.nextInt(1, 10),
      Math.abs(correctAnswer - rng.nextInt(1, 10)),
      correctAnswer * 2,
      Math.round(correctAnswer / 2)
    ];
    // Add fallback options that are not duplicates
    for (const fallback of fallbackDistractors) {
      if (distractorAnswers.length < 3 && !distractorAnswers.includes(fallback) && fallback !== correctAnswer) {
        distractorAnswers.push(fallback);
      }
    }
  }
  
  const allOptions = [correctAnswer, ...distractorAnswers.slice(0, 3)];
  const shuffledOptions = shuffleArray([...new Set(allOptions)], rng);
  
  return {
    question: generatedQuestion,
    values: generatedValues,
    correctAnswer: correctAnswer?.toString(),
    options: shuffledOptions.map(opt => opt.toString())
  };
}

// ... (rest of the helper functions: hashCode, SeededRandom, evaluateFormula, shuffleArray)
// ... (They remain the same as before)

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

class SeededRandom {
  constructor(seed) { this.seed = seed; }
  next() {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
  nextInt(min, max) {
    return Math.floor(this.next() * (max - min)) + min;
  }
}

function evaluateFormula(formula, values) {
  if (!formula || formula === 'null') return null;
  try {
    const scope = { ...values };
    const result = math.evaluate(formula, scope);
    if (typeof result === 'object' && result.entries) {
      const finalResult = result.entries[result.entries.length - 1];
      return typeof finalResult === 'number' ? Math.round(finalResult * 100) / 100 : finalResult;
    }
    return typeof result === 'number' ? Math.round(result * 100) / 100 : result;
  } catch (error) {
    console.error(`Error evaluating formula: "${formula}"`, error.message);
    return null;
  }
}

function shuffleArray(array, rng) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export { generateQuestionForStudent };
