import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Plus,
  Users,
  Edit,
  Trash2,
  X,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";

// Reusable Modal Component
const Modal = ({ children, onClose, title }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div className="bg-white p-6 rounded-xl w-full max-w-md relative shadow-lg border border-siemens-primary-light">
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

// Confirmation Modal for Deletions
const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  itemType,
  itemName,
}) => {
  if (!isOpen) return null;
  const isBatch = itemType === "batch";
  const title = isBatch ? "Delete Batch" : "Remove Student";
  const message = isBatch
    ? `Are you sure you want to delete "${itemName}"? All student associations will be removed.`
    : `Are you sure you want to remove "${itemName}" from this batch?`;

  return (
    <Modal onClose={onClose} title={title}>
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-error-50">
          <AlertTriangle className="h-6 w-6 text-siemens-error" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-siemens-secondary-light">{message}</p>
        </div>
      </div>
      <div className="mt-6 flex justify-end space-x-3">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-siemens-secondary hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-siemens-error text-white hover:bg-red-700 transition-colors"
        >
          {isBatch ? "Delete Batch" : "Remove Student"}
        </button>
      </div>
    </Modal>
  );
};

const BatchesManager = () => {
  const [batches, setBatches] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [batchStudents, setBatchStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  const [newBatchName, setNewBatchName] = useState("");
  const [editingStudent, setEditingStudent] = useState(null);
  const [studentFormData, setStudentFormData] = useState({
    name: "",
    rollNumber: "",
    email: "",
  });

  useEffect(() => {
    fetchBatches();
    fetchAllStudents();
  }, []);

  const fetchBatches = async () => {
    try {
      const response = await axios.get("/api/batches");
      setBatches(response.data);
    } catch (error) {
      console.error("Error fetching batches:", error);
      setError("Could not load batches.");
    } finally {
      setLoading(false);
    }
  };

  const fetchAllStudents = async () => {
    try {
      const response = await axios.get("/api/students");
      setAllStudents(response.data);
    } catch (error) {
      console.error("Error fetching all students:", error);
    }
  };

  const handleCreateBatch = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setError("");
    try {
      await axios.post("/api/batches", { name: newBatchName });
      fetchBatches();
      setShowBatchModal(false);
      setNewBatchName("");
    } catch (err) {
      console.error("Error creating batch:", err);
      setError(err.response?.data?.error || "Failed to create batch.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSelectBatch = async (batch) => {
    setSelectedBatch(batch);
    setBatchStudents([]);
    try {
      const response = await axios.get(`/api/batches/${batch.id}/students`);
      setBatchStudents(response.data);
    } catch (error) {
      console.error("Error fetching students for batch:", error);
      setBatchStudents([]);
    }
  };

  const handleStudentSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setError("");
    try {
      if (editingStudent) {
        await axios.put(`/api/students/${editingStudent.id}`, studentFormData);
      } else {
        const createStudentResponse = await axios.post(
          "/api/students",
          studentFormData
        );
        const newStudentId = createStudentResponse.data.id;
        if (selectedBatch) {
          await axios.post(`/api/batches/${selectedBatch.id}/students`, {
            studentId: newStudentId,
          });
        }
      }

      fetchAllStudents();
      if (selectedBatch) handleSelectBatch(selectedBatch);
      closeStudentModal();
    } catch (err) {
      console.error("Error saving student:", err);
      setError(err.response?.data?.error || "Failed to save student.");
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
    setError("");
    try {
      if (itemToDelete.type === "batch") {
        await axios.delete(`/api/batches/${itemToDelete.data.id}`);
        fetchBatches();
        setSelectedBatch(null);
      } else if (itemToDelete.type === "student_from_batch") {
        await axios.delete(
          `/api/batches/${selectedBatch.id}/students/${itemToDelete.data.id}`
        );
        if (selectedBatch) handleSelectBatch(selectedBatch);
      }
    } catch (err) {
      console.error(`Error deleting ${itemToDelete.type}:`, err);
      setError(
        err.response?.data?.error || `Failed to delete ${itemToDelete.type}.`
      );
    } finally {
      setActionLoading(false);
      setShowConfirmModal(false);
      setItemToDelete(null);
    }
  };

  const openStudentModal = (student = null) => {
    setError("");
    setEditingStudent(student);
    setStudentFormData(
      student
        ? {
            name: student.name,
            rollNumber: student.roll_number,
            email: student.email || "",
          }
        : { name: "", rollNumber: "", email: "" }
    );
    setShowStudentModal(true);
  };

  const closeStudentModal = () => {
    setShowStudentModal(false);
    setEditingStudent(null);
  };

  const openBatchModal = () => {
    setError("");
    setNewBatchName("");
    setShowBatchModal(true);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-siemens-secondary">
          Batches & Students
        </h1>
        <p className="text-siemens-secondary-light">
          Manage student groups and individual apprentices
        </p>
      </div>

      {error && (
        <div className="bg-error-50 border border-error text-error px-4 py-3 rounded-lg mb-6 flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Batches Panel */}
        <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-siemens-primary-light overflow-hidden">
          <div className="flex justify-between items-center p-4 border-b border-siemens-primary-light">
            <h2 className="text-lg font-semibold text-siemens-secondary">
              Batches
            </h2>
            <button
              onClick={openBatchModal}
              className="p-2 rounded-full bg-siemens-primary-10 text-siemens-primary hover:bg-siemens-primary-20 transition-colors"
            >
              <Plus size={18} />
            </button>
          </div>
          <div className="divide-y divide-siemens-primary-light max-h-[calc(100vh-200px)] overflow-y-auto">
            {batches.map((batch) => (
              <div
                key={batch.id}
                onClick={() => handleSelectBatch(batch)}
                className={`p-4 cursor-pointer transition-colors ${
                  selectedBatch?.id === batch.id
                    ? "bg-siemens-primary-10"
                    : "hover:bg-siemens-primary-5"
                }`}
              >
                <div className="flex justify-between items-center">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-siemens-secondary truncate">
                      {batch.name}
                    </p>
                    <p className="text-xs text-siemens-secondary-light">
                      {batch.student_count}{" "}
                      {batch.student_count === 1 ? "student" : "students"}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick("batch", batch);
                      }}
                      className="p-1 text-siemens-secondary-light hover:text-siemens-error"
                    >
                      <Trash2 size={16} />
                    </button>
                    <ChevronRight
                      size={16}
                      className={`text-siemens-secondary-light ${
                        selectedBatch?.id === batch.id ? "rotate-90" : ""
                      }`}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Students Panel */}
        <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-siemens-primary-light overflow-hidden">
          {selectedBatch ? (
            <div>
              <div className="flex justify-between items-center p-4 border-b border-siemens-primary-light">
                <div>
                  <h2 className="text-lg font-semibold text-siemens-secondary">
                    {selectedBatch.name}
                  </h2>
                  <p className="text-sm text-siemens-secondary-light">
                    {batchStudents.length}{" "}
                    {batchStudents.length === 1 ? "student" : "students"}
                  </p>
                </div>
                <button
                  onClick={() => openStudentModal()}
                  className="flex items-center space-x-1 bg-siemens-primary hover:bg-siemens-primary-dark text-white px-3 py-2 rounded-lg text-sm transition-colors"
                >
                  <Plus size={16} />
                  <span>Add Student</span>
                </button>
              </div>

              <div className="divide-y divide-siemens-primary-light max-h-[calc(100vh-200px)] overflow-y-auto">
                {batchStudents.length > 0 ? (
                  batchStudents.map((student) => (
                    <div
                      key={student.id}
                      className="p-4 hover:bg-siemens-primary-5 transition-colors flex justify-between items-center"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-siemens-secondary">
                          {student.name}
                        </p>
                        <div className="flex space-x-4 mt-1">
                          <p className="text-xs text-siemens-secondary-light">
                            Roll: {student.roll_number}
                          </p>
                          {student.email && (
                            <p className="text-xs text-siemens-secondary-light truncate">
                              Email: {student.email}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => openStudentModal(student)}
                          className="p-2 text-siemens-secondary-light hover:text-siemens-primary hover:bg-siemens-primary-10 rounded-lg transition-colors"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() =>
                            handleDeleteClick("student_from_batch", student)
                          }
                          className="p-2 text-siemens-secondary-light hover:text-siemens-error hover:bg-error-10 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center">
                    <p className="text-siemens-secondary-light">
                      No students in this batch yet
                    </p>
                    <button
                      onClick={() => openStudentModal()}
                      className="mt-3 text-siemens-primary hover:text-siemens-primary-dark font-medium"
                    >
                      Add your first student
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center">
              <Users className="mx-auto h-10 w-10 text-siemens-secondary-light mb-3" />
              <p className="text-siemens-secondary-light">
                Select a batch to view students
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Batch Creation Modal */}
      {showBatchModal && (
        <Modal
          onClose={() => setShowBatchModal(false)}
          title="Create New Batch"
        >
          <form onSubmit={handleCreateBatch} className="space-y-4">
            {error && (
              <div className="bg-error-50 border border-error text-error px-3 py-2 rounded-lg text-sm">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-siemens-secondary mb-1">
                Batch Name
              </label>
              <input
                type="text"
                value={newBatchName}
                onChange={(e) => setNewBatchName(e.target.value)}
                className="w-full px-3 py-2 border border-siemens-primary-light rounded-lg focus:ring-2 focus:ring-siemens-primary focus:border-transparent"
                placeholder="e.g., Summer 2023"
                required
              />
            </div>
            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowBatchModal(false)}
                className="px-4 py-2 text-siemens-secondary border border-siemens-primary-light rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-4 py-2 bg-siemens-primary text-white rounded-lg hover:bg-siemens-primary-dark disabled:bg-siemens-primary-light transition-colors"
              >
                {actionLoading ? "Creating..." : "Create Batch"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Student Form Modal */}
      {showStudentModal && (
        <Modal
          onClose={closeStudentModal}
          title={editingStudent ? "Edit Student" : "Add New Student"}
        >
          <form onSubmit={handleStudentSubmit} className="space-y-4">
            {error && (
              <div className="bg-error-50 border border-error text-error px-3 py-2 rounded-lg text-sm">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-siemens-secondary mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={studentFormData.name}
                onChange={(e) =>
                  setStudentFormData({
                    ...studentFormData,
                    name: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-siemens-primary-light rounded-lg focus:ring-2 focus:ring-siemens-primary focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-siemens-secondary mb-1">
                Roll Number
              </label>
              <input
                type="text"
                required
                value={studentFormData.rollNumber}
                onChange={(e) =>
                  setStudentFormData({
                    ...studentFormData,
                    rollNumber: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-siemens-primary-light rounded-lg focus:ring-2 focus:ring-siemens-primary focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-siemens-secondary mb-1">
                Email (Optional)
              </label>
              <input
                type="email"
                value={studentFormData.email}
                onChange={(e) =>
                  setStudentFormData({
                    ...studentFormData,
                    email: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-siemens-primary-light rounded-lg focus:ring-2 focus:ring-siemens-primary focus:border-transparent"
              />
            </div>
            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={closeStudentModal}
                className="px-4 py-2 text-siemens-secondary border border-siemens-primary-light rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-4 py-2 bg-siemens-primary text-white rounded-lg hover:bg-siemens-primary-dark disabled:bg-siemens-primary-light transition-colors"
              >
                {actionLoading
                  ? "Saving..."
                  : editingStudent
                  ? "Update Student"
                  : "Add Student"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={confirmDelete}
        itemType={itemToDelete?.type}
        itemName={itemToDelete?.data?.name}
      />
    </div>
  );
};

export default BatchesManager;
