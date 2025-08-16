import express from "express";
import { db } from "../database/schema.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

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

router.post("/", authenticateToken, async (req, res) => {
  try {
    const { name, roll_number, email } = req.body;

    const insertQuery = `
      INSERT INTO students (name, roll_number, email, teacher_id, created_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      RETURNING *
    `;
    const result = await db.query(insertQuery, [
      name,
      roll_number,
      email || null,
      req.user.userId,
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === "23505") {
      return res
        .status(409)
        .json({ error: "A student with this roll number already exists." });
    }
    console.error("Error adding student:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const { name, roll_number, email } = req.body;
    const studentId = req.params.id;

    const existingStudentResult = await db.query(
      "SELECT id FROM students WHERE roll_number = $1 AND teacher_id = $2 AND id != $3",
      [roll_number, req.user.userId, studentId]
    );
    if (existingStudentResult.rows.length > 0) {
      return res
        .status(409)
        .json({
          error: "This roll number is already assigned to another student.",
        });
    }

    const updateQuery = `
      UPDATE students 
      SET name = $1, roll_number = $2, email = $3, updated_at = CURRENT_TIMESTAMP
      WHERE id = $4 AND teacher_id = $5
      RETURNING *
    `;
    const result = await db.query(updateQuery, [
      name,
      roll_number,
      email || null,
      studentId,
      req.user.userId,
    ]);

    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ error: "Student not found or permission denied" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    if (error.code === "23505") {
      return res
        .status(409)
        .json({ error: "A student with this roll number already exists." });
    }
    console.error("Error updating student:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      "DELETE FROM students WHERE id = $1 AND teacher_id = $2",
      [req.params.id, req.user.userId]
    );

    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ error: "Student not found or permission denied" });
    }

    res.status(204).send(); 
  } catch (error) {
    console.error("Error deleting student:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
