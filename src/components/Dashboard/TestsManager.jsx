import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Plus,
  ClipboardList,
  BookCopy,
  ChevronDown,
  ChevronUp,
  Clock,
  BarChart3,
  Users,
  Play,
  Square,
  Share2,
  Eye,
  X,
  Download,
  Loader2,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";

const Modal = ({ children, onClose, title, maxWidth = "4xl" }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div
      className={`bg-white rounded-xl w-full max-w-${maxWidth} max-h-[90vh] flex flex-col shadow-lg border`}
    >
      <div className="flex justify-between items-center p-4 border-b">
        <h3 className="text-lg font-semibold text-siemens-secondary">
          {title}
        </h3>
        <button
          onClick={onClose}
          className="p-1 rounded-full text-gray-400 hover:bg-gray-100"
        >
          <X size={20} />
        </button>
      </div>
      <div className="p-6 overflow-y-auto">{children}</div>
    </div>
  </div>
);

const SubjectAccordion = ({
  subjectName,
  questions,
  selectedQuestions,
  onToggleSelect,
  onToggleCompulsory,
}) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="border rounded-lg">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center p-3 bg-gray-50 hover:bg-gray-100"
      >
        <div className="flex items-center">
          <BookCopy size={16} className="mr-2 text-siemens-primary" />
          <span className="font-medium">{subjectName}</span>
          <span className="ml-2 text-xs text-gray-500">
            ({questions.length} available)
          </span>
        </div>
        {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </button>
      {isOpen && (
        <div className="p-3 space-y-2 max-h-48 overflow-y-auto">
          {questions.map((q) => {
            const isSelected = selectedQuestions.some((sq) => sq.id === q.id);
            const isCompulsory =
              isSelected &&
              selectedQuestions.find((sq) => sq.id === q.id).isCompulsory;
            return (
              <div
                key={q.id}
                className={`flex items-center justify-between p-2 rounded ${
                  isSelected ? "bg-siemens-primary-50" : "hover:bg-gray-50"
                }`}
              >
                <label className="flex items-start space-x-3 cursor-pointer flex-1">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect(q.id)}
                    className="mt-1 h-4 w-4 text-siemens-primary rounded focus:ring-siemens-primary"
                  />
                  <p className="text-sm text-gray-600">
                    {q.type === "numerical"
                      ? q.question_template
                      : q.original_text}
                  </p>
                </label>
                {isSelected && (
                  <label className="flex items-center space-x-2 cursor-pointer text-xs text-orange-600 font-semibold ml-4 flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={isCompulsory}
                      onChange={() => onToggleCompulsory(q.id)}
                      className="h-4 w-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
                    />
                    <span>Compulsory</span>
                  </label>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const TestsManager = () => {
  const [tests, setTests] = useState([]);
  const [questionsBySubject, setQuestionsBySubject] = useState({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [currentResults, setCurrentResults] = useState([]);
  const [currentTest, setCurrentTest] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const initialFormData = {
    title: "",
    description: "",
    duration_minutes: 60,
    marks_per_question: 1,
    number_of_questions: 10,
    max_attempts: 1,
    selected_questions: [],
  };

  const [formData, setFormData] = useState(initialFormData);

  const compulsoryCount = formData.selected_questions.filter(
    (q) => q.isCompulsory
  ).length;
  const isFormValid =
    formData.selected_questions.length >= formData.number_of_questions &&
    formData.number_of_questions > compulsoryCount &&
    formData.number_of_questions > 0;

  const groupedResults = useMemo(() => {
    if (!currentResults) return {};
    return currentResults.reduce((acc, result) => {
      const key = result.student_roll_number;
      (acc[key] = acc[key] || []).push(result);
      return acc;
    }, {});
  }, [currentResults]);

  useEffect(() => {
    fetchTests();
    fetchApprovedQuestions();
  }, []);

  const fetchTests = async () => {
    setLoading(true);
    try {
      const response = await axios.get("/api/tests");
      setTests(response.data);
    } catch (error) {
      console.error("Error fetching tests:", error);
      setError("Failed to load tests. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchApprovedQuestions = async () => {
    try {
      const response = await axios.get("/api/questions?status=approved");

      const grouped = response.data.reduce((acc, q) => {
        const subjectName = q.subject_name || "Uncategorized";
        (acc[subjectName] = acc[subjectName] || []).push(q);
        return acc;
      }, {});

      setQuestionsBySubject(grouped);
    } catch (error) {
      console.error("Error fetching approved questions:", error);
    }
  };

  const handleQuestionSelectToggle = (questionId) => {
    setFormData((prev) => {
      const isSelected = prev.selected_questions.some(
        (q) => q.id === questionId
      );
      if (isSelected) {
        return {
          ...prev,
          selected_questions: prev.selected_questions.filter(
            (q) => q.id !== questionId
          ),
        };
      } else {
        return {
          ...prev,
          selected_questions: [
            ...prev.selected_questions,
            { id: questionId, isCompulsory: false },
          ],
        };
      }
    });
  };

  const handleCompulsoryToggle = (questionId) => {
    setFormData((prev) => ({
      ...prev,
      selected_questions: prev.selected_questions.map((q) =>
        q.id === questionId ? { ...q, isCompulsory: !q.isCompulsory } : q
      ),
    }));
  };

  const handleCreateTest = async (e) => {
    e.preventDefault();
    if (!isFormValid) {
      setError(
        "Validation Error: Please ensure 'Questions in Test' is positive, less than total selected, and greater than compulsory questions."
      );
      return;
    }
    setActionLoading(true);
    setError("");
    setMessage("");
    try {
      const compulsory_question_ids = formData.selected_questions
        .filter((q) => q.isCompulsory)
        .map((q) => q.id);
      const random_question_ids = formData.selected_questions
        .filter((q) => !q.isCompulsory)
        .map((q) => q.id);

      const payload = {
        title: formData.title,
        description: formData.description,
        duration_minutes: formData.duration_minutes,
        marks_per_question: formData.marks_per_question,
        number_of_questions: formData.number_of_questions,
        max_attempts: formData.max_attempts,
        compulsory_question_ids,
        random_question_ids,
      };

      await axios.post("/api/tests", payload);
      setMessage("Test created successfully!");
      fetchTests();
      setTimeout(() => {
        setShowCreateModal(false);
        setFormData(initialFormData);
        setMessage("");
      }, 1500);
    } catch (error) {
      console.error("Error creating test:", error);
      setError(error.response?.data?.error || "Failed to create test.");
    } finally {
      setActionLoading(false);
    }
  };

  const updateTestStatus = async (testId, status) => {
    setActionLoading(true);
    try {
      await axios.put(`/api/tests/${testId}/status`, { status });
      setMessage(`Test ${status} successfully!`);
      setTimeout(() => setMessage(""), 3000);
      fetchTests();
    } catch (error) {
      console.error("Error updating test status:", error);
      setError("Failed to update test status.");
    } finally {
      setActionLoading(false);
    }
  };

  const copyTestLink = (testLink) => {
    const fullLink = `${window.location.origin}/quiz/${testLink}`;
    navigator.clipboard.writeText(fullLink);
    setMessage("Test link copied to clipboard!");
    setTimeout(() => setMessage(""), 3000);
  };

  const viewResults = async (test) => {
    setActionLoading(true);
    try {
      const response = await axios.get(`/api/tests/${test.id}/results`);
      setCurrentResults(response.data);
      setCurrentTest(test);
      setShowResultsModal(true);
    } catch (error) {
      console.error("Error fetching results:", error);
      setError("Failed to load results.");
    } finally {
      setActionLoading(false);
    }
  };

  const downloadResultsAsCSV = (results, title) => {
    const headers = [
      "Student Name",
      "Roll Number",
      "Attempt",
      "Score",
      "Submitted At",
      "Flags",
    ];
    const csvRows = [headers.join(",")];
    results.forEach((row) => {
      let flags =
        row.tab_change_count > 0
          ? `${row.tab_change_count} tab change(s)`
          : "None";
      csvRows.push(
        [
          `"${row.student_name}"`,
          `"${row.student_roll_number}"`,
          row.attempt_number,
          row.total_score,
          `"${new Date(row.end_time).toLocaleString()}"`,
          `"${flags}"`,
        ].join(",")
      );
    });
    const csvString = csvRows.join("\n");
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${title.replace(/ /g, "_")}_results.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadStudentPdf = async (attempt) => {
    setActionLoading(true);
    try {
      const response = await axios.get(
        `/api/quiz/attempt/${attempt.id}/details-for-pdf`
      );
      const details = response.data;
      if (!details || details.length === 0) {
        setError("Could not find details for this attempt.");
        return;
      }

      const doc = new jsPDF();
      const {
        test_title,
        student_name,
        student_roll_number,
        total_score,
        attempt_number,
      } = details[0];
      const submissionTime = new Date(
        details[0].end_time || Date.now()
      ).toLocaleString();

      // --- PDF Header ---
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("Quiz Performance Report", 105, 22, { align: "center" });
      doc.setFontSize(14);
      doc.setFont("helvetica", "normal");
      doc.text(test_title, 105, 32, { align: "center" });
      doc.setLineWidth(0.5);
      doc.line(15, 40, 195, 40);
      doc.setFontSize(11);
      doc.text(`Student:`, 15, 50);
      doc.setFont("helvetica", "bold");
      doc.text(student_name, 35, 50);
      doc.setFont("helvetica", "normal");
      doc.text(`Roll Number:`, 15, 57);
      doc.setFont("helvetica", "bold");
      doc.text(student_roll_number, 42, 57);
      doc.setFont("helvetica", "normal");
      doc.text(`Submitted On:`, 195, 50, { align: "right" });
      doc.setFont("helvetica", "bold");
      doc.text(submissionTime, 195, 57, { align: "right" });
      doc.setLineWidth(0.5);
      doc.line(15, 65, 195, 65);

      let scoreStartY = 75;
      if (attempt.tab_change_count > 1) {
        doc.setFillColor(255, 245, 220);
        doc.rect(15, 67, 180, 10, "F");
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(217, 119, 6);
        doc.text(
          `ATTEMPT AUTO-SUBMITTED after ${attempt.tab_change_count} tab changes were detected.`,
          105,
          73,
          { align: "center" }
        );
        doc.setTextColor(0, 0, 0);
        scoreStartY = 82;
      }

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(`Attempt #${attempt_number}`, 105, scoreStartY, {
        align: "center",
      });
      doc.setFontSize(22);
      doc.text(`Final Score: ${total_score}`, 105, scoreStartY + 10, {
        align: "center",
      });

      const tableColumn = [
        "#",
        "Question",
        "Your Answer",
        "Correct Answer",
        "Marks",
      ];
      const marks_per_question = currentTest
        ? currentTest.marks_per_question
        : 1;
      const tableRows = details.map((item, index) => {
        const marksObtained = item.is_correct ? marks_per_question : 0;
        return [
          index + 1,
          item.generated_question,
          item.student_answer || "Not Answered",
          item.correct_answer,
          marksObtained,
        ];
      });

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: scoreStartY + 20,
        theme: "grid",
        headStyles: { fillColor: [0, 83, 100] },
        columnStyles: {
          0: { cellWidth: 8, halign: "center" },
          4: { cellWidth: 15, halign: "center" },
        },
        didParseCell: (data) => {
          if (data.section === "body" && data.column.index === 4) {
            if (data.cell.raw > 0) {
              data.cell.styles.textColor = [0, 128, 0];
              data.cell.styles.fontStyle = "bold";
            } else {
              data.cell.styles.textColor = [255, 0, 0];
            }
          }
        },
      });

      doc.save(`${test_title.replace(/ /g, "_")}_${student_roll_number}.pdf`);
    } catch (error) {
      console.error("Error generating student PDF:", error);
      setError("Failed to generate student PDF report.");
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      draft: "bg-gray-100 text-gray-700",
      active: "bg-green-100 text-green-800",
      completed: "bg-blue-100 text-blue-800",
    };
    return (
      <span
        className={`px-2 py-1 text-xs font-medium rounded-full ${
          styles[status] || styles.draft
        }`}
      >
        {status?.toUpperCase() || "DRAFT"}
      </span>
    );
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-siemens-secondary">
            Tests Management
          </h1>
          <p className="text-siemens-secondary-light">
            Create and manage assessment tests
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 px-4 py-2 rounded-lg text-white bg-siemens-primary hover:bg-siemens-primary-dark disabled:opacity-50"
          disabled={Object.keys(questionsBySubject).length === 0}
        >
          <Plus size={18} />
          <span>Create Test</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2" />
          {error}
        </div>
      )}
      {message && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-6 flex items-center">
          <CheckCircle className="h-5 w-5 mr-2" />
          {message}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-siemens-primary" />
        </div>
      ) : tests.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
          <ClipboardList className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium">No Tests Found</h3>
          <p className="text-gray-500 mb-4">
            Create your first test to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {tests.map((test) => (
            <div
              key={test.id}
              className="bg-white rounded-xl shadow-sm border p-4"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center space-x-3 mb-2">
                    {getStatusBadge(test.status)}
                    <span className="text-sm text-gray-500">
                      {test.number_of_questions} questions
                    </span>
                    <span className="text-sm text-gray-500">
                      {test.max_attempts}{" "}
                      {test.max_attempts === 1 ? "attempt" : "attempts"}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold">{test.title}</h3>
                  {test.description && (
                    <p className="text-sm text-gray-600 mt-1 max-w-prose">
                      {test.description}
                    </p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 my-4 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4" />{" "}
                  <span>{test.duration_minutes} minutes</span>
                </div>
                <div className="flex items-center space-x-2">
                  <BarChart3 className="h-4 w-4" />{" "}
                  <span>{test.marks_per_question} mark(s) per question</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4" />{" "}
                  <span>
                    Total: {test.number_of_questions * test.marks_per_question}{" "}
                    marks
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center pt-3 border-t">
                <div className="text-xs text-gray-500">
                  Created: {new Date(test.created_at).toLocaleDateString()}
                </div>
                <div className="flex flex-wrap gap-2">
                  {test.status === "draft" && (
                    <button
                      onClick={() => updateTestStatus(test.id, "active")}
                      className="flex items-center space-x-1 text-sm text-green-700 hover:bg-green-50 px-3 py-1.5 rounded-lg"
                      disabled={actionLoading}
                    >
                      <Play className="h-4 w-4" /> <span>Activate</span>
                    </button>
                  )}
                  {test.status === "active" && (
                    <>
                      <button
                        onClick={() => copyTestLink(test.test_link)}
                        className="flex items-center space-x-1 text-sm text-siemens-primary hover:bg-siemens-primary-10 px-3 py-1.5 rounded-lg"
                      >
                        <Share2 className="h-4 w-4" /> <span>Share Link</span>
                      </button>
                      <button
                        onClick={() => updateTestStatus(test.id, "completed")}
                        className="flex items-center space-x-1 text-sm text-red-600 hover:bg-red-100 px-3 py-1.5 rounded-lg"
                        disabled={actionLoading}
                      >
                        <Square className="h-4 w-4" /> <span>End Test</span>
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => viewResults(test)}
                    className="flex items-center space-x-1 text-sm text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-lg"
                  >
                    <Eye className="h-4 w-4" /> <span>Results</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <Modal
          onClose={() => setShowCreateModal(false)}
          title="Create New Test"
        >
          <form onSubmit={handleCreateTest} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Test Title
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-siemens-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.duration_minutes}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      duration_minutes: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-siemens-primary"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (Optional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows="3"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-siemens-primary"
              ></textarea>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Marks per Question
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.marks_per_question}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      marks_per_question: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-siemens-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Questions in Test
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max={formData.selected_questions.length}
                  value={formData.number_of_questions}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      number_of_questions: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-siemens-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Attempts
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.max_attempts}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      max_attempts: parseInt(e.target.value) || 1,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-siemens-primary"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Questions ({formData.selected_questions.length} selected,{" "}
                {compulsoryCount} compulsory)
              </label>
              <div className="space-y-3 p-3 border rounded-lg bg-gray-50 max-h-64 overflow-y-auto">
                {Object.keys(questionsBySubject).length > 0 ? (
                  Object.keys(questionsBySubject).map((subjectName) => (
                    <SubjectAccordion
                      key={subjectName}
                      subjectName={subjectName}
                      questions={questionsBySubject[subjectName]}
                      selectedQuestions={formData.selected_questions}
                      onToggleSelect={handleQuestionSelectToggle}
                      onToggleCompulsory={handleCompulsoryToggle}
                    />
                  ))
                ) : (
                  <p className="text-center text-gray-500">
                    No approved questions in the question bank.
                  </p>
                )}
              </div>
              {!isFormValid && formData.selected_questions.length > 0 && (
                <p className="text-xs text-red-600 mt-1">
                  Check question counts. Total questions must be more than
                  compulsory, and less than or equal to selected.
                </p>
              )}
            </div>
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading || !isFormValid}
                className="px-4 py-2 text-white rounded-lg bg-siemens-primary hover:bg-siemens-primary-dark disabled:opacity-50"
              >
                {actionLoading ? "Creating..." : "Create Test"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {showResultsModal && (
        <Modal
          onClose={() => setShowResultsModal(false)}
          title={`Results for "${currentTest.title}"`}
        >
          <div className="flex justify-end mb-4">
            <button
              onClick={() =>
                downloadResultsAsCSV(currentResults, currentTest.title)
              }
              className="flex items-center text-sm bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-50"
              disabled={currentResults.length === 0}
            >
              <Download size={16} className="mr-2" /> Download Summary (CSV)
            </button>
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {actionLoading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-siemens-primary" />
                <span className="ml-3">Generating Report...</span>
              </div>
            ) : Object.keys(groupedResults).length > 0 ? (
              <div className="space-y-4">
                {Object.values(groupedResults).map((attempts, index) => (
                  <div key={index} className="border rounded-lg">
                    <div className="bg-gray-50 p-3 rounded-t-lg">
                      <h4 className="font-semibold text-gray-800">
                        {attempts[0].student_name}
                      </h4>
                      <p className="text-sm text-gray-500">
                        Roll No: {attempts[0].student_roll_number}
                      </p>
                    </div>
                    {attempts
                      .sort((a, b) => a.attempt_number - b.attempt_number)
                      .map((attempt) => (
                        <div
                          key={attempt.id}
                          className="grid grid-cols-4 gap-4 p-3 items-center border-t"
                        >
                          <div className="font-medium text-gray-700">
                            Attempt #{attempt.attempt_number}
                          </div>
                          <div>
                            Score:{" "}
                            <span className="font-bold text-siemens-primary">
                              {attempt.total_score}
                            </span>
                          </div>
                          <div className="text-sm text-gray-500">
                            {new Date(attempt.end_time).toLocaleString()}
                          </div>
                          <div className="text-right">
                            <button
                              onClick={() => handleDownloadStudentPdf(attempt)}
                              className="p-1.5 text-red-600 hover:bg-red-100 rounded-full"
                              title="Download PDF for this attempt"
                            >
                              <Download size={18} />
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">
                No results have been submitted for this test yet.
              </p>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default TestsManager;
