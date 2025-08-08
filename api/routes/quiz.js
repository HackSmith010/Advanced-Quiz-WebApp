import express from 'express';
import { db } from '../database/schema.js';
import { generateQuestionForStudent } from '../utils/questionGenerator.js';

const router = express.Router();

router.get('/test/:testLink', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM tests WHERE test_link = $1 AND status = 'active'`,
      [req.params.testLink]
    );
    const test = result.rows[0];

    if (!test) {
      return res.status(404).json({ error: 'Test not found or not active' });
    }

    res.json({
      id: test.id,
      title: test.title,
      description: test.description,
      duration_minutes: test.duration_minutes,
      total_questions: test.total_questions,
      marks_per_question: test.marks_per_question
    });
  } catch (error) {
    console.error('Error fetching test:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/test/:testLink/start', async (req, res) => {
  try {
    const { student_name, roll_number } = req.body;
    const { testLink } = req.params;

    const testResult = await db.query(
      `SELECT * FROM tests WHERE test_link = $1 AND status = 'active'`,
      [testLink]
    );
    const test = testResult.rows[0];
    if (!test) {
      return res.status(404).json({ error: 'Test not found or not active' });
    }

    const existingAttemptResult = await db.query(
      `SELECT * FROM test_attempts WHERE test_id = $1 AND student_roll_number = $2 AND status != 'abandoned'`,
      [test.id, roll_number]
    );
    const existingAttempt = existingAttemptResult.rows[0];
    if (existingAttempt) {
      return res.status(400).json({ error: 'You have already attempted this test.' });
    }

    const studentResult = await db.query(
      `SELECT * FROM students WHERE roll_number = $1 AND teacher_id = $2`,
      [roll_number, test.teacher_id]
    );
    let student = studentResult.rows[0];

    if (!student) {
      const insertStudentResult = await db.query(
        `INSERT INTO students (name, roll_number, teacher_id) VALUES ($1, $2, $3) RETURNING id`,
        [student_name, roll_number, test.teacher_id]
      );
      student = { id: insertStudentResult.rows[0].id };
    }

    const insertAttemptQuery = `
      INSERT INTO test_attempts (test_id, student_id, student_name, student_roll_number, max_score)
      VALUES ($1, $2, $3, $4, $5) RETURNING id
    `;
    const attemptResult = await db.query(insertAttemptQuery, [
      test.id, student.id, student_name, roll_number, test.total_questions * test.marks_per_question
    ]);

    res.json({ attempt_id: attemptResult.rows[0].id });
  } catch (error) {
    console.error('Error starting test attempt:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/attempt/:attemptId/questions', async (req, res) => {
  const client = await db.getClient();
  try {
    const { attemptId } = req.params;

    const attemptResult = await client.query(
      `SELECT ta.*, t.test_link, t.title, t.duration_minutes
       FROM test_attempts ta JOIN tests t ON ta.test_id = t.id
       WHERE ta.id = $1 AND ta.status = 'in_progress'`,
      [attemptId]
    );
    const attempt = attemptResult.rows[0];
    if (!attempt) {
      return res.status(404).json({ error: 'Test attempt not found or already completed' });
    }

    const templatesResult = await client.query(
      `SELECT qt.*, tq.question_order FROM question_templates qt
       JOIN test_questions tq ON qt.id = tq.question_template_id
       WHERE tq.test_id = $1 ORDER BY tq.question_order`,
      [attempt.test_id]
    );
    const questionTemplates = templatesResult.rows;
    
    await client.query('BEGIN');

    const generatedQuestions = [];
    for (const [index, template] of questionTemplates.entries()) {
      const questionData = generateQuestionForStudent(template, attempt.student_roll_number, index);
      
      const insertAnswerQuery = `
        INSERT INTO student_answers 
        (attempt_id, question_template_id, generated_question, generated_values, correct_answer)
        VALUES ($1, $2, $3, $4, $5) RETURNING id
      `;
      const answerResult = await client.query(insertAnswerQuery, [
        attemptId, template.id, questionData.question, JSON.stringify(questionData.values), questionData.correctAnswer
      ]);

      generatedQuestions.push({
        id: answerResult.rows[0].id,
        question: questionData.question,
        options: questionData.options,
        question_order: template.question_order
      });
    }

    await client.query('COMMIT');

    res.json({
      attempt: {
        id: attempt.id,
        title: attempt.title,
        duration_minutes: attempt.duration_minutes,
        start_time: attempt.start_time
      },
      questions: generatedQuestions
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error fetching questions:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

router.post('/answer/:answerId/submit', async (req, res) => {
  try {
    const { student_answer, time_taken } = req.body;
    const { answerId } = req.params;

    const answerResult = await db.query(`SELECT * FROM student_answers WHERE id = $1`, [answerId]);
    const answer = answerResult.rows[0];
    if (!answer) {
      return res.status(404).json({ error: 'Answer not found' });
    }

    const testResult = await db.query(
      `SELECT t.marks_per_question FROM tests t JOIN test_attempts ta ON t.id = ta.test_id JOIN student_answers sa ON ta.id = sa.attempt_id WHERE sa.id = $1`,
      [answerId]
    );
    const marks_per_question = testResult.rows[0].marks_per_question;

    const isCorrect = student_answer === answer.correct_answer;
    const marksObtained = isCorrect ? marks_per_question : 0;

    const updateQuery = `
      UPDATE student_answers 
      SET student_answer = $1, is_correct = $2, marks_obtained = $3, time_taken = $4
      WHERE id = $5
    `;
    await db.query(updateQuery, [student_answer, isCorrect, marksObtained, time_taken, answerId]);

    res.json({ success: true, is_correct: isCorrect });
  } catch (error) {
    console.error('Error submitting answer:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/attempt/:attemptId/submit', async (req, res) => {
  try {
    const { attemptId } = req.params;

    const scoreResult = await db.query(
      `SELECT SUM(marks_obtained) as total_score FROM student_answers WHERE attempt_id = $1`,
      [attemptId]
    );
    const totalScore = scoreResult.rows[0]?.total_score || 0;

    const updateQuery = `
      UPDATE test_attempts 
      SET end_time = CURRENT_TIMESTAMP, total_score = $1, status = 'completed'
      WHERE id = $2
    `;
    await db.query(updateQuery, [totalScore, attemptId]);

    res.json({ 
      success: true, 
      total_score: totalScore,
      message: 'Test submitted successfully'
    });
  } catch (error) {
    console.error('Error submitting test:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
