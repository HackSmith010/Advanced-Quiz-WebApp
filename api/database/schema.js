import pg from "pg";
import dns from "dns";

dns.setDefaultResultOrder("ipv4first");

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const db = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
};

async function connectWithRetry(retries = 3, delayMs = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      const client = await pool.connect();
      client.release();
      console.log(`✅ Database connection established (attempt ${i + 1})`);
      return;
    } catch (err) {
      console.error(
        `❌ Database connection failed (attempt ${i + 1}):`,
        err.message
      );
      if (i === retries - 1) throw err;
      await new Promise((res) => setTimeout(res, delayMs));
    }
  }
}

const createTables = async () => {
  await connectWithRetry();
  const client = await pool.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT DEFAULT 'teacher',
        status TEXT DEFAULT 'pending', -- pending | approved
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
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
      CREATE TABLE IF NOT EXISTS pdf_uploads (
        id SERIAL PRIMARY KEY,
        display_name TEXT NOT NULL,
        original_name TEXT NOT NULL,
        teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS subjects (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(name, teacher_id)
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
        subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
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
        number_of_questions INTEGER, -- MODIFIED: This field is required by the new logic.
        test_link TEXT UNIQUE NOT NULL,
        status TEXT DEFAULT 'draft',
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
        status TEXT DEFAULT 'in_progress',
        tab_change_count INTEGER DEFAULT 0
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS student_answers (
        id SERIAL PRIMARY KEY,
        attempt_id INTEGER NOT NULL REFERENCES test_attempts(id) ON DELETE CASCADE,
        question_template_id INTEGER NOT NULL REFERENCES question_templates(id),
        generated_question TEXT NOT NULL,
        student_answer TEXT,
        correct_answer TEXT NOT NULL,
        is_correct BOOLEAN NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    console.log("✅ Database tables checked/created successfully");
  } catch (err) {
    console.error("❌ Error creating tables:", err.stack);
  } finally {
    client.release();
  }
};

export { db, createTables };
