import { Router } from 'express';
import {db} from '../database/schema.js';
import generateQuestionForStudent from '../utils/questionGenerator.js';
const router = Router();

// Get test by link for student
router.get('/test/:testLink', (req, res) => {
  try {
    const test = db.prepare(`
      SELECT * FROM tests WHERE test_link = ? AND status = 'active'
    `).get(req.params.testLink);

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

// Start test attempt
router.post('/test/:testLink/start', (req, res) => {
  try {
    const { student_name, roll_number } = req.body;
    const testLink = req.params.testLink;

    // Get test details
    const test = db.prepare(`
      SELECT * FROM tests WHERE test_link = ? AND status = 'active'
    `).get(testLink);

    if (!test) {
      return res.status(404).json({ error: 'Test not found or not active' });
    }

    // Check if student already has an attempt
    const existingAttempt = db.prepare(`
      SELECT * FROM test_attempts 
      WHERE test_id = ? AND student_roll_number = ? AND status != 'abandoned'
    `).get(test.id, roll_number);

    if (existingAttempt) {
      if (existingAttempt.status === 'completed') {
        return res.status(400).json({ error: 'You have already completed this test' });
      }
      // Return existing attempt if in progress
      return res.json({ attempt_id: existingAttempt.id });
    }

    // Find or create student record
    let student = db.prepare(`
      SELECT * FROM students WHERE roll_number = ? AND teacher_id = ?
    `).get(roll_number, test.teacher_id);

    if (!student) {
      const insertStudent = db.prepare(`
        INSERT INTO students (name, roll_number, teacher_id)
        VALUES (?, ?, ?)
      `);
      const result = insertStudent.run(student_name, roll_number, test.teacher_id);
      student = { id: result.lastInsertRowid };
    }

    // Create test attempt
    const insertAttempt = db.prepare(`
      INSERT INTO test_attempts (test_id, student_id, student_name, student_roll_number, max_score)
      VALUES (?, ?, ?, ?, ?)
    `);
    const attemptResult = insertAttempt.run(
      test.id,
      student.id,
      student_name,
      roll_number,
      test.total_questions * test.marks_per_question
    );

    res.json({ attempt_id: attemptResult.lastInsertRowid });
  } catch (error) {
    console.error('Error starting test attempt:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get questions for attempt
router.get('/attempt/:attemptId/questions', (req, res) => {
  try {
    const attemptId = req.params.attemptId;

    // Get attempt details
    const attempt = db.prepare(`
      SELECT ta.*, t.test_link, t.title, t.duration_minutes
      FROM test_attempts ta
      JOIN tests t ON ta.test_id = t.id
      WHERE ta.id = ? AND ta.status = 'in_progress'
    `).get(attemptId);

    if (!attempt) {
      return res.status(404).json({ error: 'Test attempt not found or completed' });
    }

    // Get question templates for this test
    const questionTemplates = db.prepare(`
      SELECT qt.*, tq.question_order
      FROM question_templates qt
      JOIN test_questions tq ON qt.id = tq.question_template_id
      WHERE tq.test_id = ?
      ORDER BY tq.question_order
    `).all(attempt.test_id);

    // Generate questions for this student
    const generatedQuestions = questionTemplates.map((template, index) => {
      const questionData = generateQuestionForStudent(
        template,
        attempt.student_roll_number,
        index
      );

      // Store the generated question
      const insertAnswer = db.prepare(`
        INSERT INTO student_answers 
        (attempt_id, question_template_id, generated_question, generated_values, correct_answer)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      const answerResult = insertAnswer.run(
        attemptId,
        template.id,
        questionData.question,
        JSON.stringify(questionData.values),
        questionData.correctAnswer
      );

      return {
        id: answerResult.lastInsertRowid,
        question: questionData.question,
        options: questionData.options,
        question_order: template.question_order
      };
    });

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
    console.error('Error fetching questions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Submit answer
router.post('/answer/:answerId/submit', (req, res) => {
  try {
    const { student_answer, time_taken } = req.body;
    const answerId = req.params.answerId;

    // Get the answer record
    const answer = db.prepare(`
      SELECT * FROM student_answers WHERE id = ?
    `).get(answerId);

    if (!answer) {
      return res.status(404).json({ error: 'Answer not found' });
    }

    // Check if answer is correct
    const isCorrect = student_answer === answer.correct_answer;
    const marksObtained = isCorrect ? 1 : 0; // Assuming 1 mark per question

    // Update answer
    const updateAnswer = db.prepare(`
      UPDATE student_answers 
      SET student_answer = ?, is_correct = ?, marks_obtained = ?, time_taken = ?
      WHERE id = ?
    `);
    updateAnswer.run(student_answer, isCorrect, marksObtained, time_taken, answerId);

    res.json({ success: true, is_correct: isCorrect });
  } catch (error) {
    console.error('Error submitting answer:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Submit test
router.post('/attempt/:attemptId/submit', (req, res) => {
  try {
    const attemptId = req.params.attemptId;

    // Calculate total score
    const scoreResult = db.prepare(`
      SELECT SUM(marks_obtained) as total_score
      FROM student_answers
      WHERE attempt_id = ?
    `).get(attemptId);

    const totalScore = scoreResult?.total_score || 0;

    // Update attempt
    const updateAttempt = db.prepare(`
      UPDATE test_attempts 
      SET end_time = CURRENT_TIMESTAMP, total_score = ?, status = 'completed'
      WHERE id = ?
    `);
    updateAttempt.run(totalScore, attemptId);

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