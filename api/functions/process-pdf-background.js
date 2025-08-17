import pdf from "pdf-parse";
import { db } from "../database/schema.js";
import { processQuestionsWithAI } from "../utils/aiProcessor.js";

export const handler = async (event) => {
  const { fileBuffer, userId } = JSON.parse(event.body);

  const pdfBuffer = Buffer.from(fileBuffer.data);

  console.log("Background PDF processing started for user:", userId);

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

    const data = await pdf(pdfBuffer, options);
    const pagesText = data.text
      .split(/\n\n\n/)
      .filter((p) => p.trim().length > 0);
    let allGeneratedQuestions = [];

    for (const pageText of pagesText) {
      if (!pageText || pageText.trim().length < 20) continue;

      try {
        const generatedQuestions = await processQuestionsWithAI(pageText);
        if (generatedQuestions.length > 0) {
          allGeneratedQuestions.push(...generatedQuestions);
        }
      } catch (aiError) {
        console.error(
          `AI processing failed for a page. Error:`,
          aiError.message
        );
      }
    }

    console.log(
      `Background job found ${allGeneratedQuestions.length} total questions.`
    );

    if (allGeneratedQuestions.length > 0) {
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
            userId,
          ]);
        }
        await client.query("COMMIT");
        console.log(
          "✅ Successfully saved questions from background job to the database."
        );
      } catch (dbError) {
        await client.query("ROLLBACK");
        console.error("Database error in background job:", dbError);
      } finally {
        client.release();
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "PDF processing completed successfully.",
      }),
    };
  } catch (error) {
    console.error("Fatal error in background PDF processing:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Failed to process PDF in the background.",
      }),
    };
  }
};
