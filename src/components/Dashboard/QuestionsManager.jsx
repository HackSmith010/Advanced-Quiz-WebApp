import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FileQuestion, Check, X, Edit, Trash2, AlertTriangle } from 'lucide-react';

// Reusable Modal Component
const Modal = ({ children, onClose }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div className="bg-white p-6 rounded-lg w-full max-w-2xl relative shadow-xl max-h-[90vh] overflow-y-auto">
      <button onClick={onClose} className="absolute top-3 right-3 p-1 rounded-full text-gray-500 hover:bg-gray-200">
        <X size={20} />
      </button>
      {children}
    </div>
  </div>
);

const QuestionsManager = () => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [formData, setFormData] = useState(null);

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      const response = await axios.get('/api/questions');
      setQuestions(response.data);
    } catch (error) {
      console.error('Error fetching questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateQuestionStatus = async (questionId, status) => {
    try {
      await axios.put(`/api/questions/${questionId}/status`, { status });
      fetchQuestions();
    } catch (error) {
      console.error('Error updating question status:', error);
    }
  };

  const handleUpdateQuestion = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
        const payload = {
            ...formData,
            // Ensure variables are stringified if they are edited as text
            variables: typeof formData.variables === 'string' ? JSON.parse(formData.variables) : formData.variables,
            distractor_formulas: formData.distractor_formulas.split('\n').filter(f => f.trim() !== '')
        };
        await axios.put(`/api/questions/${editingQuestion.id}`, payload);
        fetchQuestions();
        setShowEditModal(false);
    } catch (error) {
        console.error('Error updating question:', error);
        alert('Failed to update question. Check console for details.');
    } finally {
        setActionLoading(false);
    }
  };

  const openEditModal = (question) => {
    setEditingQuestion(question);
    setFormData({
        question_template: question.question_template,
        correct_answer_formula: question.correct_answer_formula,
        distractor_formulas: question.distractor_formulas.join('\n'),
        category: question.category,
        // --- FIX: Include variables in the form state ---
        variables: question.variables 
    });
    setShowEditModal(true);
  };

  const filteredQuestions = questions.filter(q => filter === 'all' || q.status === filter);

  const getStatusBadge = (status) => {
    const styles = {
      pending_review: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status]}`}>
        {status.replace(/_/g, ' ').toUpperCase()}
      </span>
    );
  };

  return (
    <div>
      {/* Header and Filter Tabs */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Questions Bank</h1>
          <p className="text-gray-600 mt-2">Review and manage your question templates</p>
        </div>
      </div>
      <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {['all', 'pending_review', 'approved', 'rejected'].map((tab) => (
              <button key={tab} onClick={() => setFilter(tab)}
                className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  filter === tab ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.replace(/_/g, ' ').toUpperCase()} ({questions.filter(q => tab === 'all' || q.status === tab).length})
              </button>
            ))}
          </nav>
      </div>
      
      <div className="space-y-6">
        {filteredQuestions.map((question) => (
          <div key={question.id} className="bg-white rounded-xl border p-6">
            <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    {getStatusBadge(question.status)}
                    <span className="text-sm text-gray-500">{question.category}</span>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">{question.question_template}</h3>
                  <p className="text-sm text-gray-600 mb-3"><strong>Original:</strong> {question.original_text}</p>
                </div>
            </div>
            <div className="flex justify-end space-x-2">
                {question.status !== 'approved' && (
                    <button onClick={() => updateQuestionStatus(question.id, 'approved')} className="flex items-center text-green-600 hover:bg-green-50 p-2 rounded"><Check className="h-4 w-4 mr-1" /> Approve</button>
                )}
                {question.status !== 'rejected' && (
                    <button onClick={() => updateQuestionStatus(question.id, 'rejected')} className="flex items-center text-orange-600 hover:bg-orange-50 p-2 rounded"><X className="h-4 w-4 mr-1" /> Reject</button>
                )}
                <button onClick={() => openEditModal(question)} className="flex items-center text-blue-600 hover:bg-blue-50 p-2 rounded"><Edit className="h-4 w-4 mr-1" /> Edit</button>
                <button className="flex items-center text-red-600 hover:bg-red-50 p-2 rounded"><Trash2 className="h-4 w-4 mr-1" /> Delete</button>
            </div>
          </div>
        ))}
      </div>

      {showEditModal && formData && (
        <Modal onClose={() => setShowEditModal(false)}>
            <h2 className="text-xl font-semibold mb-4">Edit Question Template</h2>
            <form onSubmit={handleUpdateQuestion} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Question Template</label>
                    <textarea value={formData.question_template} onChange={(e) => setFormData({...formData, question_template: e.target.value})}
                              rows="3" className="w-full p-2 border rounded-lg font-mono text-sm"/>
                </div>
                {/* --- NEW: Display for variables --- */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Variables (Read-only)</label>
                    <textarea value={JSON.stringify(formData.variables, null, 2)}
                              readOnly
                              rows="4" className="w-full p-2 border rounded-lg bg-gray-100 font-mono text-sm"/>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Correct Answer Formula</label>
                    <input type="text" value={formData.correct_answer_formula} onChange={(e) => setFormData({...formData, correct_answer_formula: e.target.value})}
                           className="w-full p-2 border rounded-lg font-mono text-sm"/>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Distractor Formulas (one per line)</label>
                    <textarea value={formData.distractor_formulas} onChange={(e) => setFormData({...formData, distractor_formulas: e.target.value})}
                              rows="3" className="w-full p-2 border rounded-lg font-mono text-sm"/>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <input type="text" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})}
                           className="w-full p-2 border rounded-lg"/>
                </div>
                <div className="flex justify-end space-x-2">
                    <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 rounded-lg border">Cancel</button>
                    <button type="submit" disabled={actionLoading} className="px-4 py-2 rounded-lg bg-blue-600 text-white">
                        {actionLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </form>
        </Modal>
      )}
    </div>
  );
};

export default QuestionsManager;