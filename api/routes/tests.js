import express from "express";
import { v4 as uuidv4 } from "uuid";
import { db } from "../database/schema.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

router.get("/", authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT 
        t.id,
        t.title,
        t.description,
        t.duration_minutes,
        t.marks_per_question,
        t.status,
        t.test_link,
        t.created_at,
        t.number_of_questions, -- MODIFIED: Explicitly select the new field.
        COUNT(tq.question_template_id)::int as total_available_questions
      FROM tests t
      LEFT JOIN test_questions tq ON t.id = tq.test_id
      WHERE t.teacher_id = $1
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `;
    const result = await db.query(query, [req.user.userId]);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching tests:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", authenticateToken, async (req, res) => {
  const client = await db.getClient();
  try {
    const {
      title,
      description,
      duration_minutes,
      marks_per_question,
      number_of_questions,
      max_attempts,
      compulsory_question_ids,
      random_question_ids,
    } = req.body;
    
    // --- MODIFIED: Corrected Validation Logic ---
    const totalSelected = compulsory_question_ids.length + random_question_ids.length;
    const neededRandom = number_of_questions - compulsory_question_ids.length;

    if (number_of_questions <= compulsory_question_ids.length) {
        return res.status(400).json({ error: "The total number of questions must be greater than the number of compulsory questions." });
    }

    if (random_question_ids.length < neededRandom) {
        return res.status(400).json({ error: `You need to select at least ${neededRandom} more non-compulsory questions to meet the test total of ${number_of_questions}.` });
    }

    await client.query("BEGIN");

    const insertTestQuery = `
      INSERT INTO tests (title, description, teacher_id, duration_minutes, 
                        marks_per_question, test_link, status, number_of_questions, max_attempts)
      VALUES ($1, $2, $3, $4, $5, $6, 'draft', $7, $8)
      RETURNING id
    `;
    const testResult = await client.query(insertTestQuery, [
      title, description, req.user.userId, duration_minutes,
      marks_per_question, uuidv4(), number_of_questions, max_attempts,
    ]);
    const testId = testResult.rows[0].id;

    const insertTestQuestionQuery = `
      INSERT INTO test_questions (test_id, question_template_id, is_compulsory)
      VALUES ($1, $2, $3)
    `;
    
    for (const questionId of compulsory_question_ids) {
      await client.query(insertTestQuestionQuery, [testId, questionId, true]);
    }
    for (const questionId of random_question_ids) {
      await client.query(insertTestQuestionQuery, [testId, questionId, false]);
    }

    await client.query("COMMIT");
    res.status(201).json({ message: "Test created successfully" });

  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error creating test:", error);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
});

router.put("/:id/status", authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    const testId = req.params.id;
    if (!["draft", "active", "completed"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    const result = await db.query(
      `UPDATE tests SET status = $1 WHERE id = $2 AND teacher_id = $3`,
      [status, testId, req.user.userId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Test not found" });
    }
    res.json({ message: "Test status updated successfully" });
  } catch (error) {
    console.error("Error updating test status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id/results", authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT ta.*, s.name as student_name
      FROM test_attempts ta
      LEFT JOIN students s ON ta.student_id = s.id
      WHERE ta.test_id = $1
      ORDER BY ta.total_score DESC, ta.end_time ASC
    `;
    const result = await db.query(query, [req.params.id]);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching test results:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
