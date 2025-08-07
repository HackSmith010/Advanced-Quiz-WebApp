import 'dotenv/config';
import express, { json, urlencoded } from 'express';
import cors from 'cors';
import path, { join } from 'path';
import { fileURLToPath } from 'url';

import { createTables } from './database/schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import authRoutes from './routes/auth.js';
import studentRoutes from './routes/students.js';
import questionRoutes from './routes/questions.js';
import testRoutes from './routes/tests.js';
import quizRoutes from './routes/quiz.js';
import pdfRoutes from './routes/pdf.js';

const app = express();
const { static: expressStatic } = express;
const PORT = process.env.PORT || 3001;

createTables();

app.use(cors());
app.use(json());
app.use(urlencoded({ extended: true }));

app.use('/uploads', expressStatic(join(__dirname, '../uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/pdf', pdfRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'IntelliQuiz AI API is running' });
});

app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`IntelliQuiz AI server running on http://localhost:${PORT}`);
  });
}

export default app;
