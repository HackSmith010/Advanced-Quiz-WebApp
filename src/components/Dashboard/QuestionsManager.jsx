import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FileQuestion, Check, X, Edit, Trash2, Eye } from 'lucide-react';

const QuestionsManager = () => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, pending_review, approved, rejected

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      // MODIFIED: Changed to relative path for Vercel
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
      // MODIFIED: Changed to relative path for Vercel
      await axios.put(`/api/questions/${questionId}/status`, { status });
      fetchQuestions();
    } catch (error) {
      console.error('Error updating question status:', error);
    }
  };

  const deleteQuestion = async (questionId) => {
    if (window.confirm('Are you sure you want to delete this question?')) {
      try {
        // MODIFIED: Changed to relative path for Vercel
        await axios.delete(`/api/questions/${questionId}`);
        fetchQuestions();
      } catch (error) {
        console.error('Error deleting question:', error);
      }
    }
  };

  const filteredQuestions = questions.filter(question => 
    filter === 'all' || question.status === filter
  );

  const getStatusBadge = (status) => {
    const styles = {
      pending_review: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status]}`}>
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  if (loading) {
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
          <h1 className="text-3xl font-bold text-gray-900">Questions Bank</h1>
          <p className="text-gray-600 mt-2">Review and manage your question templates</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { key: 'all', label: 'All Questions', count: questions.length },
              { key: 'pending_review', label: 'Pending Review', count: questions.filter(q => q.status === 'pending_review').length },
              { key: 'approved', label: 'Approved', count: questions.filter(q => q.status === 'approved').length },
              { key: 'rejected', label: 'Rejected', count: questions.filter(q => q.status === 'rejected').length }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  filter === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-6">
        {filteredQuestions.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <FileQuestion className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Questions Found</h3>
            <p className="text-gray-600">Upload a PDF to get started with question extraction.</p>
          </div>
        ) : (
          filteredQuestions.map((question) => (
            <div key={question.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    {getStatusBadge(question.status)}
                    <span className="text-sm text-gray-500">{question.category}</span>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {question.question_template}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    <strong>Original:</strong> {question.original_text}
                  </p>
                </div>
              </div>

              {/* Variables */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Variables:</h4>
                <div className="flex flex-wrap gap-2">
                  {question.variables.map((variable, index) => (
                    <span
                      key={index}
                      className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-sm"
                    >
                      {variable.name}: {variable.value} {variable.unit}
                    </span>
                  ))}
                </div>
              </div>

              {/* Formula */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-1">Formula:</h4>
                <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                  {question.correct_answer_formula}
                </code>
              </div>

              {/* Actions */}
              <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                <div className="text-xs text-gray-500">
                  Created: {new Date(question.created_at).toLocaleDateString()}
                </div>
                
                <div className="flex space-x-2">
                  {question.status === 'pending_review' && (
                    <>
                      <button
                        onClick={() => updateQuestionStatus(question.id, 'approved')}
                        className="flex items-center space-x-1 px-3 py-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                      >
                        <Check className="h-4 w-4" />
                        <span>Approve</span>
                      </button>
                      <button
                        onClick={() => updateQuestionStatus(question.id, 'rejected')}
                        className="flex items-center space-x-1 px-3 py-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        <X className="h-4 w-4" />
                        <span>Reject</span>
                      </button>
                    </>
                  )}
                  
                  <button className="flex items-center space-x-1 px-3 py-1 text-blue-600 hover:bg-blue-50 rounded transition-colors">
                    <Edit className="h-4 w-4" />
                    <span>Edit</span>
                  </button>
                  
                  <button
                    onClick={() => deleteQuestion(question.id)}
                    className="flex items-center space-x-1 px-3 py-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default QuestionsManager;
