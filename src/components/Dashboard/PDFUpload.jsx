import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Upload, FileText, Check, X, Clock, AlertCircle } from 'lucide-react';

const PDFUpload = () => {
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    fetchUploads();
  }, []);

  const fetchUploads = async () => {
    try {
      // MODIFIED: Changed to relative path for Vercel
      const response = await axios.get('/api/pdf/uploads');
      setUploads(response.data);
    } catch (error) {
      console.error('Error fetching uploads:', error);
    }
  };

  const handleFileUpload = async (file) => {
    if (!file || file.type !== 'application/pdf') {
      alert('Please select a PDF file.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB.');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('pdf', file);

    try {
      // MODIFIED: Changed to relative path for Vercel
      await axios.post('/api/pdf/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      fetchUploads();
      alert('PDF uploaded successfully! Processing will begin shortly.');
    } catch (error) {
      console.error('Error uploading PDF:', error);
      alert('Error uploading PDF. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-5 w-5 text-gray-500" />;
      case 'processing':
        return <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>;
      case 'completed':
        return <Check className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <X className="h-5 w-5 text-red-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-gray-100 text-gray-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">PDF Question Extraction</h1>
        <p className="text-gray-600 mt-2">Upload PDF documents to automatically extract and parse questions</p>
      </div>

      {/* Upload Area */}
      <div className="mb-8">
        <div
          className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
            dragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept=".pdf"
            onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0])}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={loading}
          />
          
          <div className="space-y-4">
            <div className="flex justify-center">
              <Upload className="h-12 w-12 text-gray-400" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                {loading ? 'Uploading...' : 'Upload PDF Document'}
              </h3>
              <p className="text-gray-600 mt-1">
                Drag and drop your PDF here, or click to browse
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Maximum file size: 10MB
              </p>
            </div>
            {loading && (
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-blue-50 rounded-xl p-6 mb-8">
        <h2 className="text-lg font-semibold text-blue-900 mb-3">How AI Processing Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-start space-x-2">
            <div className="bg-blue-100 rounded-full p-1 mt-0.5">
              <span className="text-blue-600 font-bold text-xs">1</span>
            </div>
            <div>
              <p className="font-medium text-blue-900">Extract Text</p>
              <p className="text-blue-700">OCR technology reads your PDF content</p>
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <div className="bg-blue-100 rounded-full p-1 mt-0.5">
              <span className="text-blue-600 font-bold text-xs">2</span>
            </div>
            <div>
              <p className="font-medium text-blue-900">Identify Questions</p>
              <p className="text-blue-700">AI parses and identifies individual questions</p>
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <div className="bg-blue-100 rounded-full p-1 mt-0.5">
              <span className="text-blue-600 font-bold text-xs">3</span>
            </div>
            <div>
              <p className="font-medium text-blue-900">Create Templates</p>
              <p className="text-blue-700">Converts to dynamic question templates</p>
            </div>
          </div>
        </div>
      </div>

      {/* Upload History */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Upload History</h2>
        </div>
        
        <div className="divide-y divide-gray-200">
          {uploads.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No uploads yet. Upload your first PDF to get started.</p>
            </div>
          ) : (
            uploads.map((upload) => (
              <div key={upload.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-8 w-8 text-blue-600" />
                    <div>
                      <h3 className="font-medium text-gray-900">{upload.original_name}</h3>
                      <p className="text-sm text-gray-600">{upload.filename}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {upload.questions_extracted} questions extracted
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(upload.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(upload.processing_status)}
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(upload.processing_status)}`}>
                        {upload.processing_status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default PDFUpload;
