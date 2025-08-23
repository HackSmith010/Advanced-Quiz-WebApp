import express from 'express';
import { db } from '../database/schema.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT 
        s.*, 
        COUNT(qt.id)::int AS question_count
      FROM subjects s
      LEFT JOIN question_templates qt ON s.id = qt.subject_id AND qt.status = 'approved'
      WHERE s.teacher_id = $1
      GROUP BY s.id
      ORDER BY s.name ASC
    `;
    const result = await db.query(query, [req.user.userId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching subjects:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || name.trim() === '') {
        return res.status(400).json({ error: 'Chapter name is required.' });
    }
    
    const query = `
      INSERT INTO subjects (name, teacher_id)
      VALUES ($1, $2)
      RETURNING *
    `;
    const result = await db.query(query, [name, req.user.userId]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') { 
      return res.status(409).json({ error: 'A chapter with this name already exists.' });
    }
    console.error('Error creating subject:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { name } = req.body;
        const { id } = req.params;
        if (!name || name.trim() === '') {
            return res.status(400).json({ error: 'Chapter name is required.' });
        }

        const query = `
            UPDATE subjects 
            SET name = $1 
            WHERE id = $2 AND teacher_id = $3
            RETURNING *
        `;
        const result = await db.query(query, [name, id, req.user.userId]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Chapter not found or permission denied.' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({ error: 'A chapter with this name already exists.' });
        }
        console.error('Error updating subject:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.delete('/:id', authenticateToken, async (req, res) => {
    const client = await db.getClient();
    try {
        const { id } = req.params;
        
        await client.query('BEGIN');

        const updateQuestionsQuery = `
            UPDATE question_templates SET subject_id = NULL 
            WHERE subject_id = $1 AND teacher_id = $2
        `;
        await client.query(updateQuestionsQuery, [id, req.user.userId]);

        const deleteSubjectQuery = 'DELETE FROM subjects WHERE id = $1 AND teacher_id = $2';
        const result = await client.query(deleteSubjectQuery, [id, req.user.userId]);

        if (result.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Chapter not found or permission denied.' });
        }

        await client.query('COMMIT');
        res.status(204).send(); 
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error deleting subject:', error);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});

export default router;