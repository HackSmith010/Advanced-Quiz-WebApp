import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Clock, User, Hash, CheckCircle, AlertCircle } from 'lucide-react';

const StudentQuiz = () => {
  const { testLink } = useParams();
  const [test, setTest] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [showLoginForm, setShowLoginForm] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [studentInfo, setStudentInfo] = useState({
    name: '',
    rollNumber: ''
  });

  useEffect(() => {
    fetchTestInfo();
  }, [testLink]);

  useEffect(() => {
    if (timeRemaining > 0 && !submitted) {
      const timer = setTimeout(() => {
        setTimeRemaining(timeRemaining - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeRemaining === 0 && attempt && !submitted) {
      handleSubmitTest();
    }
  }, [timeRemaining, submitted, attempt]);

  const fetchTestInfo = async () => {
    try {
      const response = await axios.get(`http://localhost:3001/api/quiz/test/${testLink}`);
      setTest(response.data);
    } catch (error) {
      console.error('Error fetching test info:', error);
    }
  };

  const handleStartTest = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`http://localhost:3001/api/quiz/test/${testLink}/start`, {
        student_name: studentInfo.name,
        roll_number: studentInfo.rollNumber
      });

      const attemptId = response.data.attempt_id;
      setAttempt({ id: attemptId });
      
      // Fetch questions
      const questionsResponse = await axios.get(`http://localhost:3001/api/quiz/attempt/${attemptId}/questions`);
      setQuestions(questionsResponse.data.questions);
      setTimeRemaining(questionsResponse.data.attempt.duration_minutes * 60);
      setShowLoginForm(false);
    } catch (error) {
      console.error('Error starting test:', error);
      alert(error.response?.data?.error || 'Error starting test');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (answerId, selectedAnswer) => {
    setAnswers(prev => ({
      ...prev,
      [answerId]: selectedAnswer
    }));

    // Submit answer immediately
    submitAnswer(answerId, selectedAnswer);
  };

  const submitAnswer = async (answerId, selectedAnswer) => {
    try {
      await axios.post(`http://localhost:3001/api/quiz/answer/${answerId}/submit`, {
        student_answer: selectedAnswer,
        time_taken: 30 // Could track actual time taken
      });
    } catch (error) {
      console.error('Error submitting answer:', error);
    }
  };

  const handleSubmitTest = async () => {
    if (!window.confirm('Are you sure you want to submit your test?')) {
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`http://localhost:3001/api/quiz/attempt/${attempt.id}/submit`);
      setSubmitted(true);
      alert(`Test submitted successfully! Your score: ${response.data.total_score}`);
    } catch (error) {
      console.error('Error submitting test:', error);
      alert('Error submitting test');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (!test) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (showLoginForm) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-xl shadow-xl p-8">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900">{test.title}</h1>
              {test.description && (
                <p className="text-gray-600 mt-2">{test.description}</p>
              )}
            </div>

            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-blue-900 mb-2">Test Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-blue-700">Duration:</span>
                  <span className="text-blue-900 font-medium">{test.duration_minutes} minutes</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">Questions:</span>
                  <span className="text-blue-900 font-medium">{test.total_questions}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">Marks per question:</span>
                  <span className="text-blue-900 font-medium">{test.marks_per_question}</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleStartTest} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type="text"
                    required
                    value={studentInfo.name}
                    onChange={(e) => setStudentInfo({ ...studentInfo, name: e.target.value })}
                    className="pl-10 w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your full name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Roll Number
                </label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type="text"
                    required
                    value={studentInfo.rollNumber}
                    onChange={(e) => setStudentInfo({ ...studentInfo, rollNumber: e.target.value })}
                    className="pl-10 w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your roll number"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-colors font-medium"
              >
                {loading ? 'Starting Test...' : 'Start Test'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-xl shadow-xl p-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Test Submitted!</h1>
            <p className="text-gray-600 mb-6">
              Thank you for completing the test. Your answers have been recorded successfully.
            </p>
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-green-800 font-medium">
                Your results will be available once the teacher reviews all submissions.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading questions...</p>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentQuestion];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">{test.title}</h1>
              <p className="text-sm text-gray-600">
                Question {currentQuestion + 1} of {questions.length}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-red-500" />
                <span className={`font-mono text-lg ${timeRemaining < 300 ? 'text-red-600' : 'text-gray-900'}`}>
                  {formatTime(timeRemaining)}
                </span>
              </div>
              {timeRemaining < 300 && (
                <AlertCircle className="h-5 w-5 text-red-500" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Question Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm border p-8">
          <div className="mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              {currentQ.question}
            </h2>
          </div>

          <div className="space-y-3">
            {currentQ.options.map((option, index) => (
              <label
                key={index}
                className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                  answers[currentQ.id] === option
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name={`question-${currentQ.id}`}
                  value={option}
                  checked={answers[currentQ.id] === option}
                  onChange={() => handleAnswerSelect(currentQ.id, option)}
                  className="sr-only"
                />
                <div className={`w-4 h-4 rounded-full border-2 mr-3 flex items-center justify-center ${
                  answers[currentQ.id] === option
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-gray-300'
                }`}>
                  {answers[currentQ.id] === option && (
                    <div className="w-2 h-2 rounded-full bg-white"></div>
                  )}
                </div>
                <span className="text-gray-900">{option}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center mt-8">
          <button
            onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
            disabled={currentQuestion === 0}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>

          <div className="flex space-x-2">
            {questions.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentQuestion(index)}
                className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                  index === currentQuestion
                    ? 'bg-blue-600 text-white'
                    : answers[questions[index].id]
                    ? 'bg-green-100 text-green-800 border border-green-300'
                    : 'bg-gray-100 text-gray-600 border border-gray-300'
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>

          {currentQuestion === questions.length - 1 ? (
            <button
              onClick={handleSubmitTest}
              disabled={loading}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
            >
              {loading ? 'Submitting...' : 'Submit Test'}
            </button>
          ) : (
            <button
              onClick={() => setCurrentQuestion(Math.min(questions.length - 1, currentQuestion + 1))}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentQuiz;