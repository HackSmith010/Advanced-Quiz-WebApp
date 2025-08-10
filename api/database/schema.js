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
    // Users table (Teachers)
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT DEFAULT 'teacher',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Students table
    await client.query(`
      CREATE TABLE IF NOT EXISTS students (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        roll_number TEXT NOT NULL,
        email TEXT,
        teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(roll_number, teacher_id)
      )
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS batches (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(name, teacher_id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS student_batches (
        student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        batch_id INTEGER NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
        PRIMARY KEY (student_id, batch_id)
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
        status TEXT DEFAULT 'pending_review',
        teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
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
        test_link TEXT UNIQUE NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS test_questions (
        test_id INTEGER NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
        question_template_id INTEGER NOT NULL REFERENCES question_templates(id) ON DELETE CASCADE,
        PRIMARY KEY (test_id, question_template_id)
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
        status TEXT DEFAULT 'in_progress'
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
