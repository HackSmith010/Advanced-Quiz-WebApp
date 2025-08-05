import express from 'express';
import { db } from '../database/schema.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get all question templates for a teacher
router.get('/', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT * FROM question_templates 
      WHERE teacher_id = $1 
      ORDER BY created_at DESC
    `;
    const result = await db.query(query, [req.user.userId]);
    res.json(result.rows); // No need to parse JSON, it's handled by pg
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get approved question templates
router.get('/approved', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT * FROM question_templates 
      WHERE teacher_id = $1 AND status = 'approved'
      ORDER BY category, created_at DESC
    `;
    const result = await db.query(query, [req.user.userId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching approved questions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update question template status
router.put('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    const questionId = req.params.id;

    if (!['pending_review', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const query = `
      UPDATE question_templates 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND teacher_id = $3
    `;
    const result = await db.query(query, [status, questionId, req.user.userId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Question not found' });
    }
    res.json({ message: 'Question status updated successfully' });
  } catch (error) {
    console.error('Error updating question status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update question template
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const {
      question_template,
      variables,
      correct_answer_formula,
      distractor_formulas,
      category
    } = req.body;
    const questionId = req.params.id;

    const query = `
      UPDATE question_templates 
      SET question_template = $1, variables = $2, correct_answer_formula = $3, 
          distractor_formulas = $4, category = $5, updated_at = CURRENT_TIMESTAMP
      WHERE id = $6 AND teacher_id = $7
    `;
    
    const result = await db.query(query, [
      question_template,
      JSON.stringify(variables),
      correct_answer_formula,
      JSON.stringify(distractor_formulas),
      category,
      questionId,
      req.user.userId
    ]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Question not found' });
    }
    res.json({ message: 'Question updated successfully' });
  } catch (error) {
    console.error('Error updating question:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete question template
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      'DELETE FROM question_templates WHERE id = $1 AND teacher_id = $2',
      [req.params.id, req.user.userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Question not found' });
    }
    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;