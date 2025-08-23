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
  if (
    !formula ||
    typeof formula !== "string" ||
    formula.trim().toLowerCase() === "null"
  ) {
    return null;
  }
  try {
    const sanitizedFormula = formula.replace(/[{}]/g, "");
    const result = math.evaluate(sanitizedFormula, scope);
    if (typeof result === "number" && isFinite(result)) {
      return (Math.round(result * 100) / 100).toString();
    }
    return null;
  } catch (error) {
    console.error(
      `Error evaluating formula "${formula}" with scope:`,
      scope,
      error.message
    );
    return null;
  }
}

export function generateQuestionForStudent(question, rollNumber, index) {
  const seed = `${rollNumber}-${question.id}-${index}`;
  const details = question.details || {};

  if (question.type === "numerical") {
    const variables = details.variables || {};
    const scope = {};
    const rng = seedrandom(seed);

    for (const key in variables) {
      const originalValue = parseFloat(variables[key]);
      if (isNaN(originalValue)) {
        console.error(
          `Invalid number for variable "${key}" in Q ID: ${question.id}. Skipping.`
        );
        return null;
      }
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

    let distractorAnswers = (details.distractor_formulas || [])
      .map((formula) => evaluateFormula(formula, scope))
      .filter((opt) => opt !== null && opt !== correctAnswer);

    while (distractorAnswers.length < 3) {
      const randomFactor = 0.5 + rng() * 1.5;
      const calculatedDistractor = parseFloat(correctAnswer) * randomFactor;
      const roundedDistractor = (
        Math.round(calculatedDistractor * 100) / 100
      ).toString();
      if (
        roundedDistractor !== correctAnswer &&
        !distractorAnswers.includes(roundedDistractor)
      ) {
        distractorAnswers.push(roundedDistractor);
      }
    }

    const finalOptions = [
      ...new Set([correctAnswer, ...distractorAnswers.slice(0, 3)]),
    ];

    let questionText = question.question_template || question.original_text;
    for (const key in scope) {
      questionText = questionText.replace(
        new RegExp(`{${key}}`, "g"),
        scope[key]
      );
    }

    return {
      question: questionText,
      options: shuffleArray(finalOptions, seed),
      correctAnswer: correctAnswer,
    };
  } else if (question.type === "conceptual") {
    const distractors = details.distractors || [];
    const correctAnswer = details.correct_answer;

    if (!correctAnswer) {
      console.error(
        `Conceptual question ID ${question.id} is missing a correct answer. Skipping.`
      );
      return null;
    }
    const options = [...distractors, correctAnswer];

    return {
      question: question.original_text,
      options: shuffleArray(options, seed),
      correctAnswer: correctAnswer,
    };
  }

  console.warn(
    `Unknown question type "${question.type}" for question ID: ${question.id}`
  );
  return null;
}
