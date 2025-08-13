import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import jsPDF from "jspdf";
import "jspdf-autotable";
import {
  Clock,
  User,
  Hash,
  CheckCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Loader2
} from "lucide-react";

const WarningModal = ({ isOpen, onConfirm }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl text-center">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-yellow-100 rounded-full">
            <AlertTriangle className="h-8 w-8 text-yellow-600" />
          </div>
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Warning: Tab Change Detected
        </h3>
        <p className="text-gray-600 mb-6">
          This is your first and only warning. If you switch tabs again, your
          test will be submitted automatically.
        </p>
        <button
          onClick={onConfirm}
          type="button"
          className="w-full bg-siemens-primary text-white py-2.5 rounded-lg hover:bg-siemens-primary-dark transition-colors"
        >
          I Understand
        </button>
      </div>
    </div>
  );
};

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
  const [error, setError] = useState("");
  const [studentInfo, setStudentInfo] = useState({
    name: "",
    rollNumber: "",
  });

  const [tabChangeCount, setTabChangeCount] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const attemptRef = useRef(attempt);

  useEffect(() => {
    attemptRef.current = attempt;
  }, [attempt]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && attemptRef.current && !submitted) {
        handleTabChange();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [submitted]);

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
      const response = await axios.get(`/api/quiz/test/${testLink}`);
      setTest(response.data);
    } catch (error) {
      console.error("Error fetching test info:", error);
    }
  };

  const handleStartTest = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await axios.post(`/api/quiz/test/${testLink}/start`, {
        student_name: studentInfo.name,
        roll_number: studentInfo.rollNumber,
      });
      const attemptId = response.data.attempt_id;
      setAttempt({ id: attemptId });

      const questionsResponse = await axios.get(
        `/api/quiz/attempt/${attemptId}/questions`
      );
      if (questionsResponse.data.questions.length === 0) {
        setError(
          "This test could not be generated because the questions are invalid. Please contact your teacher."
        );
        setAttempt(null);
        return;
      }
      setQuestions(questionsResponse.data.questions);
      setTimeRemaining(questionsResponse.data.attempt.duration_minutes * 60);
      setShowLoginForm(false);
    } catch (error) {
      console.error("Error starting test:", error);
      setError(error.response?.data?.error || "Error starting test");
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = async () => {
    const newCount = tabChangeCount + 1;
    setTabChangeCount(newCount);
    try {
      await axios.post(
        `/api/quiz/attempt/${attemptRef.current.id}/log-tab-change`
      );
    } catch (error) {
      console.error("Could not log tab change", error);
    }

    if (newCount === 1) {
      setShowWarning(true);
    } else if (newCount >= 2) {
      handleSubmitTest(true);
    }
  };

  const generateAndDownloadPDF = async (attemptId) => {
    try {
      const response = await axios.get(
        `/api/quiz/attempt/${attemptId}/details-for-pdf`
      );
      const data = response.data;

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      // Add header with logo
      const logoUrl =
        "https://assets.new.siemens.com/siemens/assets/api/uuid:9d0e7b8b5c6b4e3d8e9f7a6b5c4d3e2f/width:1125/quality:high/logo-siemens.png";
      const logoResponse = await fetch(logoUrl);
      const logoBlob = await logoResponse.blob();
      const logoDataUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(logoBlob);
      });

      doc.addImage(logoDataUrl, "PNG", 15, 10, 30, 10);

      // Add test details
      const { test_title, student_name, student_roll_number, total_score } =
        data[0];

      doc.setFontSize(18);
      doc.setTextColor(0, 153, 153); // Siemens primary color
      doc.text(test_title, 105, 20, { align: "center" });

      doc.setFontSize(12);
      doc.setTextColor(51, 51, 51); // Siemens secondary color
      doc.text(`Student: ${student_name}`, 105, 30, { align: "center" });
      doc.text(`Roll Number: ${student_roll_number}`, 105, 36, {
        align: "center",
      });

      // Add score summary
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text("Test Summary", 105, 50, { align: "center" });

      doc.setFontSize(12);
      doc.text(`Total Score: ${total_score}`, 105, 60, { align: "center" });

      // Add question details
      doc.setFontSize(14);
      doc.text("Question Details", 15, 70);

      const tableColumn = [
        "#",
        "Question",
        "Your Answer",
        "Correct Answer",
        "Result",
      ];
      const tableRows = data.map((item, index) => [
        index + 1,
        item.generated_question,
        item.student_answer || "Not Answered",
        item.correct_answer,
        item.is_correct ? "✓" : "✗",
      ]);

      doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 80,
        theme: "grid",
        headStyles: {
          fillColor: [0, 153, 153], // Siemens primary color
          textColor: 255,
          fontSize: 10,
        },
        alternateRowStyles: {
          fillColor: [240, 240, 240],
        },
        columnStyles: {
          0: { cellWidth: 10 }, // Question number
          4: { cellWidth: 15 }, // Result column
        },
        didDrawCell: (data) => {
          if (data.section === "body" && data.column.index === 4) {
            const value = data.cell.raw;
            if (value === "✓") {
              doc.setTextColor(0, 128, 0); // Green for correct
            } else {
              doc.setTextColor(255, 0, 0); // Red for incorrect
            }
          }
        },
      });

      // Add footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(
          `Page ${i} of ${pageCount}`,
          doc.internal.pageSize.width - 20,
          doc.internal.pageSize.height - 10
        );
      }

      doc.save(
        `${test_title.replace(/ /g, "_")}_${student_roll_number}_results.pdf`
      );
    } catch (error) {
      console.error("Failed to generate PDF", error);
      alert("Failed to generate PDF report. Please try again.");
    }
  };

  const handleAnswerSelect = (answerId, selectedAnswer) => {
    setAnswers((prev) => ({
      ...prev,
      [answerId]: selectedAnswer,
    }));

    submitAnswer(answerId, selectedAnswer);
  };

  const submitAnswer = async (answerId, selectedAnswer) => {
    try {
      await axios.post(`/api/quiz/answer/${answerId}/submit`, {
        student_answer: selectedAnswer,
        time_taken: 30, // Could track actual time taken
      });
    } catch (error) {
      console.error("Error submitting answer:", error);
    }
  };

  const handleSubmitTest = async (isForced = false) => {
    if (
      !isForced &&
      !window.confirm("Are you sure you want to submit your test?")
    )
      return;

    setLoading(true);
    try {
      const response = await axios.post(
        `/api/quiz/attempt/${attempt.id}/submit`,
        { answers }
      );
      setSubmitted(true);

      // Trigger PDF generation and download
      await generateAndDownloadPDF(attempt.id);

      alert(
        `Test submitted successfully! Your score: ${response.data.total_score}`
      );
    } catch (error) {
      console.error("Error submitting test:", error);
      setError("Failed to submit test. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  if (!test) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-siemens-primary-5">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-siemens-primary"></div>
      </div>
    );
  }

  if (showLoginForm) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-siemens-primary-50 to-siemens-primary-10 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-xl shadow-lg p-8 border border-siemens-primary-light">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-siemens-secondary">
                {test.title}
              </h1>
              {test.description && (
                <p className="text-siemens-secondary-light mt-2">
                  {test.description}
                </p>
              )}
            </div>

            <div className="bg-siemens-primary-10 rounded-lg p-4 mb-6 border border-siemens-primary-light">
              <h3 className="font-semibold text-siemens-secondary mb-2">
                Test Information
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-siemens-secondary-light">
                    Duration:
                  </span>
                  <span className="font-medium">
                    {test.duration_minutes} minutes
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-siemens-secondary-light">
                    Questions:
                  </span>
                  <span className="font-medium">{test.total_questions}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-siemens-secondary-light">
                    Marks per question:
                  </span>
                  <span className="font-medium">{test.marks_per_question}</span>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-error-50 border border-error text-error px-4 py-3 rounded-lg mb-4 flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" />
                {error}
              </div>
            )}

            <form onSubmit={handleStartTest} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-siemens-secondary mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-siemens-secondary-light h-5 w-5" />
                  <input
                    type="text"
                    required
                    value={studentInfo.name}
                    onChange={(e) =>
                      setStudentInfo({ ...studentInfo, name: e.target.value })
                    }
                    className="pl-10 w-full px-3 py-3 border border-siemens-primary-light rounded-lg focus:ring-2 focus:ring-siemens-primary focus:border-transparent"
                    placeholder="Enter your full name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-siemens-secondary mb-2">
                  Roll Number
                </label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 text-siemens-secondary-light h-5 w-5" />
                  <input
                    type="text"
                    required
                    value={studentInfo.rollNumber}
                    onChange={(e) =>
                      setStudentInfo({
                        ...studentInfo,
                        rollNumber: e.target.value,
                      })
                    }
                    className="pl-10 w-full px-3 py-3 border border-siemens-primary-light rounded-lg focus:ring-2 focus:ring-siemens-primary focus:border-transparent"
                    placeholder="Enter your roll number"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-siemens-primary text-white py-3 px-4 rounded-lg hover:bg-siemens-primary-dark focus:outline-none focus:ring-2 focus:ring-siemens-primary disabled:opacity-50 transition-colors font-medium"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Starting Test...
                  </span>
                ) : (
                  "Start Test"
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-siemens-primary-5 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center border border-green-200">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-siemens-secondary mb-2">
              Test Submitted!
            </h1>
            <p className="text-siemens-secondary-light mb-6">
              Thank you for completing the test. Your answers have been recorded
              successfully.
            </p>
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <p className="text-green-800 font-medium">
                Your results will be available once the teacher reviews all
                submissions.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-siemens-primary-5">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-siemens-primary mx-auto mb-4"></div>
          <p className="text-siemens-secondary-light">Loading questions...</p>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentQuestion];

  return (
    <div className="min-h-screen bg-siemens-primary-5">
      <WarningModal
        isOpen={showWarning}
        onConfirm={() => setShowWarning(false)}
      />

      {/* Header */}
      <div className="bg-white shadow-sm border-b border-siemens-primary-light">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-semibold text-siemens-secondary">
                {test.title}
              </h1>
              <p className="text-sm text-siemens-secondary-light">
                Question {currentQuestion + 1} of {questions.length}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-red-500" />
                <span
                  className={`font-mono text-lg ${
                    timeRemaining < 300
                      ? "text-red-600"
                      : "text-siemens-secondary"
                  }`}
                >
                  {formatTime(timeRemaining)}
                </span>
              </div>
              {timeRemaining < 300 && (
                <AlertTriangle className="h-5 w-5 text-red-500" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Question Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-siemens-primary-light p-8">
          <div className="mb-6">
            <h2 className="text-lg font-medium text-siemens-secondary mb-4">
              {currentQ.question}
            </h2>
          </div>

          <div className="space-y-3">
            {currentQ.options.map((option, index) => (
              <label
                key={index}
                className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                  answers[currentQ.id] === option
                    ? "border-siemens-primary bg-siemens-primary-50"
                    : "border-siemens-primary-light hover:border-siemens-primary hover:bg-siemens-primary-5"
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
                <div
                  className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center ${
                    answers[currentQ.id] === option
                      ? "border-siemens-primary bg-siemens-primary"
                      : "border-siemens-secondary-light"
                  }`}
                >
                  {answers[currentQ.id] === option && (
                    <div className="w-2 h-2 rounded-full bg-white"></div>
                  )}
                </div>
                <span className="text-siemens-secondary">{option}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center mt-8">
          <button
            onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
            disabled={currentQuestion === 0}
            className="flex items-center px-4 py-2 text-siemens-secondary border border-siemens-primary-light rounded-lg hover:bg-siemens-primary-5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-5 w-5 mr-1" />
            Previous
          </button>

          <div className="flex space-x-2">
            {questions.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentQuestion(index)}
                className={`w-8 h-8 rounded-full text-sm font-medium transition-colors flex items-center justify-center ${
                  index === currentQuestion
                    ? "bg-siemens-primary text-white"
                    : answers[questions[index].id]
                    ? "bg-green-100 text-green-800 border border-green-300"
                    : "bg-siemens-primary-5 text-siemens-secondary border border-siemens-primary-light"
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
              className="flex items-center px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
            >
              {loading ? (
                <span className="flex items-center">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Submitting...
                </span>
              ) : (
                "Submit Test"
              )}
            </button>
          ) : (
            <button
              onClick={() =>
                setCurrentQuestion(
                  Math.min(questions.length - 1, currentQuestion + 1)
                )
              }
              className="flex items-center px-4 py-2 bg-siemens-primary text-white rounded-lg hover:bg-siemens-primary-dark"
            >
              Next
              <ChevronRight className="h-5 w-5 ml-1" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentQuiz;
