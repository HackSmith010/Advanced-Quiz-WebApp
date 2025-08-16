import express from "express";
import seedrandom from "seedrandom";
import { db } from "../database/schema.js";
import { generateQuestionForStudent } from "../utils/questionGenerator.js";

const router = express.Router();

// Helper function to shuffle an array deterministically using a seed
function shuffleArray(array, seed) {
  const rng = seedrandom(seed);
  let currentIndex = array.length;
  while (currentIndex !== 0) {
    let randomIndex = Math.floor(rng() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }
  return array;
}

// Reusable helper to get the exact questions a student should see for an attempt.
// This is the key to fixing the question discrepancy bug.
const getQuestionsForAttempt = async (testId, rollNumber) => {
  const testResult = await db.query("SELECT * FROM tests WHERE id = $1", [
    testId,
  ]);
  const test = testResult.rows[0];

  const templatesResult = await db.query(
    `SELECT qt.* FROM question_templates qt
       JOIN test_questions tq ON qt.id = tq.question_template_id
       WHERE tq.test_id = $1`,
    [testId]
  );
  let questionTemplates = templatesResult.rows;
  const shuffledTemplates = shuffleArray(questionTemplates, rollNumber);
  const selectedTemplates = shuffledTemplates.slice(
    0,
    test.number_of_questions
  );
  return { selectedTemplates, test };
};

// Gets public test info and any past attempts for a given student
router.get("/test/:testLink", async (req, res) => {
  try {
    const { testLink } = req.params;
    const { roll_number, name } = req.query;

    const testResult = await db.query(
      `SELECT id, title, description, duration_minutes, number_of_questions, max_attempts, teacher_id
       FROM tests WHERE test_link = $1 AND status = 'active'`,
      [testLink]
    );
    const test = testResult.rows[0];
    if (!test)
      return res.status(404).json({ error: "Test not found or not active" });

    let attempts = [];
    if (roll_number && name) {
      const studentResult = await db.query(
        "SELECT id FROM students WHERE roll_number = $1 AND LOWER(name) = LOWER($2) AND teacher_id = $3",
        [roll_number, name, test.teacher_id]
      );
      if (studentResult.rows.length > 0) {
        const studentId = studentResult.rows[0].id;
        const attemptsResult = await db.query(
          "SELECT id, total_score, end_time, attempt_number FROM test_attempts WHERE test_id = $1 AND student_id = $2 ORDER BY attempt_number ASC",
          [test.id, studentId]
        );
        attempts = attemptsResult.rows;
      }
    }

    res.json({ test, attempts });
  } catch (error) {
    console.error("Error fetching test details:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Starts a test (or a new attempt)
router.post("/test/:testLink/start", async (req, res) => {
  const { student_name, roll_number } = req.body;
  const { testLink } = req.params;
  try {
    const testResult = await db.query(
      `SELECT * FROM tests WHERE test_link = $1 AND status = 'active'`,
      [testLink]
    );
    const test = testResult.rows[0];
    if (!test)
      return res.status(404).json({ error: "Test not found or not active." });

    const studentResult = await db.query(
      `SELECT * FROM students WHERE roll_number = $1 AND LOWER(name) = LOWER($2) AND teacher_id = $3`,
      [roll_number, student_name, test.teacher_id]
    );
    const student = studentResult.rows[0];
    if (!student)
      return res
        .status(401)
        .json({
          error:
            "The name and roll number combination is not registered for this test.",
        });

    const existingAttemptsResult = await db.query(
      `SELECT COUNT(*) FROM test_attempts WHERE test_id = $1 AND student_id = $2`,
      [test.id, student.id]
    );
    const attemptCount = parseInt(existingAttemptsResult.rows[0].count, 10);
    if (attemptCount >= test.max_attempts) {
      return res
        .status(403)
        .json({
          error:
            "You have reached the maximum number of attempts for this test.",
        });
    }

    const { selectedTemplates } = await getQuestionsForAttempt(
      test.id,
      roll_number
    );
    const generatedQuestions = selectedTemplates.map((template, index) => {
      const questionData = generateQuestionForStudent(
        template,
        roll_number,
        index
      );
      return {
        id: template.id,
        question: questionData.question,
        options: questionData.options,
      };
    });

    res.json({
      duration_minutes: test.duration_minutes,
      questions: generatedQuestions,
      attempt_number: attemptCount + 1,
    });
  } catch (error) {
    console.error("Error starting test attempt:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Submits the test
router.post("/attempt/:testLink/submit", async (req, res) => {
  const { testLink } = req.params;
  const { roll_number, name, answers, attempt_number } = req.body;
  const client = await db.getClient();
  try {
    await client.query("BEGIN");
    const testResult = await client.query(
      "SELECT id, teacher_id, marks_per_question FROM tests WHERE test_link = $1",
      [testLink]
    );
    const test = testResult.rows[0];
    const studentResult = await client.query(
      "SELECT id FROM students WHERE roll_number = $1 AND teacher_id = $2",
      [roll_number, test.teacher_id]
    );
    const student = studentResult.rows[0];

    const { selectedTemplates } = await getQuestionsForAttempt(
      test.id,
      roll_number
    );

    const attemptQuery = `INSERT INTO test_attempts (test_id, student_id, student_name, student_roll_number, status, attempt_number) VALUES ($1, $2, $3, $4, 'completed', $5) RETURNING id`;
    const attemptResult = await client.query(attemptQuery, [
      test.id,
      student.id,
      name,
      roll_number,
      attempt_number,
    ]);
    const attemptId = attemptResult.rows[0].id;

    let totalScore = 0;
    for (const template of selectedTemplates) {
      const questionData = generateQuestionForStudent(
        template,
        roll_number,
        selectedTemplates.indexOf(template)
      );
      const studentAnswer = answers[template.id] || null;
      const isCorrect = studentAnswer === questionData.correctAnswer;
      if (isCorrect) totalScore += test.marks_per_question;

      const answerInsertQuery = `INSERT INTO student_answers (attempt_id, question_template_id, generated_question, student_answer, correct_answer, is_correct) VALUES ($1, $2, $3, $4, $5, $6)`;
      await client.query(answerInsertQuery, [
        attemptId,
        template.id,
        questionData.question,
        studentAnswer,
        questionData.correctAnswer,
        isCorrect,
      ]);
    }

    await client.query(
      "UPDATE test_attempts SET total_score = $1, end_time = CURRENT_TIMESTAMP WHERE id = $2",
      [totalScore, attemptId]
    );
    await client.query("COMMIT");
    res.json({ success: true, score: totalScore, attemptId });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error submitting test:", error);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
});

// Gets details for the PDF, now guaranteed to be correct
router.get("/attempt/:attemptId/details-for-pdf", async (req, res) => {
  try {
    const { attemptId } = req.params;
    const attemptResult = await db.query(
      `SELECT * FROM test_attempts WHERE id = $1`,
      [attemptId]
    );
    const attempt = attemptResult.rows[0];
    if (!attempt) return res.status(404).json({ error: "Attempt not found" });

    const detailsResult = await db.query(
      `SELECT t.title as test_title, sa.* FROM student_answers sa
             JOIN test_attempts ta ON sa.attempt_id = ta.id
             JOIN tests t ON ta.test_id = t.id
             WHERE sa.attempt_id = $1`,
      [attemptId]
    );

    const fullDetails = detailsResult.rows.map((row) => ({
      ...row,
      student_name: attempt.student_name,
      student_roll_number: attempt.student_roll_number,
      total_score: attempt.total_score,
      end_time: attempt.end_time,
    }));

    res.json(fullDetails);
  } catch (error) {
    console.error("Error fetching details for PDF:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
