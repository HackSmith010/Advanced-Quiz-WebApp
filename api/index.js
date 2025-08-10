import 'dotenv/config';
import express, { json, urlencoded } from 'express';
import cors from 'cors';
import { join } from 'path';

import { createTables } from './database/schema.js';

import authRoutes from './routes/auth.js';
import studentRoutes from './routes/students.js';
import batchRoutes from './routes/batches.js';
import questionRoutes from './routes/questions.js';
import testRoutes from './routes/tests.js';
import quizRoutes from './routes/quiz.js';
import pdfRoutes from './routes/pdf.js';
import subjectRoutes from './routes/subjects.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Detect if running in Netlify Functions
const isServerless = process.env.NETLIFY === 'true';
const routePrefix = isServerless ? '' : '/api';

async function startServer() {
  await createTables();

  app.use(cors());
  app.use(json());
  app.use(urlencoded({ extended: true }));

  const rootDir = process.cwd();
  app.use('/uploads', express.static(join(rootDir, 'uploads')));

  // Use dynamic prefix so it works locally and on Netlify
  app.use(`${routePrefix}/auth`, authRoutes.default || authRoutes);
  app.use(`${routePrefix}/students`, studentRoutes.default || studentRoutes);
  app.use(`${routePrefix}/batches`, batchRoutes.default || batchRoutes);
  app.use(`${routePrefix}/questions`, questionRoutes.default || questionRoutes);
  app.use(`${routePrefix}/tests`, testRoutes.default || testRoutes);
  app.use(`${routePrefix}/quiz`, quizRoutes.default || quizRoutes);
  app.use(`${routePrefix}/pdf`, pdfRoutes.default || pdfRoutes);
  app.use(`${routePrefix}/subjects`, subjectRoutes.default || subjectRoutes);

  app.get(`${routePrefix}/health`, (req, res) => {
    res.json({ status: 'OK', message: 'IntelliQuiz AI API is running' });
  });

  app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  });

  if (!isServerless) {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

startServer();

export default app;
