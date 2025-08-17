import express from 'express';
import { db } from '../database/schema.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT id, display_name, original_name, created_at 
      FROM pdf_uploads 
      WHERE teacher_id = $1 
      ORDER BY created_at DESC
    `;
    const result = await db.query(query, [req.user.userId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching uploads:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;