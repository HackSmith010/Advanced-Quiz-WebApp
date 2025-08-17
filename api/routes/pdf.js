import express from 'express';
import multer from 'multer';
import { db } from '../database/schema.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// This route now handles GET requests to fetch upload history
router.get('/uploads', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT id, display_name, original_name, status, created_at 
      FROM pdf_uploads 
      WHERE teacher_id = $1 
      ORDER BY created_at DESC
    `;
    const result = await db.query(query, [req.user.userId]);
    res.json(result.rows);
  } catch (error){
    console.error('Error fetching uploads:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// This route handles the POST request to upload a new PDF
router.post('/upload', authenticateToken, upload.single('pdf'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No PDF file uploaded.' });
  }

  const { displayName } = req.body;
  const client = await db.getClient();
  
  try {
    const insertUploadQuery = `
        INSERT INTO pdf_uploads (display_name, original_name, teacher_id, status)
        VALUES ($1, $2, $3, 'processing')
        RETURNING id
    `;
    const result = await client.query(insertUploadQuery, [
        displayName,
        req.file.originalname,
        req.user.userId
    ]);
    const uploadId = result.rows[0].id;

    const backgroundFunctionUrl = `${process.env.URL}/.netlify/functions/process-pdf-background`;

    const payload = {
      fileBuffer: req.file.buffer,
      userId: req.user.userId,
      uploadId: uploadId,
    };

    fetch(backgroundFunctionUrl, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { "x-netlify-lambda-asynchronous-ok": "true" },
    });

    res.status(202).json({ 
      message: "Your PDF is being processed in the background. Questions will appear shortly." 
    });

  } catch (error) {
    console.error('Error in upload route:', error);
    res.status(500).json({ error: 'Failed to start PDF processing.' });
  } finally {
      client.release();
  }
});

export default router;