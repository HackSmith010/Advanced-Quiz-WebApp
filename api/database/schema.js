import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const db = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
};

const createTables = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT DEFAULT 'teacher',
        google_drive_token TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS students (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        roll_number TEXT NOT NULL,
        email TEXT,
        teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(roll_number, teacher_id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS question_templates (
        id SERIAL PRIMARY KEY,
        original_text TEXT NOT NULL,
        question_template TEXT NOT NULL,
        variables JSONB NOT NULL,
        correct_answer_formula TEXT NOT NULL,
        distractor_formulas JSONB NOT NULL,
        category TEXT,
        difficulty_level TEXT DEFAULT 'medium',
        status TEXT DEFAULT 'pending_review',
        teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS tests (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        duration_minutes INTEGER DEFAULT 60,
        marks_per_question INTEGER DEFAULT 1,
        total_questions INTEGER NOT NULL,
        status TEXT DEFAULT 'draft',
        test_link TEXT UNIQUE NOT NULL,
        scheduled_date TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS test_questions (
        id SERIAL PRIMARY KEY,
        test_id INTEGER NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
        question_template_id INTEGER NOT NULL REFERENCES question_templates(id) ON DELETE CASCADE,
        question_order INTEGER NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS test_attempts (
        id SERIAL PRIMARY KEY,
        test_id INTEGER NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
        student_id INTEGER REFERENCES students(id) ON DELETE SET NULL,
        student_name TEXT NOT NULL,
        student_roll_number TEXT NOT NULL,
        start_time TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        end_time TIMESTAMPTZ,
        total_score INTEGER DEFAULT 0,
        max_score INTEGER NOT NULL,
        status TEXT DEFAULT 'in_progress',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS student_answers (
        id SERIAL PRIMARY KEY,
        attempt_id INTEGER NOT NULL REFERENCES test_attempts(id) ON DELETE CASCADE,
        question_template_id INTEGER NOT NULL REFERENCES question_templates(id) ON DELETE CASCADE,
        generated_question TEXT NOT NULL,
        generated_values JSONB NOT NULL,
        student_answer TEXT,
        correct_answer TEXT NOT NULL,
        is_correct BOOLEAN DEFAULT FALSE,
        marks_obtained INTEGER DEFAULT 0,
        time_taken INTEGER,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS pdf_uploads (
        id SERIAL PRIMARY KEY,
        filename TEXT NOT NULL,
        original_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        processing_status TEXT DEFAULT 'pending',
        questions_extracted INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Database tables checked/created successfully');
  } catch (err) {
    console.error('Error creating tables:', err.stack);
  } finally {
    client.release();
  }
};

export { db, createTables };