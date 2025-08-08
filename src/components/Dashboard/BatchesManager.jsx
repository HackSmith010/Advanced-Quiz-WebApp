import React, { useState, useEffect } from "react";
import axios from "axios";
import { Plus, Users, Edit, Trash2, X, AlertTriangle } from "lucide-react";

// Reusable Modal Component
const Modal = ({ children, onClose }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div className="bg-white p-6 rounded-lg w-full max-w-md relative shadow-xl">
      <button
        onClick={onClose}
        className="absolute top-3 right-3 p-1 rounded-full text-gray-500 hover:bg-gray-200"
      >
        <X size={20} />
      </button>
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
    ? `Are you sure you want to delete the batch "${itemName}"? All student associations will be removed. This action cannot be undone.`
    : `Are you sure you want to remove "${itemName}" from this batch?`;

  return (
    <Modal onClose={onClose}>
      <div className="flex items-start">
        <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
          <AlertTriangle className="h-6 w-6 text-red-600" />
        </div>
        <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            {title}
          </h3>
          <div className="mt-2">
            <p className="text-sm text-gray-500">{message}</p>
          </div>
        </div>
      </div>
      <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
        <button
          onClick={onConfirm}
          type="button"
          className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 sm:ml-3 sm:w-auto sm:text-sm"
        >
          {isBatch ? "Delete" : "Remove"}
        </button>
        <button
          onClick={onClose}
          type="button"
          className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:w-auto sm:text-sm"
        >
          Cancel
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
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">
        Batches & Students
      </h1>
      {error && (
        <p className="text-red-500 bg-red-100 p-3 rounded-lg mb-4">{error}</p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 bg-white p-4 rounded-lg border">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Batches</h2>
            <button
              onClick={openBatchModal}
              className="p-2 rounded-full hover:bg-gray-200"
            >
              <Plus size={20} />
            </button>
          </div>
          <div className="space-y-2">
            {batches.map((batch) => (
              <div
                key={batch.id}
                onClick={() => handleSelectBatch(batch)}
                className={`p-4 rounded-lg cursor-pointer border ${
                  selectedBatch?.id === batch.id
                    ? "bg-blue-100 border-blue-300"
                    : "bg-white hover:bg-gray-50"
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold">{batch.name}</p>
                    <p className="text-sm text-gray-500">
                      {batch.student_count} students
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClick("batch", batch);
                    }}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="md:col-span-2 bg-white p-4 rounded-lg border">
          {selectedBatch ? (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">
                  Students in {selectedBatch.name}
                </h2>
                <button
                  onClick={() => openStudentModal()}
                  className="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm flex items-center"
                >
                  <Plus size={16} className="mr-1" /> Add New Student
                </button>
              </div>
              <div className="space-y-2">
                {batchStudents.map((student) => (
                  <div
                    key={student.id}
                    className="p-3 bg-gray-50 rounded-lg border flex justify-between items-center"
                  >
                    <div>
                      <p className="font-medium">{student.name}</p>
                      <p className="text-sm text-gray-500">
                        {student.roll_number}
                      </p>
                    </div>
                    <div>
                      <button
                        onClick={() => openStudentModal(student)}
                        className="text-blue-600 hover:text-blue-800 mr-2"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() =>
                          handleDeleteClick("student_from_batch", student)
                        }
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full rounded-lg">
              <p className="text-gray-500">Select a batch to manage students</p>
            </div>
          )}
        </div>
      </div>

      {showBatchModal && (
        <Modal onClose={() => setShowBatchModal(false)}>
          <h2 className="text-lg font-semibold mb-4">Create New Batch</h2>
          <form onSubmit={handleCreateBatch}>
            {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
            <input
              type="text"
              value={newBatchName}
              onChange={(e) => setNewBatchName(e.target.value)}
              className="w-full p-2 border rounded-lg mb-4"
              placeholder="Batch Name"
              required
            />
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowBatchModal(false)}
                className="px-4 py-2 rounded-lg border"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:bg-blue-300"
              >
                {actionLoading ? "Creating..." : "Create"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {showStudentModal && (
        <Modal onClose={closeStudentModal}>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {editingStudent ? "Edit Student" : "Add New Student"}
          </h2>
          <form onSubmit={handleStudentSubmit} className="space-y-4">
            {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={closeStudentModal}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:bg-blue-300"
              >
                {actionLoading
                  ? "Saving..."
                  : editingStudent
                  ? "Update"
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
