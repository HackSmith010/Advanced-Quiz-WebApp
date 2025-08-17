import pdf from "pdf-parse";
import { db } from "../database/schema.js";
import { processQuestionsWithAI } from "../utils/aiProcessor.js";

export const handler = async (event) => {
  const { fileBuffer, userId, uploadId } = JSON.parse(event.body);
  const pdfBuffer = Buffer.from(fileBuffer.data);

  console.log(`Background job started for uploadId: ${uploadId}`);
  const client = await db.getClient();

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
      `Background job found ${allGeneratedQuestions.length} questions for uploadId: ${uploadId}.`
    );

    if (allGeneratedQuestions.length > 0) {
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
      await db.query(
        "UPDATE pdf_uploads SET status = 'completed' WHERE id = $1",
        [uploadId]
      );
      console.log(`✅ Successfully saved questions for uploadId: ${uploadId}.`);
    } else {
      await db.query("UPDATE pdf_uploads SET status = 'failed' WHERE id = $1", [
        uploadId,
      ]);
    }

    return { statusCode: 200, body: "Processing complete." };
  } catch (error) {
    console.error("Fatal error in background job:", error);
    await db.query("UPDATE pdf_uploads SET status = 'failed' WHERE id = $1", [
      uploadId,
    ]);
    return { statusCode: 500, body: "Processing failed." };
  } finally {
    client.release();
  }
};
