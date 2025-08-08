import express from 'express';
import { db } from '../database/schema.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get all batches for a teacher
router.get('/', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT b.*, COUNT(sb.student_id)::int as student_count
      FROM batches b
      LEFT JOIN student_batches sb ON b.id = sb.batch_id
      WHERE b.teacher_id = $1
      GROUP BY b.id
      ORDER BY b.name
    `;
    const result = await db.query(query, [req.user.userId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching batches:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new batch
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name } = req.body;
    const query = `
      INSERT INTO batches (name, teacher_id)
      VALUES ($1, $2)
      RETURNING *
    `;
    const result = await db.query(query, [name, req.user.userId]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating batch:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get students in a specific batch
router.get('/:batchId/students', authenticateToken, async (req, res) => {
    try {
        const { batchId } = req.params;
        const query = `
            SELECT s.* FROM students s
            JOIN student_batches sb ON s.id = sb.student_id
            WHERE sb.batch_id = $1 AND s.teacher_id = $2
        `;
        const result = await db.query(query, [batchId, req.user.userId]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching students for batch:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Add a student to a batch
router.post('/:batchId/students', authenticateToken, async (req, res) => {
    try {
        const { batchId } = req.params;
        const { studentId } = req.body;
        const query = `
            INSERT INTO student_batches (batch_id, student_id)
            VALUES ($1, $2)
        `;
        await db.query(query, [batchId, studentId]);
        res.status(201).json({ message: 'Student added to batch successfully' });
    } catch (error) {
        console.error('Error adding student to batch:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
