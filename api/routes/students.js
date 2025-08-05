import { Router } from 'express';
import {db} from '../database/schema.js';
import authenticateToken from '../middleware/auth.js';
const router = Router();

// Get all students for a teacher
router.get('/', authenticateToken, (req, res) => {
  try {
    const students = db.prepare(`
      SELECT * FROM students 
      WHERE teacher_id = ? 
      ORDER BY name
    `).all(req.user.userId);

    res.json(students);
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add new student
router.post('/', authenticateToken, (req, res) => {
  try {
    const { name, rollNumber, email } = req.body;

    // Check if roll number already exists
    const existingStudent = db.prepare(
      'SELECT * FROM students WHERE roll_number = ? AND teacher_id = ?'
    ).get(rollNumber, req.user.userId);

    if (existingStudent) {
      return res.status(400).json({ error: 'Roll number already exists' });
    }

    const stmt = db.prepare(`
      INSERT INTO students (name, roll_number, email, teacher_id)
      VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run(name, rollNumber, email || null, req.user.userId);

    res.status(201).json({
      id: result.lastInsertRowid,
      name,
      roll_number: rollNumber,
      email,
      teacher_id: req.user.userId
    });
  } catch (error) {
    console.error('Error adding student:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update student
router.put('/:id', authenticateToken, (req, res) => {
  try {
    const { name, rollNumber, email } = req.body;
    const studentId = req.params.id;

    // Check if roll number exists for another student
    const existingStudent = db.prepare(
      'SELECT * FROM students WHERE roll_number = ? AND teacher_id = ? AND id != ?'
    ).get(rollNumber, req.user.userId, studentId);

    if (existingStudent) {
      return res.status(400).json({ error: 'Roll number already exists' });
    }

    const stmt = db.prepare(`
      UPDATE students 
      SET name = ?, roll_number = ?, email = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND teacher_id = ?
    `);
    const result = stmt.run(name, rollNumber, email || null, studentId, req.user.userId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json({ message: 'Student updated successfully' });
  } catch (error) {
    console.error('Error updating student:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete student
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const stmt = db.prepare('DELETE FROM students WHERE id = ? AND teacher_id = ?');
    const result = stmt.run(req.params.id, req.user.userId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;