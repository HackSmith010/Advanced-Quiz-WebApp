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
  User,
  Hash,
  Mail,
  Loader2,
} from "lucide-react";

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

const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  itemType,
  itemName,
}) => {
  if (!isOpen) return null;
  const isBatch = itemType === "batch";
  const title = isBatch ? "Delete Batch" : "Delete Student";
  const message = isBatch
    ? `Are you sure you want to delete the batch "${itemName}"? This action cannot be undone.`
    : `Are you sure you want to permanently delete the student "${itemName}" from the system? This will remove them from all batches.`;

  return (
    <Modal onClose={onClose} title={title}>
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
          {isBatch ? "Delete Batch" : "Delete Student"}
        </button>
      </div>
    </Modal>
  );
};

const BatchesManager = () => {
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [batchStudents, setBatchStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [studentLoading, setStudentLoading] = useState(false);
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
  }, []);

  const fetchBatches = async () => {
    setLoading(true);
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

  const handleSelectBatch = async (batch) => {
    setSelectedBatch(batch);
    setStudentLoading(true);
    try {
      const response = await axios.get(`/api/batches/${batch.id}/students`);
      setBatchStudents(response.data);
    } catch (error) {
      console.error("Error fetching students for batch:", error);
      setBatchStudents([]);
    } finally {
      setStudentLoading(false);
    }
  };

  const handleStudentSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setError("");
    try {
      if (editingStudent) {
        await axios.put(`/api/students/${editingStudent.id}`, {
          name: studentFormData.name,
          roll_number: studentFormData.rollNumber,
          email: studentFormData.email,
        });
      } else {
        await axios.post(`/api/batches/${selectedBatch.id}/students`, {
          name: studentFormData.name,
          roll_number: studentFormData.rollNumber,
          email: studentFormData.email,
        });
      }

      if (selectedBatch) {
        handleSelectBatch(selectedBatch);
      }
      fetchBatches();
      closeStudentModal();
    } catch (err) {
      console.error("Error saving student:", err);
      setError(err.response?.data?.error || "Failed to save student.");
    } finally {
      setActionLoading(false);
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
        await axios.delete(`/api/students/${itemToDelete.data.id}`);
        if (selectedBatch) {
          handleSelectBatch(selectedBatch);
        }
        fetchBatches();
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
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-siemens-secondary">
          Batches & Students
        </h1>
        <p className="text-siemens-secondary-light">
          Manage student groups and individual apprentices
        </p>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2" /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col">
          <div className="flex justify-between items-center p-4 border-b">
            <h2 className="text-lg font-semibold text-siemens-secondary">
              Batches
            </h2>
            <button
              onClick={openBatchModal}
              className="p-1.5 rounded-md text-siemens-primary hover:bg-siemens-primary-50 transition-colors"
              title="Create New Batch"
            >
              <Plus size={20} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">Loading...</div>
            ) : (
              batches.map((batch) => (
                <div
                  key={batch.id}
                  onClick={() => handleSelectBatch(batch)}
                  className={`flex justify-between items-center p-4 cursor-pointer border-l-4 transition-colors ${
                    selectedBatch?.id === batch.id
                      ? "border-siemens-primary bg-siemens-primary-50"
                      : "border-transparent hover:bg-gray-50"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-siemens-secondary truncate">
                      {batch.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {batch.student_count || 0}{" "}
                      {batch.student_count === 1 ? "student" : "students"}
                    </p>
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick("batch", batch);
                      }}
                      className="p-1 text-gray-400 hover:text-red-600"
                      title="Delete Batch"
                    >
                      <Trash2 size={16} />
                    </button>
                    <ChevronRight size={18} className="text-gray-400" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col">
          {selectedBatch ? (
            <>
              <div className="flex justify-between items-center p-4 border-b">
                <div>
                  <h2 className="text-lg font-semibold text-siemens-secondary">
                    {selectedBatch.name}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {batchStudents.length}{" "}
                    {batchStudents.length === 1 ? "student" : "students"}
                  </p>
                </div>
                <button
                  onClick={() => openStudentModal()}
                  className="flex items-center space-x-2 bg-siemens-primary hover:bg-siemens-primary-dark text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                >
                  <Plus size={16} />
                  <span>Add Student</span>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {studentLoading ? (
                  <div className="flex items-center justify-center h-full p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-siemens-primary" />
                  </div>
                ) : batchStudents.length > 0 ? (
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                      <tr>
                        <th scope="col" className="px-6 py-3">
                          Name
                        </th>
                        <th scope="col" className="px-6 py-3">
                          Roll Number
                        </th>
                        <th scope="col" className="px-6 py-3">
                          Email
                        </th>
                        <th scope="col" className="px-6 py-3 text-right">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {batchStudents.map((student) => (
                        <tr
                          key={student.id}
                          className="bg-white border-b hover:bg-gray-50"
                        >
                          <td className="px-6 py-4 font-medium text-gray-900">
                            {student.name}
                          </td>
                          <td className="px-6 py-4 text-gray-600">
                            {student.roll_number}
                          </td>
                          <td className="px-6 py-4 text-gray-600 truncate max-w-xs">
                            {student.email || "-"}
                          </td>
                          <td className="px-6 py-4 text-right space-x-2">
                            <button
                              onClick={() => openStudentModal(student)}
                              className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                              title="Edit Student"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() =>
                                handleDeleteClick("student_from_batch", student)
                              }
                              className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                              title="Delete Student Permanently"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center p-12">
                    <Users className="mx-auto h-12 w-12 text-gray-300" />
                    <h3 className="mt-2 text-lg font-medium text-gray-800">
                      No Students in Batch
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      This batch is empty. Get started by adding a student.
                    </p>
                    <button
                      onClick={() => openStudentModal()}
                      className="mt-4 text-sm font-semibold text-siemens-primary hover:text-siemens-primary-dark"
                    >
                      Add First Student
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-12">
              <Users className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-2 text-lg font-medium text-gray-800">
                Select a Batch
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Choose a batch from the left panel to view and manage its
                students.
              </p>
            </div>
          )}
        </div>
      </div>

      {showBatchModal && (
        <Modal
          onClose={() => setShowBatchModal(false)}
          title="Create New Batch"
        >
          <form onSubmit={handleCreateBatch} className="space-y-4">
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded-lg text-sm">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Batch Name
              </label>
              <input
                type="text"
                value={newBatchName}
                onChange={(e) => setNewBatchName(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-siemens-primary"
                placeholder="e.g., Summer 2024"
                required
              />
            </div>
            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowBatchModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-4 py-2 bg-siemens-primary text-white rounded-lg hover:bg-siemens-primary-dark disabled:opacity-50"
              >
                {actionLoading ? "Creating..." : "Create Batch"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {showStudentModal && (
        <Modal
          onClose={closeStudentModal}
          title={editingStudent ? "Edit Student" : "Add New Student"}
        >
          <form onSubmit={handleStudentSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded-lg text-sm">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
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
                  className="w-full pl-10 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-siemens-primary"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Roll Number
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Hash className="h-5 w-5 text-gray-400" />
                </div>
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
                  className="w-full pl-10 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-siemens-primary"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email (Optional)
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  value={studentFormData.email}
                  onChange={(e) =>
                    setStudentFormData({
                      ...studentFormData,
                      email: e.target.value,
                    })
                  }
                  className="w-full pl-10 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-siemens-primary"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={closeStudentModal}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-4 py-2 bg-siemens-primary text-white rounded-lg hover:bg-siemens-primary-dark disabled:opacity-50"
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
