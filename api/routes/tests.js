import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/schema.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT t.*, COUNT(tq.id) as total_questions_selected
      FROM tests t
      LEFT JOIN test_questions tq ON t.id = tq.test_id
      WHERE t.teacher_id = $1
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `;
    const result = await db.query(query, [req.user.userId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching tests:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  const client = await db.getClient();
  try {
    const {
      title,
      description,
      duration_minutes,
      marks_per_question,
      question_ids,
      scheduled_date
    } = req.body;
    const testLink = uuidv4();

    await client.query('BEGIN');

    const insertTestQuery = `
      INSERT INTO tests (title, description, teacher_id, duration_minutes, 
                        marks_per_question, total_questions, test_link, scheduled_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `;
    const testResult = await client.query(insertTestQuery, [
      title, description || null, req.user.userId, duration_minutes || 60,
      marks_per_question || 1, question_ids.length, testLink, scheduled_date || null
    ]);
    const testId = testResult.rows[0].id;

    const insertTestQuestionQuery = `
      INSERT INTO test_questions (test_id, question_template_id, question_order)
      VALUES ($1, $2, $3)
    `;
    for (let i = 0; i < question_ids.length; i++) {
      await client.query(insertTestQuestionQuery, [testId, question_ids[i], i + 1]);
    }

    await client.query('COMMIT');

    res.status(201).json({
      id: testId,
      title,
      test_link: testLink,
      message: 'Test created successfully'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating test:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const testResult = await db.query(
      `SELECT * FROM tests WHERE id = $1 AND teacher_id = $2`,
      [req.params.id, req.user.userId]
    );
    const test = testResult.rows[0];

    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }

    const questionsResult = await db.query(`
      SELECT qt.*, tq.question_order
      FROM question_templates qt
      JOIN test_questions tq ON qt.id = tq.question_template_id
      WHERE tq.test_id = $1
      ORDER BY tq.question_order
    `, [req.params.id]);

    res.json({
      ...test,
      questions: questionsResult.rows
    });
  } catch (error) {
    console.error('Error fetching test details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    const testId = req.params.id;

    if (!['draft', 'active', 'completed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const query = `
      UPDATE tests 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND teacher_id = $3
    `;
    const result = await db.query(query, [status, testId, req.user.userId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Test not found' });
    }

    res.json({ message: 'Test status updated successfully' });
  } catch (error) {
    console.error('Error updating test status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id/results', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT ta.*, s.name as student_name, s.roll_number
      FROM test_attempts ta
      LEFT JOIN students s ON ta.student_id = s.id
      WHERE ta.test_id = $1
      ORDER BY ta.total_score DESC, ta.end_time ASC
    `;
    const result = await db.query(query, [req.params.id]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching test results:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
