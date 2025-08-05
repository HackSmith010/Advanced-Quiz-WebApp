import express, { json, urlencoded } from 'express';
import cors from 'cors';
import path, { join } from 'path';
import { fileURLToPath } from 'url';

// Corrected import for the database schema
import { createTables } from './database/schema.js';

// --- FIX for __dirname in ES Modules ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// -----------------------------------------

// Import routes with .js extension
import authRoutes from './routes/auth.js';
import studentRoutes from './routes/students.js';
import questionRoutes from './routes/questions.js';
import testRoutes from './routes/tests.js';
import quizRoutes from './routes/quiz.js';
import pdfRoutes from './routes/pdf.js';

const app = express();
const { static: expressStatic } = express;

// Initialize database
createTables();

// Middleware
app.use(cors());
app.use(json());
app.use(urlencoded({ extended: true }));

app.use('/uploads', expressStatic(join(__dirname, '../uploads'))); // Adjusted path for new structure

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/pdf', pdfRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'IntelliQuiz AI API is running' });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;