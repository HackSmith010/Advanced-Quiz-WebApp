import express from 'express';
import multer from 'multer';
import fs from 'fs';
import pdfParse from 'pdf-parse';

import { db } from '../database/schema.js';
import { authenticateToken } from '../middleware/auth.js';
import { processQuestionsWithAI } from '../utils/aiProcessor.js';

const router = express.Router();
// Use memory storage as we don't need to save the file long-term
const upload = multer({ storage: multer.memoryStorage() });

// This is the main background processing function.
async function processPDFAsync(pdfBuffer, teacherId) {
  let totalValidTemplates = 0;
  try {
    const pagesText = [];

    // Use pdf-parse with an option to render pages individually
    await pdfParse(pdfBuffer, {
      pagerender: (pageData) => {
        return pageData.getTextContent({ normalizeWhitespace: true })
          .then(textContent => {
            pagesText.push(textContent.items.map(item => item.str).join(' '));
          });
      }
    });

    // Process each page's text one by one
    for (let i = 0; i < pagesText.length; i++) {
      const pageText = pagesText[i];
      console.log(`Processing Page ${i + 1} of ${pagesText.length}...`);
      
      if (pageText && pageText.trim().length > 50) {
        try {
          const templatesFromPage = await processQuestionsWithAI(pageText);
          
          if (templatesFromPage && Array.isArray(templatesFromPage)) {
            const validTemplates = templatesFromPage.filter(t => t && t.original_text && t.question_template && t.correct_answer_formula);
            
            if (validTemplates.length > 0) {
              const client = await db.getClient();
              try {
                await client.query('BEGIN');
                const insertTemplateQuery = `
                  INSERT INTO question_templates 
                  (original_text, question_template, variables, correct_answer_formula, 
                   distractor_formulas, category, teacher_id, status)
                  VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending_review')
                `;
                for (const template of validTemplates) {
                    await client.query(insertTemplateQuery, [
                      template.original_text, template.question_template, JSON.stringify(template.variables),
                      template.correct_answer_formula, JSON.stringify(template.distractor_formulas),
                      template.category || 'General', teacherId
                    ]);
                }
                await client.query('COMMIT');
                console.log(`Successfully saved ${validTemplates.length} questions from page ${i + 1}.`);
                totalValidTemplates += validTemplates.length;
              } catch (dbError) {
                await client.query('ROLLBACK');
                console.error(`Database error on page ${i + 1}:`, dbError);
              } finally {
                client.release();
              }
            }
          }
        } catch (aiError) {
          console.error(`AI processing failed for page ${i + 1}. Continuing to next page. Error:`, aiError.message);
        }

        // Wait before the next API call to respect rate limits
        if (i < pagesText.length - 1) {
            console.log('Waiting for 5 seconds to respect API rate limits...');
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
    }
    
    console.log(`AI processing complete. Found ${totalValidTemplates} total valid questions.`);
    // NOTE: We no longer update a separate upload status table in this version.

  } catch (error) {
    console.error('An unexpected error occurred during PDF processing:', error);
  }
}

// --- API Routes ---
router.post('/upload', authenticateToken, upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded.' });
    }

    // Start the background process without waiting for it to finish
    processPDFAsync(req.file.buffer, req.user.userId);

    res.status(202).json({
      message: 'PDF received. Processing has started in the background. Questions will appear in the bank shortly.'
    });
  } catch (error) {
    console.error('Error in upload route:', error);
    res.status(500).json({ error: 'Failed to start PDF processing.' });
  }
});

export default router;
