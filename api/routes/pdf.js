import express from "express";
import multer from "multer";
import pdf from "pdf-parse";
import { db } from "../database/schema.js";
import { processQuestionsWithAI } from "../utils/aiProcessor.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post(
  "/upload",
  authenticateToken,
  upload.single("pdf"),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No PDF file uploaded." });
    }

    try {
      const options = {
        pagerender: (pageData) => {
          return pageData
            .getTextContent({ normalizeWhitespace: true })
            .then((textContent) =>
              textContent.items.map((item) => item.str).join(" ")
            );
        },
      };

      const data = await pdf(req.file.buffer, options);
      const totalPages = data.numpages;
      let allGeneratedQuestions = [];

      const pagesText = data.text
        .split(/\n\n\n/)
        .filter((p) => p.trim().length > 0);

      // Process the PDF one page at a time to conserve API calls.
      for (let i = 0; i < pagesText.length; i++) {
        const pageText = pagesText[i];
        console.log(`\nProcessing Page ${i + 1} of ${totalPages}...`);

        if (!pageText || pageText.trim().length < 20) {
          console.log(`Page ${i + 1} has insufficient content. Skipping.`);
          continue;
        }

        try {
          const generatedQuestions = await processQuestionsWithAI(pageText);
          console.log(
            `✅ AI found ${generatedQuestions.length} questions on page ${
              i + 1
            }.`
          );

          if (generatedQuestions.length > 0) {
            allGeneratedQuestions.push(...generatedQuestions);
          }
        } catch (aiError) {
          console.error(
            `AI processing failed for page ${i + 1}. Error:`,
            aiError.message
          );
        }
      }

      console.log(
        `\nAI processing complete. Found ${allGeneratedQuestions.length} total valid questions.`
      );

      if (allGeneratedQuestions.length === 0) {
        return res
          .status(400)
          .json({
            error: "No valid questions could be extracted from the PDF.",
          });
      }

      // Save all successfully extracted questions to the database.
      const client = await db.getClient();
      try {
        await client.query("BEGIN");
        const insertQuery = `
            INSERT INTO question_templates (type, original_text, question_template, category, details, teacher_id, status)
            VALUES ($1, $2, $3, $4, $5, $6, 'pending_review')
        `;
        for (const q of allGeneratedQuestions) {
          const details =
            q.type === "numerical"
              ? {
                  variables: q.variables,
                  correct_answer_formula: q.correct_answer_formula,
                  distractor_formulas: q.distractor_formulas,
                }
              : q.details;

          await client.query(insertQuery, [
            q.type,
            q.original_text,
            q.question_template,
            q.category,
            details,
            req.user.userId,
          ]);
        }
        await client.query("COMMIT");
      } catch (dbError) {
        await client.query("ROLLBACK");
        console.error("Database error during question insertion:", dbError);
        return res.status(500).json({ error: "Failed to save questions." });
      } finally {
        client.release();
      }

      res.status(201).json({
        message: `Successfully added ${allGeneratedQuestions.length} new questions for review.`,
      });
    } catch (error) {
      console.error("Error processing PDF upload:", error);
      res
        .status(500)
        .json({ error: error.message || "Failed to process PDF." });
    }
  }
);

export default router;
