import 'dotenv/config';
import express, { json, urlencoded } from 'express';
import cors from 'cors';
import path, { join } from 'path';
import { fileURLToPath } from 'url';

import { createTables } from './database/schema.js';

import authRoutes from './routes/auth.js';
import studentRoutes from './routes/students.js';
import questionRoutes from './routes/questions.js';
import testRoutes from './routes/tests.js';
import quizRoutes from './routes/quiz.js';
import pdfRoutes from './routes/pdf.js';
import batchRoutes from './routes/batches.js'; 

const app = express();
const { static: expressStatic } = express;
const PORT = process.env.PORT || 3001;

createTables();

app.use(cors());
app.use(json());
app.use(urlencoded({ extended: true }));

const rootDir = process.cwd();
app.use('/uploads', expressStatic(join(rootDir, 'uploads')));

// Routes
app.use('/api/auth', authRoutes.default || authRoutes);
app.use('/api/students', studentRoutes.default || studentRoutes);
app.use('/api/questions', questionRoutes.default || questionRoutes);
app.use('/api/tests', testRoutes.default || testRoutes);
app.use('/api/quiz', quizRoutes.default || quizRoutes);
app.use('/api/pdf', pdfRoutes.default || pdfRoutes);
app.use('/api/batches', batchRoutes.default || batchRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'API is running' });
});

app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;

