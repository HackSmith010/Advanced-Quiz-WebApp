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
  Check as CheckIcon,
  RotateCcw,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

// Reusable Modal Component
const Modal = ({ children, onClose, title, maxWidth = "2xl" }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div
      className={`bg-white p-6 rounded-xl w-full max-w-${maxWidth} relative shadow-lg border max-h-[90vh] flex flex-col`}
    >
      <div className="flex justify-between items-center pb-4 mb-4 border-b">
        <h3 className="text-lg font-semibold text-siemens-secondary">
          {title}
        </h3>
        <button
          onClick={onClose}
          className="p-1 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <X size={20} />
        </button>
      </div>
      <div className="overflow-y-auto">{children}</div>
    </div>
  </div>
);

// Confirmation Modal for Deletions
const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
}) => {
  if (!isOpen) return null;
  return (
    <Modal onClose={onClose} title={title} maxWidth="md">
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
          <AlertTriangle className="h-6 w-6 text-red-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-gray-600">{message}</p>
        </div>
      </div>
      <div className="mt-6 flex justify-end space-x-3">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium rounded-lg border hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700"
        >
          {confirmText}
        </button>
      </div>
    </Modal>
  );
};

const QuestionsManager = () => {
  const [questions, setQuestions] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedView, setSelectedView] = useState({
    type: "status",
    id: "pending_review",
    name: "Pending Review",
  });
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [showCreateSubjectModal, setShowCreateSubjectModal] = useState(false);
  const [showEditSubjectModal, setShowEditSubjectModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [formData, setFormData] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [pendingAssignments, setPendingAssignments] = useState({});
  const [error, setError] = useState("");

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
    if (!isRefreshing) setLoading(true);
    setPendingAssignments({});
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
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchQuestions();
  };

  const handleCreateSubject = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setError("");
    try {
      await axios.post("/api/subjects", { name: newSubjectName });
      fetchSubjects();
      setShowCreateSubjectModal(false);
      setNewSubjectName("");
    } catch (error) {
      console.error("Error creating subject", error);
      if (error.response && error.response.status === 409) {
        setError(
          error.response.data.error ||
            "A chapter with this name already exists."
        );
      } else {
        setError("Failed to create chapter.");
      }
    } finally {
      setActionLoading(false);
    }
  };

  const openEditSubjectModal = (subject) => {
    setEditingSubject(subject);
    setNewSubjectName(subject.name);
    setShowEditSubjectModal(true);
    setError("");
  };

  const handleUpdateSubject = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setError("");
    try {
      await axios.put(`/api/subjects/${editingSubject.id}`, {
        name: newSubjectName,
      });
      fetchSubjects();
      setShowEditSubjectModal(false);
      setEditingSubject(null);
      setNewSubjectName("");
    } catch (error) {
      console.error("Error updating subject", error);
      if (error.response && error.response.status === 409) {
        setError(
          error.response.data.error ||
            "A chapter with this name already exists."
        );
      } else {
        setError("Failed to update chapter.");
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveQuestion = async (questionId, subjectId) => {
    if (!subjectId) return;
    try {
      await axios.put(`/api/questions/${questionId}/status`, {
        status: "approved",
        subjectId: subjectId,
      });
      fetchQuestions();
      fetchSubjects();
    } catch (error) {
      console.error("Error approving question:", error);
    }
  };

  const handleRejectQuestion = async (questionId) => {
    try {
      await axios.put(`/api/questions/${questionId}/status`, {
        status: "rejected",
      });
      fetchQuestions();
    } catch (error) {
      console.error("Error rejecting question:", error);
    }
  };

  const handleRestoreQuestion = async (questionId) => {
    try {
      await axios.put(`/api/questions/${questionId}/status`, {
        status: "pending_review",
      });
      fetchQuestions();
    } catch (error) {
      console.error("Error restoring question:", error);
    }
  };

  const openEditModal = (question) => {
    setEditingQuestion(question);
    const variablesAsString = JSON.stringify(
      question.details.variables || {},
      null,
      2
    );
    setFormData({
      ...question,
      details: {
        ...question.details,
        variables_text: variablesAsString,
      },
    });
    setShowEditModal(true);
  };

  const handleUpdateQuestion = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    let variablesObject;
    try {
      if (formData.type === "numerical") {
        variablesObject = JSON.parse(formData.details.variables_text);
      }
    } catch (jsonError) {
      alert("The 'Variables' field contains invalid JSON. Please correct it.");
      setActionLoading(false);
      return;
    }

    try {
      const finalDetails = {
        ...formData.details,
        variables: variablesObject,
      };
      delete finalDetails.variables_text;

      if (
        formData.type === "numerical" &&
        typeof finalDetails.distractor_formulas === "string"
      ) {
        finalDetails.distractor_formulas = finalDetails.distractor_formulas
          .split("\n")
          .filter((f) => f.trim() !== "");
      }

      if (
        formData.type === "conceptual" &&
        typeof finalDetails.distractors === "string"
      ) {
        finalDetails.distractors = finalDetails.distractors
          .split("\n")
          .filter((d) => d.trim() !== "");
      }

      const payload = {
        type: formData.type,
        original_text: formData.original_text,
        question_template: formData.question_template,
        category: formData.category,
        details: finalDetails,
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

  const handleDeleteClick = (type, item) => {
    setItemToDelete({ type, data: item });
    setShowConfirmModal(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    setActionLoading(true);
    try {
      if (itemToDelete.type === "subject") {
        await axios.delete(`/api/subjects/${itemToDelete.data.id}`);
        if (selectedView.id === itemToDelete.data.id) {
          setSelectedView({
            type: "status",
            id: "pending_review",
            name: "Pending Review",
          });
        }
        fetchSubjects();
      } else if (itemToDelete.type === "question") {
        if (selectedView.type === "subject") {
          await axios.put(`/api/questions/${itemToDelete.data.id}/status`, {
            status: "rejected",
            subjectId: null,
          });
          fetchQuestions();
          fetchSubjects();
        } else {
          await axios.delete(`/api/questions/${itemToDelete.data.id}`);
          fetchQuestions();
        }
      }
    } catch (error) {
      console.error(`Error deleting ${itemToDelete.type}`, error);
    } finally {
      setActionLoading(false);
      setShowConfirmModal(false);
      setItemToDelete(null);
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-siemens-secondary">
          Question Bank
        </h1>
        <p className="text-siemens-secondary-light">
          Manage and organize your question library
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-200 self-start">
          <nav className="divide-y divide-gray-200">
            <div
              onClick={() =>
                setSelectedView({
                  type: "status",
                  id: "pending_review",
                  name: "Pending Review",
                })
              }
              className={`flex items-center justify-between p-4 cursor-pointer transition-colors ${
                selectedView.id === "pending_review"
                  ? "bg-siemens-primary-50 text-siemens-primary font-semibold"
                  : "hover:bg-gray-50 text-gray-700"
              }`}
            >
              <span>Pending Review</span>
              <ChevronRight size={18} />
            </div>
            <div
              onClick={() =>
                setSelectedView({
                  type: "status",
                  id: "rejected",
                  name: "Rejected Questions",
                })
              }
              className={`flex items-center justify-between p-4 cursor-pointer transition-colors ${
                selectedView.id === "rejected"
                  ? "bg-siemens-primary-50 text-siemens-primary font-semibold"
                  : "hover:bg-gray-50 text-gray-700"
              }`}
            >
              <span>Rejected</span>
              <ChevronRight size={18} />
            </div>
            <div className="flex justify-between items-center p-4">
              <h2 className="text-lg font-semibold text-siemens-secondary flex items-center">
                <BookCopy className="h-5 w-5 mr-2 text-gray-400" />
                Chapters
              </h2>
              <button
                onClick={() => {
                  setShowCreateSubjectModal(true);
                  setError("");
                }}
                className="p-1.5 rounded-md text-siemens-primary hover:bg-siemens-primary-50"
                title="Add New Chapter"
              >
                <Plus size={20} />
              </button>
            </div>
            {subjects.map((subject) => (
              <div
                key={subject.id}
                onClick={() => setSelectedView({ type: "subject", ...subject })}
                className={`p-4 cursor-pointer transition-colors group ${
                  selectedView.id === subject.id
                    ? "bg-siemens-primary-50"
                    : "hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p
                      className={`font-medium ${
                        selectedView.id === subject.id
                          ? "text-siemens-primary"
                          : "text-gray-700"
                      }`}
                    >
                      {subject.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {subject.question_count} questions
                    </p>
                  </div>
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditSubjectModal(subject);
                      }}
                      className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                      title="Edit Chapter"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick("subject", subject);
                      }}
                      className="p-1 text-red-600 hover:bg-red-100 rounded"
                      title="Delete Chapter"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <ChevronRight
                    size={18}
                    className="text-gray-400 group-hover:opacity-0"
                  />
                </div>
              </div>
            ))}
          </nav>
        </div>

        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-4">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-semibold text-siemens-secondary">
                {selectedView.name}
              </h2>
              <button
                onClick={handleRefresh}
                disabled={isRefreshing || loading}
                className="p-2 text-gray-400 hover:bg-gray-100 rounded-full disabled:cursor-not-allowed"
                title="Refresh Questions"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
                />
              </button>
            </div>
          </div>
          {loading ? (
            <div className="flex justify-center items-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-siemens-primary" />
            </div>
          ) : questions.length === 0 ? (
            <div className="text-center bg-white rounded-xl shadow-sm border p-12">
              <FileQuestion className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-800">
                No Questions Found
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {selectedView.id === "pending_review"
                  ? "All questions have been reviewed."
                  : "This section is empty."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {questions.map((q, index) => (
                <div
                  key={q.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-200"
                >
                  <div className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0 pr-4">
                        <p className="text-sm text-gray-800 leading-relaxed">
                          <span className="font-bold text-siemens-primary">
                            {index + 1}.{" "}
                          </span>
                          {q.question_template ? (
                            <span className="font-mono">
                              {q.question_template}
                            </span>
                          ) : (
                            <span>{q.original_text}</span>
                          )}
                        </p>
                        {q.question_template && (
                          <p className="text-xs text-gray-500 mt-2 pl-6 border-l-2 ml-1 italic">
                            Original: {q.original_text}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => openEditModal(q)}
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg"
                          title="Edit Question"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteClick("question", q)}
                          className="p-2 text-red-600 hover:bg-red-100 rounded-lg"
                          title={
                            selectedView.type === "subject"
                              ? "Move to Rejected"
                              : "Delete Permanently"
                          }
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 px-4 py-3 border-t flex justify-end items-center space-x-3">
                    {selectedView.id === "pending_review" && (
                      <>
                        <select
                          value={pendingAssignments[q.id] || ""}
                          onChange={(e) =>
                            setPendingAssignments((prev) => ({
                              ...prev,
                              [q.id]: e.target.value,
                            }))
                          }
                          className="text-xs p-2 border rounded-lg bg-white"
                        >
                          <option value="">Assign to Chapter...</option>
                          {subjects.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() =>
                            handleApproveQuestion(
                              q.id,
                              pendingAssignments[q.id]
                            )
                          }
                          disabled={!pendingAssignments[q.id]}
                          className="flex items-center text-xs font-semibold text-green-700 bg-green-100 hover:bg-green-200 px-3 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <CheckIcon size={14} className="mr-1.5" /> Approve
                        </button>
                        <button
                          onClick={() => handleRejectQuestion(q.id)}
                          className="flex items-center text-xs font-semibold text-yellow-800 bg-yellow-100 hover:bg-yellow-200 px-3 py-2 rounded-lg"
                        >
                          <X size={14} className="mr-1.5" /> Reject
                        </button>
                      </>
                    )}
                    {selectedView.id === "rejected" && (
                      <button
                        onClick={() => handleRestoreQuestion(q.id)}
                        className="flex items-center text-xs font-semibold text-green-700 bg-green-100 hover:bg-green-200 px-3 py-2 rounded-lg"
                      >
                        <RotateCcw size={14} className="mr-1.5" /> Restore for
                        Review
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showCreateSubjectModal && (
        <Modal
          onClose={() => setShowCreateSubjectModal(false)}
          title="Create New Chapter"
          maxWidth="md"
        >
          <form onSubmit={handleCreateSubject} className="space-y-4">
            {error && (
              <div className="bg-red-100 text-red-700 p-3 rounded-md text-sm">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-siemens-secondary mb-2">
                Chapter Name
              </label>
              <input
                type="text"
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-siemens-primary"
                placeholder="e.g., Physics, Mathematics"
                required
              />
            </div>
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => setShowCreateSubjectModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-4 py-2 bg-siemens-primary text-white rounded-lg hover:bg-siemens-primary-dark disabled:opacity-50"
              >
                {actionLoading ? "Creating..." : "Create Chapter"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {showEditSubjectModal && (
        <Modal
          onClose={() => setShowEditSubjectModal(false)}
          title="Edit Chapter"
          maxWidth="md"
        >
          <form onSubmit={handleUpdateSubject} className="space-y-4">
            {error && (
              <div className="bg-red-100 text-red-700 p-3 rounded-md text-sm">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-siemens-secondary mb-2">
                Chapter Name
              </label>
              <input
                type="text"
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-siemens-primary"
                required
              />
            </div>
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => setShowEditSubjectModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-4 py-2 bg-siemens-primary text-white rounded-lg hover:bg-siemens-primary-dark disabled:opacity-50"
              >
                {actionLoading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {showEditModal && formData && (
        <Modal
          onClose={() => setShowEditModal(false)}
          title="Edit Question"
          maxWidth="lg"
        >
          <form onSubmit={handleUpdateQuestion} className="space-y-4">
            <div>
              <label className="block text-sm font-medium">Original Text</label>
              <textarea
                value={formData.original_text}
                onChange={(e) =>
                  setFormData({ ...formData, original_text: e.target.value })
                }
                rows="3"
                className="w-full mt-1 p-2 border rounded-lg text-sm"
              />
            </div>

            {formData.type === "numerical" && (
              <>
                <div>
                  <label className="block text-sm font-medium">
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
                    className="w-full mt-1 p-2 border rounded-lg font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">
                    Variables (Editable JSON)
                  </label>
                  <textarea
                    value={formData.details.variables_text}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        details: {
                          ...formData.details,
                          variables_text: e.target.value,
                        },
                      })
                    }
                    rows="4"
                    className="w-full mt-1 p-2 border rounded-lg font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">
                    Correct Answer Formula
                  </label>
                  <input
                    type="text"
                    value={formData.details.correct_answer_formula}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        details: {
                          ...formData.details,
                          correct_answer_formula: e.target.value,
                        },
                      })
                    }
                    className="w-full mt-1 p-2 border rounded-lg font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">
                    Distractor Formulas (one per line)
                  </label>
                  <textarea
                    value={
                      Array.isArray(formData.details.distractor_formulas)
                        ? formData.details.distractor_formulas.join("\n")
                        : formData.details.distractor_formulas
                    }
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        details: {
                          ...formData.details,
                          distractor_formulas: e.target.value,
                        },
                      })
                    }
                    rows="3"
                    className="w-full mt-1 p-2 border rounded-lg font-mono text-sm"
                  />
                </div>
              </>
            )}

            {formData.type === "conceptual" && (
              <>
                <div>
                  <label className="block text-sm font-medium">
                    Correct Answer
                  </label>
                  <input
                    type="text"
                    value={formData.details.correct_answer}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        details: {
                          ...formData.details,
                          correct_answer: e.target.value,
                        },
                      })
                    }
                    className="w-full mt-1 p-2 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">
                    Distractors (incorrect options, one per line)
                  </label>
                  <textarea
                    value={
                      Array.isArray(formData.details.distractors)
                        ? formData.details.distractors.join("\n")
                        : formData.details.distractors
                    }
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        details: {
                          ...formData.details,
                          distractors: e.target.value,
                        },
                      })
                    }
                    rows="3"
                    className="w-full mt-1 p-2 border rounded-lg text-sm"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium">Category</label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                className="w-full mt-1 p-2 border rounded-lg text-sm"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-4 py-2 bg-siemens-primary text-white rounded-lg hover:bg-siemens-primary-dark disabled:opacity-50"
              >
                {actionLoading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={confirmDelete}
        title={
          itemToDelete?.type === "subject"
            ? "Delete Chapter"
            : selectedView.type === "subject"
            ? "Remove Question"
            : "Delete Question"
        }
        message={
          itemToDelete?.type === "subject"
            ? `Are you sure you want to delete the chapter "${itemToDelete.data.name}"? All questions within it will be uncategorized.`
            : selectedView.type === "subject"
            ? "Are you sure you want to remove this question from the chapter? It will be moved to the 'Rejected' section."
            : "Are you sure you want to permanently delete this question? This action cannot be undone."
        }
        confirmText={
          itemToDelete?.type === "subject"
            ? "Delete Chapter"
            : selectedView.type === "subject"
            ? "Remove"
            : "Delete Permanently"
        }
      />
    </div>
  );
};

export default QuestionsManager;
