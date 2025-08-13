import React, { useState, useEffect } from "react";
import axios from "axios";
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

// Reusable Modal Component (from target theme)
const Modal = ({ children, onClose, title }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-lg border border-siemens-primary-light">
      <div className="flex justify-between items-center p-4 border-b border-siemens-primary-light">
        <h3 className="text-lg font-semibold text-siemens-secondary">
          {title}
        </h3>
        <button
          onClick={onClose}
          className="p-1 rounded-full text-siemens-secondary-light hover:bg-siemens-primary-10 hover:text-siemens-primary"
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
  selectedIds,
  onToggle,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  return (
    <div className="border border-siemens-primary-light rounded-lg">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center">
          <BookCopy size={16} className="mr-2 text-siemens-primary" />
          <span className="font-medium text-siemens-secondary">
            {subjectName}
          </span>
          <span className="ml-2 text-xs text-siemens-secondary-light">
            ({questions.length} available)
          </span>
        </div>
        {isOpen ? (
          <ChevronUp size={20} className="text-siemens-secondary-light" />
        ) : (
          <ChevronDown size={20} className="text-siemens-secondary-light" />
        )}
      </button>
      {isOpen && (
        <div className="p-3 space-y-2 max-h-48 overflow-y-auto">
          {questions.map((q) => (
            <label
              key={q.id}
              className="flex items-start space-x-3 cursor-pointer p-2 hover:bg-siemens-primary-5 rounded transition-colors"
            >
              <input
                type="checkbox"
                checked={selectedIds.includes(q.id)}
                onChange={() => onToggle(q.id)}
                className="mt-1 h-4 w-4 text-siemens-primary border-gray-300 rounded focus:ring-siemens-primary"
              />
              <p className="text-sm text-siemens-secondary-light">
                {q.question_template}
              </p>
            </label>
          ))}
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
  const [currentTestTitle, setCurrentTestTitle] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    duration_minutes: 60,
    marks_per_question: 1,
    question_ids: [],
  });

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
      const response = await axios.get("/api/questions/approved");
      setQuestionsBySubject(response.data);
    } catch (error) {
      console.error("Error fetching approved questions:", error);
      setError("Failed to load questions. Please try again.");
    }
  };

  const handleQuestionToggle = (questionId) => {
    setFormData((prev) => ({
      ...prev,
      question_ids: prev.question_ids.includes(questionId)
        ? prev.question_ids.filter((id) => id !== questionId)
        : [...prev.question_ids, questionId],
    }));
  };

  const handleCreateTest = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setError("");
    setMessage("");
    try {
      await axios.post("/api/tests", formData);
      setMessage("Test created successfully!");
      fetchTests();
      setTimeout(() => {
        setShowCreateModal(false);
        setFormData({
          title: "",
          description: "",
          duration_minutes: 60,
          marks_per_question: 1,
          question_ids: [],
        });
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
    try {
      const response = await axios.get(`/api/tests/${test.id}/results`);
      setCurrentResults(response.data);
      setCurrentTestTitle(test.title);
      setShowResultsModal(true);
    } catch (error) {
      console.error("Error fetching results:", error);
      setError("Failed to load results.");
    }
  };

  const downloadResultsAsCSV = (results, title) => {
    const headers = ["Student Name", "Roll Number", "Score", "Submitted At", "Flags"];
    const csvRows = [
      headers.join(','),
      ...results.map(row => {
        let flags = '';
        if (row.tab_change_count === 1) {
            flags = 'Changed tab once';
        } else if (row.tab_change_count > 1) {
            flags = `Auto-submitted after ${row.tab_change_count} tab changes`;
        }
        return [
            `"${row.student_name}"`,
            `"${row.student_roll_number}"`,
            row.total_score,
            `"${new Date(row.end_time).toLocaleString()}"`,
            `"${flags}"`
        ].join(',');
      })
    ];

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${title.replace(/ /g, '_')}_results.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
          className="flex items-center space-x-2 px-4 py-2 rounded-lg text-white bg-siemens-primary hover:bg-siemens-primary-dark disabled:bg-siemens-primary-light disabled:cursor-not-allowed transition-colors"
          disabled={Object.keys(questionsBySubject).length === 0}
        >
          <Plus size={18} />
          <span>Create Test</span>
        </button>
      </div>

      {error && (
        <div className="bg-error-50 border border-siemens-error text-siemens-error px-4 py-3 rounded-lg mb-6 flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2" />
          {error}
        </div>
      )}
      {message && (
        <div className="bg-green-50 border border-green-500 text-green-800 px-4 py-3 rounded-lg mb-6 flex items-center">
          <CheckCircle className="h-5 w-5 mr-2" />
          {message}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-siemens-primary" />
        </div>
      ) : tests.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-siemens-primary-light p-8 text-center">
          <ClipboardList className="h-12 w-12 text-siemens-secondary-light mx-auto mb-4" />
          <h3 className="text-lg font-medium text-siemens-secondary mb-2">
            No Tests Found
          </h3>
          <p className="text-siemens-secondary-light mb-4">
            Create your first test to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {tests.map((test) => (
            <div
              key={test.id}
              className="bg-white rounded-xl shadow-sm border border-siemens-primary-light p-4"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center space-x-3 mb-2">
                    {getStatusBadge(test.status)}{" "}
                    <span className="text-sm text-siemens-secondary-light">
                      {test.total_questions} questions
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-siemens-secondary">
                    {test.title}
                  </h3>
                  {test.description && (
                    <p className="text-sm text-siemens-secondary-light mt-1 max-w-prose">
                      {test.description}
                    </p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 my-4 text-sm text-siemens-secondary-light">
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
                    Total: {test.total_questions * test.marks_per_question}{" "}
                    marks
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-siemens-primary-light">
                <div className="text-xs text-siemens-secondary-light">
                  Created: {new Date(test.created_at).toLocaleDateString()}
                </div>
                <div className="flex flex-wrap gap-2">
                  {test.status === "draft" && (
                    <button
                      onClick={() => updateTestStatus(test.id, "active")}
                      className="flex items-center space-x-1 text-sm text-green-700 hover:bg-green-50 px-3 py-1.5 rounded-lg transition-colors"
                      disabled={actionLoading}
                    >
                      <Play className="h-4 w-4" /> <span>Activate</span>
                    </button>
                  )}
                  {test.status === "active" && (
                    <>
                      <button
                        onClick={() => copyTestLink(test.test_link)}
                        className="flex items-center space-x-1 text-sm text-siemens-primary hover:bg-siemens-primary-10 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <Share2 className="h-4 w-4" /> <span>Share Link</span>
                      </button>
                      <button
                        onClick={() => updateTestStatus(test.id, "completed")}
                        className="flex items-center space-x-1 text-sm text-red-600 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors"
                        disabled={actionLoading}
                      >
                        <Square className="h-4 w-4" /> <span>End Test</span>
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => viewResults(test)}
                    className="flex items-center space-x-1 text-sm text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-siemens-secondary mb-1">
                  Test Title
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-siemens-primary-light rounded-lg focus:ring-2 focus:ring-siemens-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-siemens-secondary mb-1">
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
                  className="w-full px-3 py-2 border border-siemens-primary-light rounded-lg focus:ring-2 focus:ring-siemens-primary focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-siemens-secondary mb-1">
                Description (Optional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows="3"
                className="w-full px-3 py-2 border border-siemens-primary-light rounded-lg focus:ring-2 focus:ring-siemens-primary focus:border-transparent"
              ></textarea>
            </div>
            <div>
              <label className="block text-sm font-medium text-siemens-secondary mb-1">
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
                className="w-full px-3 py-2 border border-siemens-primary-light rounded-lg focus:ring-2 focus:ring-siemens-primary focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-siemens-secondary mb-1">
                Select Questions ({formData.question_ids.length} selected)
              </label>
              <div className="space-y-3">
                {Object.keys(questionsBySubject).map((subjectName) => (
                  <SubjectAccordion
                    key={subjectName}
                    subjectName={subjectName}
                    questions={questionsBySubject[subjectName]}
                    selectedIds={formData.question_ids}
                    onToggle={handleQuestionToggle}
                  />
                ))}
              </div>
            </div>
            <div className="flex justify-end space-x-3 pt-4 border-t border-siemens-primary-light">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-siemens-secondary border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading || formData.question_ids.length === 0}
                className="px-4 py-2 text-white rounded-lg transition-colors bg-siemens-primary hover:bg-siemens-primary-dark disabled:bg-siemens-primary-light"
              >
                {actionLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2 inline" />
                    Creating...
                  </>
                ) : (
                  "Create Test"
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {showResultsModal && (
        <Modal
          onClose={() => setShowResultsModal(false)}
          title={`Results for "${currentTestTitle}"`}
        >
          <div className="flex justify-end mb-4">
            <button
              onClick={() =>
                downloadResultsAsCSV(currentResults, currentTestTitle)
              }
              className="flex items-center text-sm bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 disabled:bg-green-300"
              disabled={currentResults.length === 0}
            >
              <Download size={16} className="mr-2" /> Download CSV
            </button>
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {currentResults.length > 0 ? (
              <div className="border border-siemens-primary-light rounded-lg overflow-hidden">
                <div className="grid grid-cols-4 sm:grid-cols-4 gap-4 p-3 font-semibold bg-gray-50 text-siemens-secondary">
                  <div>Student Name</div>
                  <div>Roll Number</div>
                  <div>Score</div>
                  <div>Submitted</div>
                </div>
                <div className="divide-y divide-siemens-primary-light">
                  {currentResults.map((result) => (
                    <div
                      key={result.id}
                      className="grid grid-cols-4 sm:grid-cols-4 gap-4 p-3"
                    >
                      <div className="text-siemens-secondary font-medium">
                        {result.student_name}
                      </div>
                      <div className="text-siemens-secondary-light">
                        {result.student_roll_number}
                      </div>
                      <div className="font-medium text-siemens-primary">
                        {result.total_score}
                      </div>
                      <div className="text-siemens-secondary-light text-sm">
                        {new Date(result.end_time).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-center text-siemens-secondary-light py-8">
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
