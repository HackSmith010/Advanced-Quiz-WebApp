import { Router } from 'express';
import {db} from '../database/schema.js';
import authenticateToken from '../middleware/auth.js';
const router = Router();

// Get all question templates for a teacher
router.get('/', authenticateToken, (req, res) => {
  try {
    const questions = db.prepare(`
      SELECT * FROM question_templates 
      WHERE teacher_id = ? 
      ORDER BY created_at DESC
    `).all(req.user.userId);

    // Parse JSON strings back to objects
    const formattedQuestions = questions.map(q => ({
      ...q,
      variables: JSON.parse(q.variables),
      distractor_formulas: JSON.parse(q.distractor_formulas)
    }));

    res.json(formattedQuestions);
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get approved question templates
router.get('/approved', authenticateToken, (req, res) => {
  try {
    const questions = db.prepare(`
      SELECT * FROM question_templates 
      WHERE teacher_id = ? AND status = 'approved'
      ORDER BY category, created_at DESC
    `).all(req.user.userId);

    const formattedQuestions = questions.map(q => ({
      ...q,
      variables: JSON.parse(q.variables),
      distractor_formulas: JSON.parse(q.distractor_formulas)
    }));

    res.json(formattedQuestions);
  } catch (error) {
    console.error('Error fetching approved questions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update question template status
router.put('/:id/status', authenticateToken, (req, res) => {
  try {
    const { status } = req.body;
    const questionId = req.params.id;

    if (!['pending_review', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const stmt = db.prepare(`
      UPDATE question_templates 
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND teacher_id = ?
    `);
    const result = stmt.run(status, questionId, req.user.userId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Question not found' });
    }

    res.json({ message: 'Question status updated successfully' });
  } catch (error) {
    console.error('Error updating question status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update question template
router.put('/:id', authenticateToken, (req, res) => {
  try {
    const {
      question_template,
      variables,
      correct_answer_formula,
      distractor_formulas,
      category
    } = req.body;
    const questionId = req.params.id;

    const stmt = db.prepare(`
      UPDATE question_templates 
      SET question_template = ?, variables = ?, correct_answer_formula = ?, 
          distractor_formulas = ?, category = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND teacher_id = ?
    `);
    
    const result = stmt.run(
      question_template,
      JSON.stringify(variables),
      correct_answer_formula,
      JSON.stringify(distractor_formulas),
      category,
      questionId,
      req.user.userId
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Question not found' });
    }

    res.json({ message: 'Question updated successfully' });
  } catch (error) {
    console.error('Error updating question:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete question template
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const stmt = db.prepare('DELETE FROM question_templates WHERE id = ? AND teacher_id = ?');
    const result = stmt.run(req.params.id, req.user.userId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Question not found' });
    }

    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;