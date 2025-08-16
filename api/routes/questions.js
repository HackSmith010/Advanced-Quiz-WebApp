import express from "express";
import { db } from "../database/schema.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

router.get("/", authenticateToken, async (req, res) => {
  try {
    const { status, subjectId } = req.query;
    const teacherId = req.user.userId;

    let query = `
      SELECT qt.*, s.name as subject_name 
      FROM question_templates qt
      LEFT JOIN subjects s ON qt.subject_id = s.id
      WHERE qt.teacher_id = $1
    `;
    const params = [teacherId];

    if (subjectId) {
      query += ` AND qt.subject_id = $2 AND qt.status = 'approved'`;
      params.push(subjectId);
    } else if (status) {
      query += ` AND qt.status = $2`;
      params.push(status);
    }

    query += ` ORDER BY qt.created_at DESC`;

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching questions:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", authenticateToken, async (req, res) => {
  const { type, original_text, question_template, category, details } =
    req.body;
  try {
    const query = `
            INSERT INTO question_templates (type, original_text, question_template, category, details, teacher_id, status)
            VALUES ($1, $2, $3, $4, $5, $6, 'pending_review')
            RETURNING *
        `;
    const result = await db.query(query, [
      type,
      original_text,
      question_template,
      category,
      details,
      req.user.userId,
    ]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error creating question:", error);
    res.status(500).json({ error: "Failed to create question" });
  }
});

// Update a question's status (approve, reject, restore)
router.put("/:id/status", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { status, subjectId } = req.body;
  try {
    let query;
    let params;

    if (status === "approved" && subjectId) {
      query = `UPDATE question_templates SET status = $1, subject_id = $2 WHERE id = $3 AND teacher_id = $4`;
      params = [status, subjectId, id, req.user.userId];
    } else if (status === "rejected") {
      query = `UPDATE question_templates SET status = $1, subject_id = NULL WHERE id = $2 AND teacher_id = $3`;
      params = [status, id, req.user.userId];
    } else if (status === "pending_review") {
      query = `UPDATE question_templates SET status = $1 WHERE id = $2 AND teacher_id = $3`;
      params = [status, id, req.user.userId];
    } else {
      return res.status(400).json({ error: "Invalid status update request" });
    }

    await db.query(query, params);
    res.json({ message: "Question status updated successfully" });
  } catch (error) {
    console.error("Error updating question status:", error);
    res.status(500).json({ error: "Failed to update question status" });
  }
});

// Update a question's content
router.put("/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { original_text, question_template, category, details } = req.body;
  try {
    const query = `
            UPDATE question_templates 
            SET original_text = $1, question_template = $2, category = $3, details = $4
            WHERE id = $5 AND teacher_id = $6
            RETURNING *
        `;
    const result = await db.query(query, [
      original_text,
      question_template,
      category,
      details,
      id,
      req.user.userId,
    ]);
    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ error: "Question not found or permission denied" });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating question:", error);
    res.status(500).json({ error: "Failed to update question" });
  }
});

// Delete a question permanently
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      "DELETE FROM question_templates WHERE id = $1 AND teacher_id = $2",
      [req.params.id, req.user.userId]
    );
    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ error: "Question not found or permission denied" });
    }
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting question:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
