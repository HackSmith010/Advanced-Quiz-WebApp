import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import pdfParse from 'pdf-parse';
import { fileURLToPath } from 'url';

// Corrected import for the database schema
import {db} from '../database/schema.js';

import authenticateToken from '../middleware/auth.js';
import { processQuestionsWithAI } from '../utils/aiProcessor.js'; 

const router = express.Router();

// Fix for __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for PDF uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
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

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Upload and process PDF
router.post('/upload', authenticateToken, upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    // Save upload record
    const insertUpload = db.prepare(`
      INSERT INTO pdf_uploads (filename, original_name, file_path, teacher_id, processing_status)
      VALUES (?, ?, ?, ?, 'processing')
    `);
    
    const uploadResult = insertUpload.run(
      req.file.filename,
      req.file.originalname,
      req.file.path,
      req.user.userId
    );

    const uploadId = uploadResult.lastInsertRowid;

    // Process PDF in background
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
router.get('/upload/:id/status', authenticateToken, (req, res) => {
  try {
    const upload = db.prepare(`
      SELECT * FROM pdf_uploads 
      WHERE id = ? AND teacher_id = ?
    `).get(req.params.id, req.user.userId);

    if (!upload) {
      return res.status(404).json({ error: 'Upload not found' });
    }

    res.json(upload);
  } catch (error) {
    console.error('Error fetching upload status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all uploads for teacher
router.get('/uploads', authenticateToken, (req, res) => {
  try {
    const uploads = db.prepare(`
      SELECT * FROM pdf_uploads 
      WHERE teacher_id = ? 
      ORDER BY created_at DESC
    `).all(req.user.userId);

    res.json(uploads);
  } catch (error) {
    console.error('Error fetching uploads:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Background PDF processing function
async function processPDFAsync(uploadId, filePath, teacherId) {
  try {
    // Read and parse PDF
    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(dataBuffer);
    const text = pdfData.text;

    // Process with AI
    const questionTemplates = await processQuestionsWithAI(text);

    // Save question templates to database
    const insertTemplate = db.prepare(`
      INSERT INTO question_templates 
      (original_text, question_template, variables, correct_answer_formula, 
       distractor_formulas, category, teacher_id, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending_review')
    `);

    const transaction = db.transaction(() => {
      questionTemplates.forEach(template => {
        insertTemplate.run(
          template.original_text,
          template.question_template,
          JSON.stringify(template.variables),
          template.correct_answer_formula,
          JSON.stringify(template.distractor_formulas),
          template.category || 'General',
          teacherId
        );
      });
    });

    transaction();

    // Update upload status
    const updateUpload = db.prepare(`
      UPDATE pdf_uploads 
      SET processing_status = 'completed', questions_extracted = ?
      WHERE id = ?
    `);
    updateUpload.run(questionTemplates.length, uploadId);

  } catch (error) {
    console.error('Error processing PDF:', error);
    
    // Update upload status to failed
    const updateUpload = db.prepare(`
      UPDATE pdf_uploads 
      SET processing_status = 'failed'
      WHERE id = ?
    `);
    updateUpload.run(uploadId);
  }
}

// Corrected export
export default router;