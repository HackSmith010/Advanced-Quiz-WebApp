import express from "express";
import { db } from "../database/schema.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// Get all students for a teacher
router.get("/", authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM students WHERE teacher_id = $1 ORDER BY name",
      [req.user.userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching students:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Add new student
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { name, rollNumber, email } = req.body;

    // Check if roll number already exists
    const existingStudentResult = await db.query(
      "SELECT * FROM students WHERE roll_number = $1 AND teacher_id = $2",
      [rollNumber, req.user.userId]
    );
    if (existingStudentResult.rows.length > 0) {
      return res.status(400).json({ error: "Roll number already exists" });
    }

    const insertQuery = `
      INSERT INTO students (name, roll_number, email, teacher_id)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `;
    const result = await db.query(insertQuery, [
      name,
      rollNumber,
      email || null,
      req.user.userId,
    ]);

    res.status(201).json({
      id: result.rows[0].id,
      name,
      roll_number: rollNumber,
      email,
      teacher_id: req.user.userId,
    });
  } catch (error) {
    console.error("Error adding student:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update student
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const { name, roll_number, email } = req.body;
    const studentId = req.params.id;

    const existingStudentResult = await db.query(
      "SELECT * FROM students WHERE roll_number = $1 AND teacher_id = $2 AND id != $3",
      [roll_number, req.user.userId, studentId]
    );
    if (existingStudentResult.rows.length > 0) {
      return res.status(400).json({ error: "Roll number already exists" });
    }

    const updateQuery = `
  UPDATE students 
  SET name = $1, roll_number = $2, email = $3
  WHERE id = $4 AND teacher_id = $5
`;
    const result = await db.query(updateQuery, [
      name,
      roll_number,
      email || null,
      studentId,
      req.user.userId,
    ]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Student not found" });
    }

    res.json({ message: "Student updated successfully" });
  } catch (error) {
    console.error("Error updating student:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Delete student
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      "DELETE FROM students WHERE id = $1 AND teacher_id = $2",
      [req.params.id, req.user.userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Student not found" });
    }

    res.json({ message: "Student deleted successfully" });
  } catch (error) {
    console.error("Error deleting student:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
