import express from "express";
import multer from "multer";
import pdf from "pdf-parse";
import { db } from "../database/schema.js";
import { processQuestionsWithAI } from "../utils/aiProcessor.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

async function processPdfInBackground(fileBuffer, userId, displayName, originalName) {
  const client = await db.getClient();
  try {
    const uploadResult = await client.query(
      `INSERT INTO pdf_uploads (display_name, original_name, teacher_id, status) VALUES ($1, $2, $3, 'processing') RETURNING id`,
      [displayName, originalName, userId]
    );
    const uploadId = uploadResult.rows[0].id;

    console.log("Starting background processing for uploadId:", uploadId);

    const options = {
      pagerender: (pageData) => {
        return pageData.getTextContent({ normalizeWhitespace: true })
          .then(textContent => textContent.items.map(item => item.str).join(' '));
      }
    };

    const data = await pdf(fileBuffer, options);
    const text = data.text;

    const chunkSize = 8000;  
    const chunkOverlap = 250;  
    const chunks = [];

    for (let i = 0; i < text.length; i += chunkSize - chunkOverlap) {
      chunks.push(text.substring(i, i + chunkSize));
    }
    console.log(`PDF text split into ${chunks.length} chunks for processing.`);

    const promises = chunks.map((chunk, index) => {
        console.log(`  > Processing chunk ${index + 1} of ${chunks.length}...`);
        return processQuestionsWithAI(chunk);
    });

    const resultsFromChunks = await Promise.all(promises);
    const allGeneratedQuestions = resultsFromChunks.flat();

    console.log(`\nAI processing complete. Found ${allGeneratedQuestions.length} total valid questions.`);

    if (allGeneratedQuestions.length > 0) {
      await client.query('BEGIN');
      const insertQuery = `
          INSERT INTO question_templates (type, original_text, question_template, category, details, teacher_id, status)
          VALUES ($1, $2, $3, $4, $5, $6, 'pending_review')
      `;
      for (const q of allGeneratedQuestions) {
        await client.query(insertQuery, [
          q.type, q.original_text, q.question_template, q.category, q.details, userId
        ]);
      }
      await client.query('COMMIT');
      await db.query("UPDATE pdf_uploads SET status = 'completed' WHERE id = $1", [uploadId]);
      console.log(`✅ Questions successfully saved for uploadId: ${uploadId}.`);
    } else {
      await db.query("UPDATE pdf_uploads SET status = 'failed' WHERE id = $1", [uploadId]);
      console.warn("No questions were generated from the PDF.");
    }
  } catch (error) {
    console.error('Error during background PDF processing:', error);
  } finally {
    client.release();
  }
}


router.post(
  "/upload",
  authenticateToken,
  upload.single("pdf"),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No PDF file uploaded." });
    }

    res.status(202).json({
      message:
        "Your PDF is being processed. Questions will appear in 'Pending Review' shortly.",
    });

    processPdfInBackground(
      req.file.buffer,
      req.user.userId,
      req.body.displayName,
      req.file.originalname
    );
  }
);

export default router;
