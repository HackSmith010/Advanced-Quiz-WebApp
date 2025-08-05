import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/schema.js';
import authenticateToken  from '../middleware/auth.js';
import generateQuestionForStudent from '../utils/questionGenerator.js';
const router = Router();

// Get all tests for a teacher
router.get('/', authenticateToken, (req, res) => {
  try {
    const tests = db.prepare(`
      SELECT t.*, COUNT(tq.id) as total_questions_selected
      FROM tests t
      LEFT JOIN test_questions tq ON t.id = tq.test_id
      WHERE t.teacher_id = ?
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `).all(req.user.userId);

    res.json(tests);
  } catch (error) {
    console.error('Error fetching tests:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new test
router.post('/', authenticateToken, (req, res) => {
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

    // Start transaction
    const insertTest = db.prepare(`
      INSERT INTO tests (title, description, teacher_id, duration_minutes, 
                        marks_per_question, total_questions, test_link, scheduled_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertTestQuestion = db.prepare(`
      INSERT INTO test_questions (test_id, question_template_id, question_order)
      VALUES (?, ?, ?)
    `);

    const transaction = db.transaction(() => {
      const testResult = insertTest.run(
        title,
        description || null,
        req.user.userId,
        duration_minutes || 60,
        marks_per_question || 1,
        question_ids.length,
        testLink,
        scheduled_date || null
      );

      const testId = testResult.lastInsertRowid;

      // Add questions to test
      question_ids.forEach((questionId, index) => {
        insertTestQuestion.run(testId, questionId, index + 1);
      });

      return testId;
    });

    const testId = transaction();

    res.status(201).json({
      id: testId,
      title,
      test_link: testLink,
      message: 'Test created successfully'
    });
  } catch (error) {
    console.error('Error creating test:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get test details
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const test = db.prepare(`
      SELECT * FROM tests WHERE id = ? AND teacher_id = ?
    `).get(req.params.id, req.user.userId);

    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }

    const questions = db.prepare(`
      SELECT qt.*, tq.question_order
      FROM question_templates qt
      JOIN test_questions tq ON qt.id = tq.question_template_id
      WHERE tq.test_id = ?
      ORDER BY tq.question_order
    `).all(req.params.id);

    const formattedQuestions = questions.map(q => ({
      ...q,
      variables: JSON.parse(q.variables),
      distractor_formulas: JSON.parse(q.distractor_formulas)
    }));

    res.json({
      ...test,
      questions: formattedQuestions
    });
  } catch (error) {
    console.error('Error fetching test details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update test status
router.put('/:id/status', authenticateToken, (req, res) => {
  try {
    const { status } = req.body;
    const testId = req.params.id;

    if (!['draft', 'active', 'completed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const stmt = db.prepare(`
      UPDATE tests 
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND teacher_id = ?
    `);
    const result = stmt.run(status, testId, req.user.userId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Test not found' });
    }

    res.json({ message: 'Test status updated successfully' });
  } catch (error) {
    console.error('Error updating test status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get test results
router.get('/:id/results', authenticateToken, (req, res) => {
  try {
    const results = db.prepare(`
      SELECT ta.*, s.name as student_name, s.roll_number
      FROM test_attempts ta
      LEFT JOIN students s ON ta.student_id = s.id
      WHERE ta.test_id = ?
      ORDER BY ta.total_score DESC, ta.end_time ASC
    `).all(req.params.id);

    res.json(results);
  } catch (error) {
    console.error('Error fetching test results:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;