import express from 'express';
import { db } from '../database/schema.js';
import { generateQuestionForStudent } from '../utils/questionGenerator.js';
import { create, all } from 'mathjs';

const math = create(all);
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

    const testResult = await db.query(`SELECT * FROM tests WHERE test_link = $1 AND status = 'active'`, [testLink]);
    const test = testResult.rows[0];
    if (!test) {
      return res.status(404).json({ error: 'Test not found or not active.' });
    }

    const studentResult = await db.query(
      `SELECT * FROM students WHERE roll_number = $1 AND teacher_id = $2`,
      [roll_number, test.teacher_id]
    );
    const student = studentResult.rows[0];
    if (!student) {
      return res.status(401).json({ error: 'This roll number is not registered for this test. Please contact your teacher.' });
    }

    const existingAttemptResult = await db.query(
      `SELECT * FROM test_attempts WHERE test_id = $1 AND student_id = $2 AND status != 'abandoned'`,
      [test.id, student.id]
    );
    if (existingAttemptResult.rows.length > 0) {
      return res.status(400).json({ error: 'You have already attempted this test.' });
    }

    const insertAttemptQuery = `
      INSERT INTO test_attempts (test_id, student_id, student_name, student_roll_number)
      VALUES ($1, $2, $3, $4) RETURNING id
    `;
    const attemptResult = await db.query(insertAttemptQuery, [test.id, student.id, student_name, roll_number]);

    res.json({ attempt_id: attemptResult.rows[0].id });
  } catch (error) {
    console.error('Error starting test attempt:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/attempt/:attemptId/log-tab-change', async (req, res) => {
    try {
        const { attemptId } = req.params;
        const result = await db.query(
            `UPDATE test_attempts 
             SET tab_change_count = tab_change_count + 1 
             WHERE id = $1 
             RETURNING tab_change_count`,
            [attemptId]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Attempt not found.' });
        }
        res.json({ newCount: result.rows[0].tab_change_count });
    } catch (error) {
        console.error('Error logging tab change:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/attempt/:attemptId/questions', async (req, res) => {
  try {
    const { attemptId } = req.params;

    const attemptResult = await db.query(
      `SELECT ta.*, t.title, t.duration_minutes 
       FROM test_attempts ta JOIN tests t ON ta.test_id = t.id
       WHERE ta.id = $1 AND ta.status = 'in_progress'`,
      [attemptId]
    );
    const attempt = attemptResult.rows[0];
    if (!attempt) {
      return res.status(404).json({ error: 'Test attempt not found or already completed.' });
    }

    const templatesResult = await db.query(
      `SELECT qt.* FROM question_templates qt
       JOIN test_questions tq ON qt.id = tq.question_template_id
       WHERE tq.test_id = $1`,
      [attempt.test_id]
    );
    const questionTemplates = templatesResult.rows;
    
    const generatedQuestions = questionTemplates
      .map((template, index) => {
        const questionData = generateQuestionForStudent(template, attempt.student_roll_number, index);
        if (questionData) {
          return {
            templateId: template.id,
            question: questionData.question,
            options: questionData.options,
            correctAnswer: questionData.correctAnswer 
          };
        }
        return null;
      })
      .filter(q => q !== null); 

    res.json({
      attempt: {
        id: attempt.id,
        title: attempt.title,
        duration_minutes: attempt.duration_minutes
      },
      questions: generatedQuestions
    });
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/attempt/:attemptId/details-for-pdf', async (req, res) => {
    try {
        const { attemptId } = req.params;
        const query = `
            SELECT 
                t.title as test_title, 
                ta.student_name, ta.student_roll_number, ta.total_score,
                sa.generated_question, sa.student_answer, sa.correct_answer, sa.is_correct
            FROM test_attempts ta
            JOIN tests t ON ta.test_id = t.id
            LEFT JOIN student_answers sa ON ta.id = sa.attempt_id
            WHERE ta.id = $1
        `;
        const result = await db.query(query, [attemptId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Attempt data not found.' });
        }
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching details for PDF:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/attempt/:attemptId/submit', async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { answers } = req.body; 

    const attemptResult = await db.query('SELECT * FROM test_attempts WHERE id = $1', [attemptId]);
    if (attemptResult.rows[0]?.status === 'completed') {
        return res.status(400).json({ error: 'Test already submitted.' });
    }

    const testResult = await db.query(
        `SELECT t.marks_per_question FROM tests t JOIN test_attempts ta ON t.id = ta.test_id WHERE ta.id = $1`,
        [attemptId]
    );
    const marks_per_question = testResult.rows[0].marks_per_question;
    
    let totalScore = 0;
    for (const templateId in answers) {
        const studentAnswer = answers[templateId].studentAnswer;
        const correctAnswer = answers[templateId].correctAnswer;
        if (studentAnswer === correctAnswer) {
            totalScore += marks_per_question;
        }
    }

    const updateQuery = `
      UPDATE test_attempts 
      SET end_time = CURRENT_TIMESTAMP, total_score = $1, status = 'completed'
      WHERE id = $2 RETURNING total_score
    `;
    const finalResult = await db.query(updateQuery, [totalScore, attemptId]);

    res.json({ 
      success: true, 
      total_score: finalResult.rows[0].total_score,
      message: 'Test submitted successfully'
    });
  } catch (error) {
    console.error('Error submitting test:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;