import express from "express";
import seedrandom from "seedrandom";
import { db } from "../database/schema.js";
import { generateQuestionForStudent } from "../utils/questionGenerator.js";

const router = express.Router();

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

router.get("/test/:testLink", async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, title, description, duration_minutes, number_of_questions 
       FROM tests WHERE test_link = $1 AND status = 'active'`,
      [req.params.testLink]
    );
    const test = result.rows[0];

    if (!test) {
      return res.status(404).json({ error: "Test not found or not active" });
    }
    res.json(test);
  } catch (error) {
    console.error("Error fetching test:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/test/:testLink/start", async (req, res) => {
  const { student_name, roll_number } = req.body;
  const { testLink } = req.params;

  if (!student_name || !roll_number) {
    return res
      .status(400)
      .json({ error: "Name and Roll Number are required." });
  }

  try {
    const testResult = await db.query(
      `SELECT * FROM tests WHERE test_link = $1 AND status = 'active'`,
      [testLink]
    );
    const test = testResult.rows[0];
    if (!test) {
      return res.status(404).json({ error: "Test not found or not active." });
    }

    const studentResult = await db.query(
      `SELECT * FROM students WHERE roll_number = $1 AND LOWER(name) = LOWER($2) AND teacher_id = $3`,
      [roll_number, student_name, test.teacher_id]
    );
    const student = studentResult.rows[0];
    if (!student) {
      return res
        .status(401)
        .json({
          error:
            "The name and roll number combination is not registered for this test.",
        });
    }

    const existingAttemptResult = await db.query(
      `SELECT * FROM test_attempts WHERE test_id = $1 AND student_id = $2 AND status != 'abandoned'`,
      [test.id, student.id]
    );
    if (existingAttemptResult.rows.length > 0) {
      return res
        .status(400)
        .json({ error: "You have already attempted this test." });
    }

    const templatesResult = await db.query(
      `SELECT qt.* FROM question_templates qt
       JOIN test_questions tq ON qt.id = tq.question_template_id
       WHERE tq.test_id = $1`,
      [test.id]
    );
    let questionTemplates = templatesResult.rows;

    // 5. Randomize and Limit the Questions.
    const shuffledTemplates = shuffleArray(questionTemplates, roll_number);
    const selectedTemplates = shuffledTemplates.slice(
      0,
      test.number_of_questions
    );

    // 6. Generate the unique question for the student.
    const generatedQuestions = selectedTemplates
      .map((template, index) => {
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
      })
      .filter((q) => q !== null);

    // 7. Return everything the frontend needs in a single response.
    res.json({
      duration_minutes: test.duration_minutes,
      questions: generatedQuestions,
    });
  } catch (error) {
    console.error("Error starting test attempt:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// --- The endpoint to submit the test ---
router.post("/attempt/:testLink/submit", async (req, res) => {
  const { testLink } = req.params;
  const { roll_number, answers } = req.body;

  const client = await db.getClient();
  try {
    await client.query("BEGIN");

    // 1. Get Test and Student IDs
    const testResult = await client.query(
      "SELECT id, teacher_id, marks_per_question FROM tests WHERE test_link = $1",
      [testLink]
    );
    const test = testResult.rows[0];
    const studentResult = await client.query(
      "SELECT id, name FROM students WHERE roll_number = $1 AND teacher_id = $2",
      [roll_number, test.teacher_id]
    );
    const student = studentResult.rows[0];

    // 2. Create the test attempt record
    const attemptQuery = `INSERT INTO test_attempts (test_id, student_id, student_name, student_roll_number, status) VALUES ($1, $2, $3, $4, 'completed') RETURNING id`;
    const attemptResult = await client.query(attemptQuery, [
      test.id,
      student.id,
      student.name,
      roll_number,
    ]);
    const attemptId = attemptResult.rows[0].id;

    // 3. Process and score answers
    const templateIds = Object.keys(answers);
    const templatesResult = await client.query(
      "SELECT * FROM question_templates WHERE id = ANY($1::integer[])",
      [templateIds]
    );
    const questionTemplates = templatesResult.rows;

    let totalScore = 0;
    for (const template of questionTemplates) {
      const questionData = generateQuestionForStudent(
        template,
        roll_number,
        templateIds.indexOf(String(template.id))
      );
      const studentAnswer = answers[template.id] || null;
      const isCorrect = studentAnswer === questionData.correctAnswer;

      if (isCorrect) {
        totalScore += test.marks_per_question;
      }

      const answerInsertQuery = `
        INSERT INTO student_answers (attempt_id, question_template_id, generated_question, student_answer, correct_answer, is_correct)
        VALUES ($1, $2, $3, $4, $5, $6)
      `;
      await client.query(answerInsertQuery, [
        attemptId,
        template.id,
        questionData.question,
        studentAnswer,
        questionData.correctAnswer,
        isCorrect,
      ]);
    }

    // 4. Update the final score in the attempts table
    await client.query(
      "UPDATE test_attempts SET total_score = $1, end_time = CURRENT_TIMESTAMP WHERE id = $2",
      [totalScore, attemptId]
    );

    await client.query("COMMIT");

    res.json({ success: true, score: totalScore });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error submitting test:", error);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
});

// --- The following routes are for auxiliary functions and remain unchanged ---

router.post("/attempt/:attemptId/log-tab-change", async (req, res) => {
  try {
    const { attemptId } = req.params;
    const result = await db.query(
      `UPDATE test_attempts SET tab_change_count = tab_change_count + 1 WHERE id = $1 RETURNING tab_change_count`,
      [attemptId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Attempt not found." });
    }
    res.json({ newCount: result.rows[0].tab_change_count });
  } catch (error) {
    console.error("Error logging tab change:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/attempt/:attemptId/details-for-pdf", async (req, res) => {
  try {
    const { attemptId } = req.params;
    const query = `
      SELECT 
          t.title as test_title, 
          ta.student_name, ta.student_roll_number, ta.total_score,
          sa.generated_question, sa.student_answer, sa.correct_answer, sa.is_correct
      FROM test_attempts ta
      JOIN tests t ON ta.test_id = t.id
      LEFT JOIN student_answers sa ON ta.id = sa.attempt_id
      WHERE ta.id = $1
    `;
    const result = await db.query(query, [attemptId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Attempt data not found." });
    }
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching details for PDF:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
