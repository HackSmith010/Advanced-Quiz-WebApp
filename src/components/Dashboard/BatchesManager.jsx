import React, { useState, useEffect } from "react";
import axios from "axios";
import { Plus, Users, Edit, Trash2, X } from "lucide-react"; // Changed Box to X

// Reusable modal component
const Modal = ({ children, onClose }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white p-6 rounded-lg w-full max-w-md relative">
      <button
        onClick={onClose}
        className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-200"
      >
        <X size={20} />
      </button>
      {children}
    </div>
  </div>
);

const BatchesManager = () => {
  const [batches, setBatches] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [batchStudents, setBatchStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false); // For modal actions
  const [error, setError] = useState(""); // For displaying errors

  // State for modals
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);

  // Form data
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
    setBatchStudents([]); // Clear previous students
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

  const studentsNotInBatch = allStudents.filter(
    (s) => !batchStudents.some((bs) => bs.id === s.id)
  );

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        Batches & Students
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Batches List */}
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
                <p className="font-semibold">{batch.name}</p>
                <p className="text-sm text-gray-500">
                  {batch.student_count} students
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Students in Batch */}
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
                      <button className="text-red-500 hover:text-red-700">
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

      {/* Create Batch Modal */}
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

      {/* Add/Edit Student Modal */}
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
    </div>
  );
};

export default BatchesManager;
