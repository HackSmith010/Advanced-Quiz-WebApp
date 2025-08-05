import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import pdfParse from 'pdf-parse';
import { fileURLToPath } from 'url';
import { db } from '../database/schema.js';
import { authenticateToken } from '../middleware/auth.js';
import { processQuestionsWithAI } from '../utils/aiProcessor.js';

const router = express.Router();

// Fix for __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for PDF uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads'); // Adjusted path for api folder
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

// Upload and process PDF
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

    res.json({
      upload_id: uploadId,
      message: 'PDF uploaded successfully. Processing in background.'
    });
  } catch (error) {
    console.error('Error uploading PDF:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get upload status
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

// Background PDF processing function
async function processPDFAsync(uploadId, filePath, teacherId) {
  const client = await db.getClient(); // Get a client from the pool for transaction
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(dataBuffer);
    const text = pdfData.text;

    const questionTemplates = await processQuestionsWithAI(text);

    await client.query('BEGIN'); // Start transaction

    const insertTemplateQuery = `
      INSERT INTO question_templates 
      (original_text, question_template, variables, correct_answer_formula, 
       distractor_formulas, category, teacher_id, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending_review')
    `;

    for (const template of questionTemplates) {
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
    await client.query(updateUploadQuery, [questionTemplates.length, uploadId]);

    await client.query('COMMIT'); // Commit transaction
  } catch (error) {
    await client.query('ROLLBACK'); // Rollback on error
    console.error('Error processing PDF:', error);
    
    const updateQuery = `
      UPDATE pdf_uploads SET processing_status = 'failed' WHERE id = $1
    `;
    await db.query(updateQuery, [uploadId]);
  } finally {
    client.release(); // Release client back to the pool
  }
}

export default router;