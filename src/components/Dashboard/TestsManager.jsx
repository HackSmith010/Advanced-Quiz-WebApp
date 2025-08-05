import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Plus, 
  ClipboardList, 
  Users, 
  Clock, 
  Eye, 
  Share2,
  Play,
  Square,
  BarChart3
} from 'lucide-react';

const TestsManager = () => {
  const [tests, setTests] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    duration_minutes: 60,
    marks_per_question: 1,
    question_ids: []
  });

  useEffect(() => {
    fetchTests();
    fetchApprovedQuestions();
  }, []);

  const fetchTests = async () => {
    try {
      // MODIFIED: Changed to relative path for Vercel
      const response = await axios.get('/api/tests');
      setTests(response.data);
    } catch (error) {
      console.error('Error fetching tests:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchApprovedQuestions = async () => {
    try {
      // MODIFIED: Changed to relative path for Vercel
      const response = await axios.get('/api/questions/approved');
      setQuestions(response.data);
    } catch (error) {
      console.error('Error fetching questions:', error);
    }
  };

  const handleCreateTest = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // MODIFIED: Changed to relative path for Vercel
      await axios.post('/api/tests', formData);
      fetchTests();
      setShowCreateModal(false);
      setFormData({
        title: '',
        description: '',
        duration_minutes: 60,
        marks_per_question: 1,
        question_ids: []
      });
    } catch (error) {
      console.error('Error creating test:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateTestStatus = async (testId, status) => {
    try {
      // MODIFIED: Changed to relative path for Vercel
      await axios.put(`/api/tests/${testId}/status`, { status });
      fetchTests();
    } catch (error) {
      console.error('Error updating test status:', error);
    }
  };

  const copyTestLink = (testLink) => {
    const fullLink = `${window.location.origin}/quiz/${testLink}`;
    navigator.clipboard.writeText(fullLink);
    alert('Test link copied to clipboard!');
  };

  const getStatusBadge = (status) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-800',
      active: 'bg-green-100 text-green-800',
      completed: 'bg-blue-100 text-blue-800'
    };
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status]}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  const handleQuestionToggle = (questionId) => {
    setFormData(prev => ({
      ...prev,
      question_ids: prev.question_ids.includes(questionId)
        ? prev.question_ids.filter(id => id !== questionId)
        : [...prev.question_ids, questionId]
    }));
  };

  if (loading && tests.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tests Management</h1>
          <p className="text-gray-600 mt-2">Create and manage your quizzes</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2 transition-colors"
          disabled={questions.length === 0}
        >
          <Plus className="h-5 w-5" />
          <span>Create Test</span>
        </button>
      </div>

      {questions.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-yellow-800">
            You need approved questions to create tests. Upload PDFs and approve questions first.
          </p>
        </div>
      )}

      {/* Tests List */}
      <div className="space-y-6">
        {tests.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <ClipboardList className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Tests Created</h3>
            <p className="text-gray-600">Create your first test to get started.</p>
          </div>
        ) : (
          tests.map((test) => (
            <div key={test.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    {getStatusBadge(test.status)}
                    <span className="text-sm text-gray-500">
                      {test.total_questions} questions
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {test.title}
                  </h3>
                  {test.description && (
                    <p className="text-gray-600 mb-3">{test.description}</p>
                  )}
                </div>
              </div>

              {/* Test Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {test.duration_minutes} minutes
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <BarChart3 className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {test.marks_per_question} mark(s) per question
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    Total: {test.total_questions * test.marks_per_question} marks
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                <div className="text-xs text-gray-500">
                  Created: {new Date(test.created_at).toLocaleDateString()}
                </div>
                
                <div className="flex space-x-2">
                  {test.status === 'draft' && (
                    <button
                      onClick={() => updateTestStatus(test.id, 'active')}
                      className="flex items-center space-x-1 px-3 py-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                    >
                      <Play className="h-4 w-4" />
                      <span>Activate</span>
                    </button>
                  )}
                  
                  {test.status === 'active' && (
                    <>
                      <button
                        onClick={() => copyTestLink(test.test_link)}
                        className="flex items-center space-x-1 px-3 py-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      >
                        <Share2 className="h-4 w-4" />
                        <span>Share Link</span>
                      </button>
                      <button
                        onClick={() => updateTestStatus(test.id, 'completed')}
                        className="flex items-center space-x-1 px-3 py-1 text-orange-600 hover:bg-orange-50 rounded transition-colors"
                      >
                        <Square className="h-4 w-4" />
                        <span>End Test</span>
                      </button>
                    </>
                  )}
                  
                  <button className="flex items-center space-x-1 px-3 py-1 text-purple-600 hover:bg-purple-50 rounded transition-colors">
                    <Eye className="h-4 w-4" />
                    <span>View Results</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Test Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Create New Test</h2>
            
            <form onSubmit={handleCreateTest} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Test Title
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows="2"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Marks per Question
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.marks_per_question}
                  onChange={(e) => setFormData({ ...formData, marks_per_question: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Questions ({formData.question_ids.length} selected)
                </label>
                <div className="max-h-64 overflow-y-auto border border-gray-300 rounded-lg p-3 space-y-2">
                  {questions.map((question) => (
                    <label key={question.id} className="flex items-start space-x-3 cursor-pointer p-2 hover:bg-gray-50 rounded">
                      <input
                        type="checkbox"
                        checked={formData.question_ids.includes(question.id)}
                        onChange={() => handleQuestionToggle(question.id)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {question.question_template}
                        </p>
                        <p className="text-xs text-gray-500">{question.category}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || formData.question_ids.length === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Test'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestsManager;
