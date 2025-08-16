import express from 'express';
import { db } from '../database/schema.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const { subjectId, status } = req.query;
    let query = `
      SELECT q.*, s.name as subject_name 
      FROM question_templates q
      LEFT JOIN subjects s ON q.subject_id = s.id
      WHERE q.teacher_id = $1
    `;
    const params = [req.user.userId];
    let paramIndex = 2;

    if (subjectId) {
      query += ` AND q.subject_id = $${paramIndex++}`;
      params.push(subjectId);
    }
    if (status) {
      query += ` AND q.status = $${paramIndex++}`;
      params.push(status);
    }
    
    query += ` ORDER BY q.created_at DESC`;
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/approved', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT q.*, s.name as subject_name
      FROM question_templates q
      JOIN subjects s ON q.subject_id = s.id
      WHERE q.teacher_id = $1 AND q.status = 'approved'
      ORDER BY s.name, q.created_at
    `;
    const result = await db.query(query, [req.user.userId]);

    const groupedBySubject = result.rows.reduce((acc, question) => {
      const subject = question.subject_name;
      if (!acc[subject]) {
        acc[subject] = [];
      }
      acc[subject].push(question);
      return acc;
    }, {});

    res.json(groupedBySubject);
  } catch (error) {
    console.error('Error fetching approved questions by subject:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put("/:id/status", authenticateToken, async (req, res) => {
  try {
    const { status, subjectId } = req.body;
    const questionId = req.params.id;

    let updateClauses = [];
    const params = [];
    if (status) {
      updateClauses.push(`status = $${params.push(status)}`);
    }
    if (subjectId) {
      updateClauses.push(`subject_id = $${params.push(subjectId)}`);
    }

    if (updateClauses.length === 0) {
      return res.status(400).json({ error: "No update information provided." });
    }

    const query = `
      UPDATE question_templates 
      SET ${updateClauses.join(", ")} 
      WHERE id = $${params.push(questionId)} AND teacher_id = $${params.push(
      req.user.userId
    )}
    `;

    const result = await db.query(query, params);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Question not found" });
    }
    res.json({ message: "Question updated successfully" });
  } catch (error) {
    console.error("Error updating question status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      'DELETE FROM question_templates WHERE id = $1 AND teacher_id = $2',
      [req.params.id, req.user.userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Question not found or permission denied' });
    }

    res.json({ message: 'Question deleted permanently' });
  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const {
      question_template,
      variables,
      correct_answer_formula,
      distractor_formulas,
      category, 
    } = req.body;
    const questionId = req.params.id;

    const query = `
            UPDATE question_templates 
            SET question_template = $1, variables = $2, correct_answer_formula = $3, 
                distractor_formulas = $4, category = $5
            WHERE id = $6 AND teacher_id = $7
        `;

    const result = await db.query(query, [
      question_template,
      JSON.stringify(variables),
      correct_answer_formula,
      JSON.stringify(distractor_formulas),
      category,
      questionId,
      req.user.userId,
    ]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Question not found" });
    }
    res.json({ message: "Question template updated successfully" });
  } catch (error) {
    console.error("Error updating question:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
