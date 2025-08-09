import express from 'express';
import multer from 'multer';
import fs from 'fs';
import pdfParse from 'pdf-parse';

import { db } from '../database/schema.js';
import { authenticateToken } from '../middleware/auth.js';
import { processQuestionsWithAI } from '../utils/aiProcessor.js';

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = '/tmp/uploads'; 
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'pdf-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

async function processPDFAsync(uploadId, filePath, teacherId) {
  let client;
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const pagesText = [];

    const pdfData = await pdfParse(dataBuffer, {
      pagerender: (pageData) => {
        return pageData.getTextContent({ normalizeWhitespace: true })
          .then(textContent => {
            const pageText = textContent.items.map(item => item.str).join(' ');
            pagesText.push(pageText);
            return pageText;
          });
      }
    });

    let allQuestionTemplates = [];
    for (let i = 0; i < pagesText.length; i++) {
      const pageText = pagesText[i];
      console.log(`Processing Page ${i + 1} of ${pagesText.length}...`);
      if (pageText && pageText.trim().length > 50) { 
        const templatesFromPage = await processQuestionsWithAI(pageText);
        if (templatesFromPage && Array.isArray(templatesFromPage)) {
            allQuestionTemplates.push(...templatesFromPage);
        }
      }
    }
    
    const validTemplates = allQuestionTemplates.filter(template => 
        template &&
        typeof template.original_text === 'string' &&
        typeof template.question_template === 'string' &&
        typeof template.correct_answer_formula === 'string' &&
        Array.isArray(template.variables) &&
        Array.isArray(template.distractor_formulas)
    );
    
    console.log(`AI processing complete. Found ${allQuestionTemplates.length} potential questions, ${validTemplates.length} are valid and will be saved.`);

    client = await db.getClient();
    await client.query('BEGIN');

    const insertTemplateQuery = `
      INSERT INTO question_templates 
      (original_text, question_template, variables, correct_answer_formula, 
       distractor_formulas, category, teacher_id, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending_review')
    `;

    for (const template of validTemplates) {
        await client.query(insertTemplateQuery, [
          template.original_text,
          template.question_template,
          JSON.stringify(template.variables),
          template.correct_answer_formula,
          JSON.stringify(template.distractor_formulas),
          template.category || 'General',
          teacherId
        ]);
    }

    const updateUploadQuery = `
      UPDATE pdf_uploads 
      SET processing_status = 'completed', questions_extracted = $1
      WHERE id = $2
    `;
    await client.query(updateUploadQuery, [validTemplates.length, uploadId]);

    await client.query('COMMIT');

  } catch (error) {
    if (client) await client.query('ROLLBACK');
    console.error('Error processing PDF:', error);
    await db.query(`UPDATE pdf_uploads SET processing_status = 'failed' WHERE id = $1`, [uploadId]);
  } finally {
    if (client) client.release();
    try {
      fs.unlinkSync(filePath);
    } catch (cleanupError) {
      console.error('Error deleting uploaded PDF file:', cleanupError);
    }
  }
}

router.post('/upload', authenticateToken, upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }
    const insertQuery = `
      INSERT INTO pdf_uploads (filename, original_name, file_path, teacher_id, processing_status)
      VALUES ($1, $2, $3, $4, 'processing')
      RETURNING id
    `;
    const uploadResult = await db.query(insertQuery, [
      req.file.filename,
      req.file.originalname,
      req.file.path,
      req.user.userId
    ]);
    const uploadId = uploadResult.rows[0].id;

    processPDFAsync(uploadId, req.file.path, req.user.userId);

    res.status(202).json({
      upload_id: uploadId,
      message: 'PDF uploaded successfully. Processing has started.'
    });
  } catch (error) {
    console.error('Error uploading PDF:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/upload/:id/status', authenticateToken, async (req, res) => {
    try {
      const result = await db.query(
        'SELECT * FROM pdf_uploads WHERE id = $1 AND teacher_id = $2',
        [req.params.id, req.user.userId]
      );
      const upload = result.rows[0];
  
      if (!upload) {
        return res.status(404).json({ error: 'Upload not found' });
      }
      res.json(upload);
    } catch (error) {
      console.error('Error fetching upload status:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/uploads', authenticateToken, async (req, res) => {
    try {
      const result = await db.query(
        'SELECT * FROM pdf_uploads WHERE teacher_id = $1 ORDER BY created_at DESC',
        [req.user.userId]
      );
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching uploads:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
