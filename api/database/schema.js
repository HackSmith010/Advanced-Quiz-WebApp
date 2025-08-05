import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

// Fix for __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database(path.join(__dirname, 'intelliquiz.db'));

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
const createTables = () => {
  // Users table (Teachers)
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'teacher',
      google_drive_token TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Students table
  db.exec(`
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      roll_number TEXT NOT NULL,
      email TEXT,
      teacher_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  
  // Add a UNIQUE constraint on roll_number per teacher_id
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_students_roll_number_teacher_id ON students (roll_number, teacher_id)`);

  // Question templates table
  db.exec(`
    CREATE TABLE IF NOT EXISTS question_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      original_text TEXT NOT NULL,
      question_template TEXT NOT NULL,
      variables TEXT NOT NULL, -- JSON string of variables array
      correct_answer_formula TEXT NOT NULL,
      distractor_formulas TEXT NOT NULL, -- JSON string of distractor formulas
      category TEXT,
      difficulty_level TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'pending_review', -- pending_review, approved, rejected
      teacher_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Tests table
  db.exec(`
    CREATE TABLE IF NOT EXISTS tests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      teacher_id INTEGER NOT NULL,
      duration_minutes INTEGER DEFAULT 60,
      marks_per_question INTEGER DEFAULT 1,
      total_questions INTEGER NOT NULL,
      status TEXT DEFAULT 'draft', -- draft, active, completed
      test_link TEXT UNIQUE NOT NULL,
      scheduled_date DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Test questions mapping table
  db.exec(`
    CREATE TABLE IF NOT EXISTS test_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      test_id INTEGER NOT NULL,
      question_template_id INTEGER NOT NULL,
      question_order INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE,
      FOREIGN KEY (question_template_id) REFERENCES question_templates(id) ON DELETE CASCADE
    )
  `);

  // Student test attempts table
  db.exec(`
    CREATE TABLE IF NOT EXISTS test_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      test_id INTEGER NOT NULL,
      student_id INTEGER,
      student_name TEXT NOT NULL,
      student_roll_number TEXT NOT NULL,
      start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      end_time DATETIME,
      total_score INTEGER DEFAULT 0,
      max_score INTEGER NOT NULL,
      status TEXT DEFAULT 'in_progress', -- in_progress, completed, abandoned
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE SET NULL
    )
  `);

  // Student answers table
  db.exec(`
    CREATE TABLE IF NOT EXISTS student_answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      attempt_id INTEGER NOT NULL,
      question_template_id INTEGER NOT NULL,
      generated_question TEXT NOT NULL, -- The actual question with generated values
      generated_values TEXT NOT NULL, -- JSON string of generated variable values
      student_answer TEXT,
      correct_answer TEXT NOT NULL,
      is_correct BOOLEAN DEFAULT FALSE,
      marks_obtained INTEGER DEFAULT 0,
      time_taken INTEGER, -- in seconds
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (attempt_id) REFERENCES test_attempts(id) ON DELETE CASCADE,
      FOREIGN KEY (question_template_id) REFERENCES question_templates(id) ON DELETE CASCADE
    )
  `);

  // PDF uploads table
  db.exec(`
    CREATE TABLE IF NOT EXISTS pdf_uploads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      teacher_id INTEGER NOT NULL,
      processing_status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
      questions_extracted INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  console.log('Database tables created successfully');
};

export { db, createTables };
