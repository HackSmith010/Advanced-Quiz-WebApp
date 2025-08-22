import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Loader2,
  AlertTriangle,
  User,
  Hash,
  CheckCircle,
  Play,
  ChevronLeft,
  ChevronRight,
  Clock,
  X,
} from "lucide-react";

// The WarningModal and StudentLobby components remain the same...
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
const StudentLobby = ({
  test,
  attempts,
  onStart,
  studentInfo,
  loading,
  error,
}) => {
  const canRetake = attempts.length < test.max_attempts;
  return (
    <div className="max-w-2xl w-full">
      <div className="bg-white rounded-xl shadow-lg p-8 border">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-siemens-secondary">
            {test.title}
          </h1>
          <p className="text-gray-600 mt-2">Welcome, {studentInfo.name}</p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4 text-center">
            {error}
          </div>
        )}

        <div className="bg-gray-50 rounded-lg p-4 mb-6 border text-center">
          <h3 className="font-semibold text-gray-800 mb-2">Test Details</h3>
          <div className="text-sm text-gray-600 grid grid-cols-2 gap-2">
            <p>
              <strong>Total Questions:</strong> {test.number_of_questions}
            </p>
            <p>
              <strong>Total Marks:</strong>{" "}
              {test.number_of_questions * test.marks_per_question}
            </p>
            <p>
              <strong>Duration:</strong> {test.duration_minutes} minutes
            </p>
            <p>
              <strong>Marks per Question:</strong> {test.marks_per_question}
            </p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-6 border">
          <h3 className="font-semibold text-gray-800 mb-2">
            Your Past Attempts
          </h3>
          {attempts.length > 0 ? (
            <table className="w-full text-sm text-left">
              <thead className="text-gray-500">
                <tr>
                  <th className="py-2 px-3 font-normal">Attempt</th>
                  <th className="py-2 px-3 font-normal">Score</th>
                  <th className="py-2 px-3 font-normal">Date</th>
                </tr>
              </thead>
              <tbody>
                {attempts.map((att) => (
                  <tr key={att.id} className="border-t">
                    <td className="py-2 px-3 font-medium">
                      #{att.attempt_number}
                    </td>
                    <td className="py-2 px-3">
                      {att.total_score} /{" "}
                      {test.number_of_questions * test.marks_per_question}
                    </td>
                    <td className="py-2 px-3">
                      {new Date(att.end_time).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-gray-500 p-2">
              You have not attempted this test yet.
            </p>
          )}
        </div>

        {canRetake ? (
          <button
            onClick={onStart}
            disabled={loading}
            className="w-full bg-siemens-primary text-white py-3 rounded-lg font-semibold flex items-center justify-center disabled:opacity-50 transition-colors"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Play className="h-5 w-5 mr-2" />
                {attempts.length > 0 ? "Retake Test" : "Start Test"}
              </>
            )}
          </button>
        ) : (
          <p className="text-center font-medium text-red-600 p-4 border bg-red-50 rounded-lg">
            You have reached the maximum number of attempts for this test.
          </p>
        )}
      </div>
    </div>
  );
};

// Main Student Quiz Component
const StudentQuiz = () => {
  const { testLink } = useParams();

  const [view, setView] = useState(
    () => sessionStorage.getItem(`quizView_${testLink}`) || "login"
  );
  const [studentInfo, setStudentInfo] = useState(() => {
    const savedInfo = sessionStorage.getItem(`studentInfo_${testLink}`);
    return savedInfo ? JSON.parse(savedInfo) : { name: "", rollNumber: "" };
  });
  const [questions, setQuestions] = useState(() => {
    const savedQuestions = sessionStorage.getItem(`questions_${testLink}`);
    return savedQuestions ? JSON.parse(savedQuestions) : [];
  });
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(() => {
    const savedIndex = sessionStorage.getItem(
      `currentQuestionIndex_${testLink}`
    );
    return savedIndex ? parseInt(savedIndex, 10) : 0;
  });
  const [selectedAnswers, setSelectedAnswers] = useState(() => {
    const savedAnswers = sessionStorage.getItem(`selectedAnswers_${testLink}`);
    return savedAnswers ? JSON.parse(savedAnswers) : {};
  });
  const [timeRemaining, setTimeRemaining] = useState(() => {
    const savedTime = sessionStorage.getItem(`timeRemaining_${testLink}`);
    return savedTime ? parseInt(savedTime, 10) : null;
  });
  const [attemptNumber, setAttemptNumber] = useState(() => {
    const savedAttempt = sessionStorage.getItem(`attemptNumber_${testLink}`);
    return savedAttempt ? parseInt(savedAttempt, 10) : 1;
  });
  const [finalResult, setFinalResult] = useState(() => {
    const savedResult = sessionStorage.getItem(`finalResult_${testLink}`);
    return savedResult ? JSON.parse(savedResult) : null;
  });

  const [testInfo, setTestInfo] = useState(null);
  const [pastAttempts, setPastAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [tabChangeCount, setTabChangeCount] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [showSubmitWarning, setShowSubmitWarning] = useState(false);
  const isUnloading = useRef(false);

  useEffect(() => {
    sessionStorage.setItem(`quizView_${testLink}`, view);
  }, [view, testLink]);
  useEffect(() => {
    sessionStorage.setItem(
      `studentInfo_${testLink}`,
      JSON.stringify(studentInfo)
    );
  }, [studentInfo, testLink]);
  useEffect(() => {
    sessionStorage.setItem(`questions_${testLink}`, JSON.stringify(questions));
  }, [questions, testLink]);
  useEffect(() => {
    sessionStorage.setItem(
      `currentQuestionIndex_${testLink}`,
      currentQuestionIndex
    );
  }, [currentQuestionIndex, testLink]);
  useEffect(() => {
    sessionStorage.setItem(
      `selectedAnswers_${testLink}`,
      JSON.stringify(selectedAnswers)
    );
  }, [selectedAnswers, testLink]);
  useEffect(() => {
    if (timeRemaining !== null)
      sessionStorage.setItem(`timeRemaining_${testLink}`, timeRemaining);
  }, [timeRemaining, testLink]);
  useEffect(() => {
    sessionStorage.setItem(`attemptNumber_${testLink}`, attemptNumber);
  }, [attemptNumber, testLink]);
  useEffect(() => {
    if (finalResult)
      sessionStorage.setItem(
        `finalResult_${testLink}`,
        JSON.stringify(finalResult)
      );
  }, [finalResult, testLink]);

  useEffect(() => {
    const fetchAndRestoreState = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`/api/quiz/test/${testLink}`);
        setTestInfo(res.data.test);

        if (
          (view === "lobby" || view === "quiz" || view === "submitted") &&
          studentInfo.name &&
          studentInfo.rollNumber
        ) {
          const attemptsRes = await axios.get(`/api/quiz/test/${testLink}`, {
            params: {
              name: studentInfo.name,
              roll_number: studentInfo.rollNumber,
            },
          });
          setPastAttempts(attemptsRes.data.attempts);
        }
      } catch (err) {
        setError("Invalid or inactive test link.");
        sessionStorage.clear();
        setView("login");
      } finally {
        setLoading(false);
      }
    };
    fetchAndRestoreState();
  }, [testLink]);

  const clearQuizSession = () => {
    sessionStorage.removeItem(`questions_${testLink}`);
    sessionStorage.removeItem(`currentQuestionIndex_${testLink}`);
    sessionStorage.removeItem(`selectedAnswers_${testLink}`);
    sessionStorage.removeItem(`timeRemaining_${testLink}`);
    sessionStorage.removeItem(`attemptNumber_${testLink}`);
  };

  const handleSubmitTest = useCallback(
    async (isForced = false) => {
      if (view !== "quiz" || finalResult) return;

      if (!isForced && Object.keys(selectedAnswers).length < questions.length) {
        setShowSubmitWarning(true);
        setTimeout(() => setShowSubmitWarning(false), 3000);
        return;
      }

      if (
        !isForced &&
        !window.confirm("Are you sure you want to submit your test?")
      )
        return;

      setSubmitting(true);
      try {
        const response = await axios.post(
          `/api/quiz/attempt/${testLink}/submit`,
          {
            name: studentInfo.name.trim(),
            roll_number: studentInfo.rollNumber.trim(),
            answers: selectedAnswers,
            attempt_number: attemptNumber,
          }
        );
        setFinalResult({
          score: response.data.score,
          questions: response.data.questions,
          forced: isForced,
        });
        setView("submitted");
        clearQuizSession();
      } catch (err) {
        setError("Failed to submit test. Please check your connection.");
        setView("lobby");
      } finally {
        setSubmitting(false);
      }
    },
    [
      view,
      finalResult,
      testLink,
      studentInfo,
      selectedAnswers,
      attemptNumber,
      questions.length,
    ]
  );

  useEffect(() => {
    if (view !== "quiz") return;
    const preventDefault = (e) => e.preventDefault();
    const eventsToDisable = ["contextmenu", "copy", "paste"];
    eventsToDisable.forEach((event) =>
      document.addEventListener(event, preventDefault)
    );

    const handleBeforeUnload = (event) => {
      isUnloading.current = true;
      if (view === "quiz" && !finalResult) {
        const payload = {
          name: studentInfo.name.trim(),
          roll_number: studentInfo.rollNumber.trim(),
          answers: selectedAnswers,
          attempt_number: attemptNumber,
        };
        navigator.sendBeacon(
          `/api/quiz/attempt/${testLink}/beacon-submit`,
          JSON.stringify(payload)
        );
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    const handleVisibilityChange = () => {
      if (isUnloading.current) return;
      if (document.hidden) {
        const newCount = tabChangeCount + 1;
        setTabChangeCount(newCount);
        if (newCount === 1) setShowWarning(true);
        else if (newCount >= 2) handleSubmitTest(true);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      eventsToDisable.forEach((event) =>
        document.removeEventListener(event, preventDefault)
      );
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [
    view,
    tabChangeCount,
    handleSubmitTest,
    studentInfo,
    selectedAnswers,
    attemptNumber,
    testLink,
  ]);

  useEffect(() => {
    if (timeRemaining === 0 && view === "quiz") handleSubmitTest(true);
    if (timeRemaining > 0 && view === "quiz") {
      const timer = setTimeout(() => setTimeRemaining((t) => t - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeRemaining, view, handleSubmitTest]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const trimmedName = studentInfo.name.trim();
      const trimmedRollNumber = studentInfo.rollNumber.trim();
      const res = await axios.get(`/api/quiz/test/${testLink}`, {
        params: {
          name: trimmedName,
          roll_number: trimmedRollNumber,
        },
      });
      setTestInfo(res.data.test);
      setPastAttempts(res.data.attempts);
      setStudentInfo({ name: trimmedName, rollNumber: trimmedRollNumber });
      setView("lobby");
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "Failed to validate your details. Please check and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleStartAttempt = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await axios.post(`/api/quiz/test/${testLink}/start`, {
        student_name: studentInfo.name.trim(),
        roll_number: studentInfo.rollNumber.trim(),
      });
      setQuestions(response.data.questions);
      setTimeRemaining(response.data.duration_minutes * 60);
      setAttemptNumber(response.data.attempt_number);
      setCurrentQuestionIndex(0);
      setSelectedAnswers({});
      setTabChangeCount(0);
      setView("quiz");
    } catch (err) {
      setError(err.response?.data?.error || "Could not start a new attempt.");
      setView("lobby");
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (questionId, selectedOption) => {
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: selectedOption }));
  };

  const handleDownloadPdf = async () => {
    setLoading(true);
    try {
      const doc = new jsPDF();

      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("Quiz Performance Report", 105, 22, { align: "center" });
      doc.setFontSize(14);
      doc.setFont("helvetica", "normal");
      doc.text(testInfo.title, 105, 32, { align: "center" });
      doc.setLineWidth(0.5);
      doc.line(15, 40, 195, 40);
      doc.setFontSize(11);
      doc.text(`Student:`, 15, 50);
      doc.setFont("helvetica", "bold");
      doc.text(studentInfo.name, 35, 50);
      doc.setFont("helvetica", "normal");
      doc.text(`Roll Number:`, 15, 57);
      doc.setFont("helvetica", "bold");
      doc.text(studentInfo.rollNumber, 42, 57);
      doc.setFont("helvetica", "normal");
      doc.text(`Submitted On:`, 195, 50, { align: "right" });
      doc.setFont("helvetica", "bold");
      doc.text(new Date().toLocaleString(), 195, 57, { align: "right" });
      doc.setLineWidth(0.5);
      doc.line(15, 65, 195, 65);

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(`Attempt #${attemptNumber}`, 105, 75, { align: "center" });
      doc.setFontSize(22);
      doc.text(
        `Final Score: ${finalResult.score} / ${
          finalResult.questions.length * testInfo.marks_per_question
        }`,
        105,
        85,
        { align: "center" }
      );

      const tableColumn = ["#", "Question", "Your Answer", "Correct Answer"];
      const tableRows = finalResult.questions.map((q, index) => [
        index + 1,
        q.questionText,
        q.studentAnswer || "Not Answered",
        q.correctAnswer,
      ]);

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 95,
        theme: "grid",
        headStyles: { fillColor: [0, 83, 100] },
        columnStyles: { 0: { cellWidth: 8, halign: "center" } },
        didParseCell: (data) => {
          if (data.section === "body") {
            const rowData = finalResult.questions[data.row.index];
            if (!rowData.isCorrect) {
              if (data.column.index === 2) {
                data.cell.styles.textColor = [255, 0, 0];
              }
            }
          }
        },
      });

      doc.save(
        `${testInfo.title.replace(/ /g, "_")}_${
          studentInfo.rollNumber
        }_Attempt_${attemptNumber}.pdf`
      );
    } catch (error) {
      console.error("Error generating student PDF:", error);
      setError("Failed to generate PDF report.");
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const renderContent = () => {
    switch (view) {
      case "login":
        if (loading) {
          return (
            <Loader2 className="h-12 w-12 animate-spin text-siemens-primary" />
          );
        }
        if (error && !testInfo) {
          return (
            <div className="bg-red-100 text-red-700 p-4 rounded-lg">
              {error}
            </div>
          );
        }
        return (
          <div className="max-w-md w-full">
            <div className="bg-white rounded-xl shadow-lg p-8 border">
              {testInfo ? (
                <>
                  <div className="text-center mb-4">
                    <h1 className="text-2xl font-bold text-siemens-secondary">
                      {testInfo.title}
                    </h1>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 mb-6 border text-center text-sm text-gray-600">
                    <p>
                      <strong>Duration:</strong> {testInfo.duration_minutes} min
                      |<strong> Questions:</strong>{" "}
                      {testInfo.number_of_questions} |
                      <strong> Total Marks:</strong>{" "}
                      {testInfo.number_of_questions *
                        testInfo.marks_per_question}
                    </p>
                  </div>
                </>
              ) : (
                <div className="text-center mb-4">
                  <h1 className="text-2xl font-bold text-siemens-secondary">
                    Loading Test...
                  </h1>
                </div>
              )}

              {error && !pastAttempts.length && (
                <div className="bg-red-100 text-red-700 px-4 py-3 rounded-lg mb-4">
                  {error}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      required
                      value={studentInfo.name}
                      onChange={(e) =>
                        setStudentInfo({ ...studentInfo, name: e.target.value })
                      }
                      className="pl-10 w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-siemens-primary"
                      placeholder="Name MiddleName SurName"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Roll Number
                  </label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
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
                      className="pl-10 w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-siemens-primary"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading || !testInfo}
                  className="w-full bg-siemens-primary text-white py-3 rounded-lg font-semibold flex items-center justify-center disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    "Proceed"
                  )}
                </button>
              </form>
            </div>
          </div>
        );
      case "lobby":
        if (loading || !testInfo) {
          return (
            <Loader2 className="h-12 w-12 animate-spin text-siemens-primary" />
          );
        }
        return (
          <StudentLobby
            test={testInfo}
            attempts={pastAttempts}
            onStart={handleStartAttempt}
            studentInfo={studentInfo}
            loading={loading}
            error={error}
          />
        );
      case "quiz":
        const currentQ = questions[currentQuestionIndex];
        if (!currentQ)
          return (
            <Loader2 className="h-12 w-12 animate-spin text-siemens-primary" />
          );
        return (
          <div className="max-w-4xl w-full">
            <WarningModal
              isOpen={showWarning}
              onConfirm={() => setShowWarning(false)}
            />
            <div className="bg-white shadow-sm sticky top-0 z-10 p-4 rounded-t-xl border-b">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-xl font-bold">{testInfo?.title}</h1>
                  <p className="text-sm text-gray-500">
                    Question {currentQuestionIndex + 1} of {questions.length}
                  </p>
                </div>
                <div
                  className={`text-2xl font-mono flex items-center ${
                    timeRemaining <= 60 ? "text-red-500" : "text-gray-800"
                  }`}
                >
                  <Clock className="inline-block h-6 w-6 mr-2" />
                  {formatTime(timeRemaining)}
                </div>
              </div>
            </div>
            <div className="bg-white p-8 rounded-b-xl shadow-md">
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
            <div className="flex justify-between items-center mt-8">
              <button
                onClick={() => setCurrentQuestionIndex((i) => i - 1)}
                disabled={currentQuestionIndex === 0}
                className="flex items-center px-4 py-2 rounded-lg border disabled:opacity-50"
              >
                <ChevronLeft className="inline-block" /> Previous
              </button>
              {currentQuestionIndex < questions.length - 1 ? (
                <button
                  onClick={() => setCurrentQuestionIndex((i) => i + 1)}
                  className="px-4 py-2 bg-siemens-primary text-white rounded-lg hover:bg-siemens-primary-dark"
                >
                  Next <ChevronRight className="inline-block" />
                </button>
              ) : (
                <button
                  onClick={() => handleSubmitTest(false)}
                  disabled={
                    submitting ||
                    Object.keys(selectedAnswers).length < questions.length
                  }
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold disabled:opacity-50 flex items-center justify-center"
                >
                  {submitting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    "Submit Test"
                  )}
                </button>
              )}
            </div>
            {showSubmitWarning && (
              <p className="text-center text-red-600 mt-4">
                Please answer all questions before submitting.
              </p>
            )}
          </div>
        );
      case "submitted":
        if (!finalResult) {
          return (
            <div className="text-center">
              <p>Loading results...</p>
              <Loader2 className="h-8 w-8 animate-spin mt-4" />
            </div>
          );
        }
        return (
          <div className="max-w-3xl w-full">
            <div className="bg-white p-8 rounded-xl shadow-lg scroll-smooth">
              <div className="text-center border-b pb-6 mb-6">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h1 className="text-3xl font-bold text-gray-800">
                  Test Submitted!
                </h1>
                <p className="text-gray-500 mt-2">
                  Submitted on: {new Date().toLocaleString()}
                </p>
                {finalResult.forced && (
                  <p className="mt-2 text-lg text-red-600 font-semibold">
                    This test was submitted automatically.
                  </p>
                )}
              </div>
              <div className="text-center my-6 bg-gray-50 p-4 rounded-lg">
                <p className="text-lg text-gray-600">
                  Your Score for Attempt #{attemptNumber}
                </p>
                <p className="text-5xl font-bold text-siemens-primary">
                  {finalResult.score}{" "}
                  <span className="text-3xl text-gray-500">
                    /{" "}
                    {finalResult.questions.length * testInfo.marks_per_question}
                  </span>
                </p>
              </div>
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Question Review</h2>
                {finalResult.questions.map((q, index) => (
                  <div
                    key={index}
                    className={`p-4 border rounded-lg ${
                      q.isCorrect
                        ? "border-green-200 bg-green-50"
                        : "border-red-200 bg-red-50"
                    }`}
                  >
                    <p className="font-semibold">
                      {index + 1}. {q.questionText}
                    </p>
                    <p
                      className={`mt-2 text-sm ${
                        q.isCorrect ? "text-green-800" : "text-red-800"
                      }`}
                    >
                      <strong>Your Answer:</strong>{" "}
                      {q.studentAnswer || "Not Answered"}
                    </p>
                    {!q.isCorrect && (
                      <p className="mt-1 text-sm text-blue-800">
                        <strong>Correct Answer:</strong> {q.correctAnswer}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="text-center mt-8 space-x-4">
              <button
                onClick={() => {
                  setView("lobby");
                  setError("");
                  clearQuizSession();
                }}
                className="bg-gray-200 text-gray-800 py-3 px-6 rounded-lg hover:bg-gray-300"
              >
                Back to Lobby
              </button>
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
      default:
        return (
          <Loader2 className="h-12 w-12 animate-spin text-siemens-primary" />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      {renderContent()}
    </div>
  );
};

export default StudentQuiz;
