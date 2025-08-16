import express from "express";
import { db } from "../database/schema.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

router.get("/", authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT s.*, COUNT(qt.id)::int as question_count 
       FROM subjects s 
       LEFT JOIN question_templates qt ON s.id = qt.subject_id AND qt.status = 'approved'
       WHERE s.teacher_id = $1 
       GROUP BY s.id 
       ORDER BY s.name`,
      [req.user.userId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", authenticateToken, async (req, res) => {
  try {
    const { name } = req.body;
    const query = `
      INSERT INTO subjects (name, teacher_id)
      VALUES ($1, $2)
      RETURNING *
    `;
    const result = await db.query(query, [name, req.user.userId]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === "23505") {
      return res
        .status(409)
        .json({ error: "A chapter with this name already exists." });
    }
    console.error("Error creating subject:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
