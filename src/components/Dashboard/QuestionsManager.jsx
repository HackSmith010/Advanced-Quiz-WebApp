import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  FileQuestion,
  Edit,
  Trash2,
  Plus,
  BookCopy,
  X,
  ChevronRight,
  Loader2,
} from "lucide-react";

const Modal = ({ children, onClose, title }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div className="bg-white p-6 rounded-xl w-full max-w-2xl relative shadow-lg border border-siemens-primary-light max-h-[90vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
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
      {children}
    </div>
  </div>
);

const QuestionsManager = () => {
  const [questions, setQuestions] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedView, setSelectedView] = useState({
    type: "status",
    id: "pending_review",
    name: "Pending Review",
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const [newSubjectName, setNewSubjectName] = useState("");
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [formData, setFormData] = useState(null);

  useEffect(() => {
    fetchSubjects();
  }, []);

  useEffect(() => {
    fetchQuestions();
  }, [selectedView]);

  const fetchSubjects = async () => {
    try {
      const response = await axios.get("/api/subjects");
      setSubjects(response.data);
    } catch (error) {
      console.error("Error fetching subjects:", error);
    }
  };

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedView.type === "status") {
        params.status = selectedView.id;
      } else if (selectedView.type === "subject") {
        params.subjectId = selectedView.id;
      }

      const response = await axios.get("/api/questions", { params });
      setQuestions(response.data);
    } catch (error) {
      console.error("Error fetching questions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubject = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await axios.post("/api/subjects", { name: newSubjectName });
      fetchSubjects();
      setShowSubjectModal(false);
      setNewSubjectName("");
    } catch (error) {
      console.error("Error creating subject", error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignSubject = async (questionId, subjectId) => {
    if (!subjectId) return;
    try {
      await axios.put(`/api/questions/${questionId}/status`, {
        status: "approved",
        subjectId: subjectId,
      });
      fetchQuestions();
      fetchSubjects();
    } catch (error) {
      console.error("Error assigning subject:", error);
    }
  };

  const openEditModal = (question) => {
    setEditingQuestion(question);
    setFormData({
      question_template: question.question_template,
      correct_answer_formula: question.correct_answer_formula,
      distractor_formulas: Array.isArray(question.distractor_formulas)
        ? question.distractor_formulas.join("\n")
        : "",
      category: question.category,
      variables: question.variables,
    });
    setShowEditModal(true);
  };

  const handleUpdateQuestion = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const payload = {
        ...formData,
        variables:
          typeof formData.variables === "string"
            ? JSON.parse(formData.variables)
            : formData.variables,
        distractor_formulas: formData.distractor_formulas
          .split("\n")
          .filter((f) => f.trim() !== ""),
      };
      await axios.put(`/api/questions/${editingQuestion.id}`, payload);
      fetchQuestions();
      setShowEditModal(false);
    } catch (error) {
      console.error("Error updating question:", error);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-siemens-secondary">
          Question Bank
        </h1>
        <p className="text-siemens-secondary-light">
          Manage and organize your question library
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Subjects Panel */}
        <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-siemens-primary-light">
          <div className="flex justify-between items-center p-4 border-b border-siemens-primary-light">
            <h2 className="text-lg font-semibold text-siemens-secondary flex items-center">
              <BookCopy className="h-5 w-5 mr-2 text-siemens-primary" />
              Subjects
            </h2>
            <button
              onClick={() => setShowSubjectModal(true)}
              className="p-2 rounded-full bg-siemens-primary-10 text-siemens-primary hover:bg-siemens-primary-20"
            >
              <Plus size={18} />
            </button>
          </div>
          <div className="divide-y divide-siemens-primary-light">
            <div
              onClick={() =>
                setSelectedView({
                  type: "status",
                  id: "pending_review",
                  name: "Pending Review",
                })
              }
              className={`p-4 cursor-pointer transition-colors ${
                selectedView.id === "pending_review"
                  ? "bg-siemens-primary-10"
                  : "hover:bg-siemens-primary-5"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="font-medium text-siemens-secondary">
                  Pending Review
                </p>
                <ChevronRight className="h-5 w-5 text-siemens-secondary-light" />
              </div>
            </div>
            {subjects.map((subject) => (
              <div
                key={subject.id}
                onClick={() => setSelectedView({ type: "subject", ...subject })}
                className={`p-4 cursor-pointer transition-colors ${
                  selectedView.id === subject.id
                    ? "bg-siemens-primary-10"
                    : "hover:bg-siemens-primary-5"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-siemens-secondary">
                      {subject.name}
                    </p>
                    <p className="text-xs text-siemens-secondary-light">
                      {subject.question_count} questions
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-siemens-secondary-light" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Questions Panel */}
        <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-siemens-primary-light">
          <div className="p-4 border-b border-siemens-primary-light">
            <h2 className="text-lg font-semibold text-siemens-secondary">
              {selectedView.name}
            </h2>
          </div>

          {loading ? (
            <div className="flex justify-center items-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-siemens-primary" />
            </div>
          ) : questions.length === 0 ? (
            <div className="p-8 text-center">
              <FileQuestion className="h-12 w-12 text-siemens-secondary-light mx-auto mb-3" />
              <p className="text-siemens-secondary-light">No questions found</p>
              <p className="text-sm text-siemens-secondary-light mt-1">
                {selectedView.id === "pending_review"
                  ? "All questions have been reviewed"
                  : "Add questions to this subject"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-siemens-primary-light">
              {questions.map((q) => (
                <div
                  key={q.id}
                  className="p-4 hover:bg-siemens-primary-5 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-mono text-siemens-secondary bg-siemens-primary-10 p-2 rounded-lg mb-2">
                        {q.question_template}
                      </p>
                      <p className="text-xs text-siemens-secondary-light truncate">
                        Original: {q.original_text}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      {selectedView.id === "pending_review" && (
                        <select
                          onChange={(e) =>
                            handleAssignSubject(q.id, e.target.value)
                          }
                          className="text-xs p-2 border border-siemens-primary-light rounded-lg bg-white hover:border-siemens-primary focus:ring-2 focus:ring-siemens-primary focus:border-transparent"
                        >
                          <option value="">Assign to...</option>
                          {subjects.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      )}
                      <button
                        onClick={() => openEditModal(q)}
                        className="p-2 text-siemens-secondary-light hover:text-siemens-primary hover:bg-siemens-primary-10 rounded-lg transition-colors"
                      >
                        <Edit size={16} />
                      </button>
                      <button className="p-2 text-siemens-secondary-light hover:text-siemens-error hover:bg-error-10 rounded-lg transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Subject Modal */}
      {showSubjectModal && (
        <Modal
          onClose={() => setShowSubjectModal(false)}
          title="Create New Subject"
        >
          <form onSubmit={handleCreateSubject} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-siemens-secondary mb-2">
                Subject Name
              </label>
              <input
                type="text"
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                className="w-full px-3 py-2 border border-siemens-primary-light rounded-lg focus:ring-2 focus:ring-siemens-primary focus:border-transparent"
                placeholder="e.g., Physics, Mathematics"
                required
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowSubjectModal(false)}
                className="px-4 py-2 text-siemens-secondary border border-siemens-primary-light rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-4 py-2 bg-siemens-primary text-white rounded-lg hover:bg-siemens-primary-dark disabled:bg-siemens-primary-light"
              >
                {actionLoading ? "Creating..." : "Create Subject"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Question Modal */}
      {showEditModal && formData && (
        <Modal onClose={() => setShowEditModal(false)} title="Edit Question">
          <form onSubmit={handleUpdateQuestion} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-siemens-secondary mb-2">
                Question Template
              </label>
              <textarea
                value={formData.question_template}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    question_template: e.target.value,
                  })
                }
                rows="3"
                className="w-full px-3 py-2 border border-siemens-primary-light rounded-lg font-mono text-sm focus:ring-2 focus:ring-siemens-primary focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-siemens-secondary mb-2">
                Variables
              </label>
              <textarea
                value={JSON.stringify(formData.variables, null, 2)}
                readOnly
                rows="4"
                className="w-full px-3 py-2 border border-siemens-primary-light rounded-lg bg-siemens-primary-5 font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-siemens-secondary mb-2">
                Correct Answer Formula
              </label>
              <input
                type="text"
                value={formData.correct_answer_formula}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    correct_answer_formula: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-siemens-primary-light rounded-lg font-mono text-sm focus:ring-2 focus:ring-siemens-primary focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-siemens-secondary mb-2">
                Distractor Formulas (one per line)
              </label>
              <textarea
                value={formData.distractor_formulas}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    distractor_formulas: e.target.value,
                  })
                }
                rows="3"
                className="w-full px-3 py-2 border border-siemens-primary-light rounded-lg font-mono text-sm focus:ring-2 focus:ring-siemens-primary focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-siemens-secondary mb-2">
                Category
              </label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                className="w-full px-3 py-2 border border-siemens-primary-light rounded-lg focus:ring-2 focus:ring-siemens-primary focus:border-transparent"
              />
            </div>
            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-siemens-secondary border border-siemens-primary-light rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-4 py-2 bg-siemens-primary text-white rounded-lg hover:bg-siemens-primary-dark disabled:bg-siemens-primary-light"
              >
                {actionLoading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default QuestionsManager;
