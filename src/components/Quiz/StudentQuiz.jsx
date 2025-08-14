import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import jsPDF from "jspdf";
import html2canvas from "html2canvas"; 
import {
  Clock,
  User,
  Hash,
  CheckCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Loader2,
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
  const [testInfo, setTestInfo] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const [selectedAnswers, setSelectedAnswers] = useState({});

  const [timeRemaining, setTimeRemaining] = useState(null);
  const [showLoginForm, setShowLoginForm] = useState(true);

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [finalScore, setFinalScore] = useState(null);
  const [forcedSubmission, setForcedSubmission] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [studentInfo, setStudentInfo] = useState({ name: "", rollNumber: "" });

  const [tabChangeCount, setTabChangeCount] = useState(0);
  const [showWarningModal, setShowWarningModal] = useState(false);

  const resultsRef = useRef();


  useEffect(() => {
    const fetchTestDetails = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/quiz/test/${testLink}`);
        setTestInfo(response.data);
      } catch (err) {
        setError("Could not load test details. The link may be invalid.");
      } finally {
        setLoading(false);
      }
    };
    fetchTestDetails();
  }, [testLink]);

  useEffect(() => {
    if (timeRemaining > 0 && !isSubmitted) {
      const timer = setTimeout(() => setTimeRemaining(timeRemaining - 1), 1000);
      return () => clearTimeout(timer);
    }
    if (timeRemaining === 0 && !isSubmitted && questions.length > 0) {
      handleSubmitTest(true); 
    }
  }, [timeRemaining, isSubmitted, questions]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && questions.length > 0 && !isSubmitted) {
        const newCount = tabChangeCount + 1;
        setTabChangeCount(newCount);

        if (newCount === 1) {
          setShowWarningModal(true); 
        } else if (newCount >= 2) {
          handleSubmitTest(true);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [questions, isSubmitted, tabChangeCount]);

  const handleStartTest = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await axios.post(`/api/quiz/test/${testLink}/start`, {
        student_name: studentInfo.name,
        roll_number: studentInfo.rollNumber,
      });

      setQuestions(response.data.questions);
      setTimeRemaining(response.data.duration_minutes * 60);
      setShowLoginForm(false);
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "An error occurred while starting the test."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (questionId, selectedOption) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: selectedOption,
    }));
  };

  const handleSubmitTest = async (isForced = false) => {
    if (isSubmitted) return;

    if (isForced) {
      setForcedSubmission(true);
    } else if (!window.confirm("Are you sure you want to submit your test?")) {
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `/api/quiz/attempt/${testLink}/submit`,
        {
          roll_number: studentInfo.rollNumber,
          answers: selectedAnswers,
        }
      );

      setFinalScore(response.data.score);
      setIsSubmitted(true); 
    } catch (err) {
      setError("Failed to submit the test. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    const resultsElement = resultsRef.current;
    if (!resultsElement) {
      alert("Could not find results to download. Please wait a moment.");
      return;
    }

    setLoading(true);
    try {
      const canvas = await html2canvas(resultsElement, { scale: 2 });
      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Quiz_Results_${studentInfo.rollNumber}.pdf`);
    } catch (error) {
      console.error("PDF Generation Error:", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
  };


  if (loading && !isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Loader2 className="h-12 w-12 animate-spin text-siemens-primary" />
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
                {testInfo?.title}
              </h1>
              <p className="text-siemens-secondary-light mt-2">
                {testInfo?.description}
              </p>
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
                    {testInfo?.duration_minutes} minutes
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-siemens-secondary-light">
                    Questions:
                  </span>
                  <span className="font-medium">
                    {testInfo?.number_of_questions}
                  </span>{" "}
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleStartTest} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-siemens-secondary mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={studentInfo.name}
                  onChange={(e) =>
                    setStudentInfo({ ...studentInfo, name: e.target.value })
                  }
                  className="w-full px-3 py-3 border border-siemens-primary-light rounded-lg focus:ring-2 focus:ring-siemens-primary"
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-siemens-secondary mb-2">
                  Roll Number
                </label>
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
                  className="w-full px-3 py-3 border border-siemens-primary-light rounded-lg focus:ring-2 focus:ring-siemens-primary"
                  placeholder="Enter your roll number"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-siemens-primary text-white py-3 rounded-lg hover:bg-siemens-primary-dark disabled:opacity-50"
              >
                {loading ? "Starting..." : "Start Test"}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // This is the results screen shown after submission.
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-100 py-12 px-4">
        <div
          ref={resultsRef}
          className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-lg"
        >
          <div className="text-center border-b pb-6 mb-6">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-800">
              Test Submitted!
            </h1>
            {forcedSubmission && (
              <p className="mt-2 text-lg text-red-600 font-semibold">
                This test was submitted automatically due to a rule violation or
                time expiration.
              </p>
            )}
            <p className="text-gray-600 mt-2">
              Thank you, {studentInfo.name}. Here is a summary of your attempt.
            </p>
          </div>
          <div className="text-center my-6">
            <p className="text-lg text-gray-600">Your Score</p>
            <p className="text-5xl font-bold text-siemens-primary">
              {finalScore}{" "}
              <span className="text-3xl text-gray-500">
                / {questions.length}
              </span>
            </p>
          </div>
          <div>
            <h2 className="text-xl font-semibold mb-4">Your Answers</h2>
            {questions.map((q, index) => (
              <div key={q.id} className="mb-4 p-4 border rounded-lg">
                <p className="font-semibold">
                  Q{index + 1}: {q.question}
                </p>
                <p
                  className={`mt-2 ${
                    selectedAnswers[q.id] === q.correct_answer
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  Your answer: {selectedAnswers[q.id] || "Not Answered"}
                </p>
                {selectedAnswers[q.id] !== q.correct_answer && (
                  <p className="text-blue-600">
                    Correct answer: {q.correct_answer}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="text-center mt-8">
          <button
            onClick={handleDownloadPdf}
            disabled={loading}
            className="bg-siemens-primary text-white py-3 px-6 rounded-lg hover:bg-siemens-primary-dark"
          >
            {loading ? "Generating PDF..." : "Download Results as PDF"}
          </button>
        </div>
      </div>
    );
  }

  // This is the main quiz interface.
  if (questions.length > 0) {
    const currentQ = questions[currentQuestionIndex];
    return (
      <div className="min-h-screen bg-gray-50">
        <WarningModal
          isOpen={showWarningModal}
          onConfirm={() => setShowWarningModal(false)}
        />
        {/* Header with timer and question count */}
        <div className="bg-white shadow-sm sticky top-0 z-10">
          <div className="max-w-4xl mx-auto p-4 flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold">{testInfo?.title}</h1>
              <p className="text-sm text-gray-500">
                Question {currentQuestionIndex + 1} of {questions.length}
              </p>
            </div>
            <div
              className={`text-2xl font-mono ${
                timeRemaining <= 60 ? "text-red-500" : "text-gray-800"
              }`}
            >
              <Clock className="inline-block h-6 w-6 mr-2" />
              {formatTime(timeRemaining)}
            </div>
          </div>
        </div>

        {/* Question and Options */}
        <div className="max-w-4xl mx-auto p-4 md:p-8">
          <div className="bg-white p-8 rounded-xl shadow-md">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">
              {currentQ.question}
            </h2>
            <div className="space-y-4">
              {currentQ.options.map((option, index) => (
                <label
                  key={index}
                  className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                    selectedAnswers[currentQ.id] === option
                      ? "border-siemens-primary bg-siemens-primary-50"
                      : "border-gray-200 hover:border-siemens-primary-light"
                  }`}
                >
                  <input
                    type="radio"
                    name={`question-${currentQ.id}`}
                    value={option}
                    checked={selectedAnswers[currentQ.id] === option}
                    onChange={() => handleAnswerSelect(currentQ.id, option)}
                    className="hidden" 
                  />
                  <span
                    className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mr-4 flex items-center justify-center ${
                      selectedAnswers[currentQ.id] === option
                        ? "border-siemens-primary"
                        : "border-gray-400"
                    }`}
                  >
                    {selectedAnswers[currentQ.id] === option && (
                      <span className="w-2.5 h-2.5 bg-siemens-primary rounded-full"></span>
                    )}
                  </span>
                  <span>{option}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center mt-8">
            <button
              onClick={() =>
                setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))
              }
              disabled={currentQuestionIndex === 0}
              className="px-4 py-2 rounded-lg border disabled:opacity-50"
            >
              <ChevronLeft className="inline-block" /> Previous
            </button>

            {currentQuestionIndex === questions.length - 1 ? (
              <button
                onClick={() => handleSubmitTest(false)}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold"
              >
                Submit Test
              </button>
            ) : (
              <button
                onClick={() =>
                  setCurrentQuestionIndex(
                    Math.min(questions.length - 1, currentQuestionIndex + 1)
                  )
                }
                className="px-4 py-2 bg-siemens-primary text-white rounded-lg hover:bg-siemens-primary-dark"
              >
                Next <ChevronRight className="inline-block" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p>{error || "Loading test..."}</p>
    </div>
  );
};

export default StudentQuiz;
