import { create, all } from "mathjs";
import seedrandom from "seedrandom";

const math = create(all);

function shuffleArray(array, seed) {
  const rng = seedrandom(seed);
  let currentIndex = array.length;
  let randomIndex;

  while (currentIndex !== 0) {
    randomIndex = Math.floor(rng() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }
  return array;
}

function evaluateFormula(formula, scope) {
  if (!formula || typeof formula !== "string" || formula.trim() === "null") {
    return null;
  }
  try {
    const result = math.evaluate(formula, scope);
    if (typeof result === "number" && isFinite(result)) {
      return Math.round(result * 100) / 100;
    }
    return null;
  } catch (error) {
    console.error(
      `Error evaluating formula: "${formula}" with scope:`,
      scope,
      error.message
    );
    return null;
  }
}

export function generateQuestionForStudent(question, rollNumber, index) {
  const seed = `${rollNumber}-${question.id}-${index}`;
  const details = question.details;

  if (question.type === "numerical") {
    const scope = {};
    const rng = seedrandom(seed);

    for (const key in details.variables) {
      const originalValue = details.variables[key];
      const randomFactor = 0.8 + rng() * 0.4;
      scope[key] = Math.round(originalValue * randomFactor);
    }

    const correctAnswer = evaluateFormula(
      details.correct_answer_formula,
      scope
    );
    if (correctAnswer === null) {
      console.error(
        `Could not generate a valid answer for numerical question ID: ${question.id}. Skipping.`
      );
      return null;
    }

    const distractorAnswers = details.distractor_formulas
      .map((formula) => evaluateFormula(formula, scope))
      .filter((opt) => opt !== null && opt !== correctAnswer);

    const finalOptions = [...new Set([correctAnswer, ...distractorAnswers])];

    let questionText = question.question_template;
    for (const key in scope) {
      questionText = questionText.replace(
        new RegExp(`{${key}}`, "g"),
        scope[key]
      );
    }

    return {
      question: questionText,
      options: shuffleArray(finalOptions.map(String), seed),
      correctAnswer: correctAnswer.toString(),
    };
  } else if (question.type === "conceptual") {
    const options = [...details.distractors, details.correct_answer];

    return {
      question: question.original_text,
      options: shuffleArray(options, seed),
      correctAnswer: details.correct_answer,
    };
  }

  console.warn(
    `Unknown question type "${question.type}" for question ID: ${question.id}`
  );
  return null;
}
