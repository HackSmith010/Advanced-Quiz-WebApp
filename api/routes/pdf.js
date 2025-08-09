import express from 'express';
import multer from 'multer';
import fs from 'fs';
import pdfParse from 'pdf-parse';

import { db } from '../database/schema.js';
import { authenticateToken } from '../middleware/auth.js';
import { processQuestionsWithAI } from '../utils/aiProcessor.js';

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload', authenticateToken, upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded.' });
    }

    const pdfData = await pdfParse(req.file.buffer);
    const fullText = pdfData.text;

    console.log(`Processing all ${pdfData.numpages} pages in a single API call...`);
    const allQuestionTemplates = await processQuestionsWithAI(fullText);
    
    const validTemplates = allQuestionTemplates.filter(t => 
        t && t.original_text && t.question_template && t.correct_answer_formula
    );
    
    console.log(`AI processing complete. Found ${validTemplates.length} valid questions.`);

    const client = await db.getClient();
    try {
        await client.query('BEGIN');
        const insertTemplateQuery = `
          INSERT INTO question_templates 
          (original_text, question_template, variables, correct_answer_formula, 
           distractor_formulas, category, teacher_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `;
        for (const template of validTemplates) {
            await client.query(insertTemplateQuery, [
              template.original_text,
              template.question_template,
              JSON.stringify(template.variables || []),
              template.correct_answer_formula,
              JSON.stringify(template.distractor_formulas || []),
              template.category || 'General',
              req.user.userId
            ]);
        }
        await client.query('COMMIT');
        res.status(201).json({ 
            message: `Successfully created ${validTemplates.length} question templates.` 
        });
    } catch (dbError) {
        await client.query('ROLLBACK');
        throw dbError; 
    } finally {
        client.release();
    }
  } catch (error) {
    console.error('Error processing PDF:', error);
    res.status(500).json({ error: 'Failed to process PDF.' });
  }
});

export default router;
