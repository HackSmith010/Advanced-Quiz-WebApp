import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import {
  Upload,
  FileText,
  AlertCircle,
  Loader2,
  CheckCircle,
  ChevronRight
} from "lucide-react";

const PDFUpload = () => {
  const [uploads, setUploads] = useState([]);
  const [file, setFile] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchUploads();
  }, []);

  const fetchUploads = async () => {
    try {
      const response = await axios.get("/api/pdf/uploads");
      setUploads(response.data);
    } catch (error) {
      console.error("Error fetching uploads:", error);
    }
  };

  const handleFileSelect = (selectedFile) => {
    if (selectedFile && selectedFile.type === "application/pdf") {
      setFile(selectedFile);
      setDisplayName(selectedFile.name.replace(/\.pdf$/i, ""));
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !displayName) {
      setError("Please select a file and provide a display name.");
      return;
    }
    setLoading(true);
    setError("");
    setMessage("");
    const formData = new FormData();
    formData.append("pdf", file);
    formData.append("displayName", displayName);

    try {
      const response = await axios.post("/api/pdf/upload", formData);
      setMessage(response.data.message);
      setFile(null);
      setDisplayName("");
      fetchUploads();
    } catch (err) {
      console.error("Error uploading PDF:", err);
      setError(err.response?.data?.error || "Upload failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleReusePdf = (uploadId) => {
    navigate(`/dashboard/questions?pdfId=${uploadId}`);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-siemens-secondary">
          PDF Management
        </h1>
        <p className="text-siemens-secondary-light">
          Upload documents to generate questions
        </p>
      </div>

      {/* Upload Form */}
      <div className="bg-white rounded-xl shadow-sm border border-siemens-primary-light p-6 mb-8">
        <h2 className="text-lg font-semibold text-siemens-secondary mb-4">
          Upload New Document
        </h2>

        <form onSubmit={handleUpload} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-siemens-secondary mb-2">
              Select PDF File
            </label>
            <label
              htmlFor="pdf-upload"
              className={`block border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                file
                  ? "border-siemens-primary bg-siemens-primary-5"
                  : "border-siemens-primary-light hover:border-siemens-primary"
              }`}
            >
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => handleFileSelect(e.target.files[0])}
                className="hidden"
                id="pdf-upload"
              />
              <Upload
                className={`h-10 w-10 mx-auto mb-2 ${
                  file ? "text-siemens-primary" : "text-siemens-secondary-light"
                }`}
              />
              <p
                className={`text-sm ${
                  file
                    ? "text-siemens-primary font-medium"
                    : "text-siemens-secondary-light"
                }`}
              >
                {file ? file.name : "Click to browse or drag & drop"}
              </p>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-siemens-secondary mb-2">
              Document Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 border border-siemens-primary-light rounded-lg focus:ring-2 focus:ring-siemens-primary focus:border-transparent"
              placeholder="e.g., Chapter 5 - Percentages"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || !file || !displayName}
            className={`w-full py-3 rounded-lg text-white font-medium flex items-center justify-center ${
              loading || !file || !displayName
                ? "bg-siemens-primary-light cursor-not-allowed"
                : "bg-siemens-primary hover:bg-siemens-primary-dark"
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Processing...
              </>
            ) : (
              <>
                <Upload className="h-5 w-5 mr-2" />
                Upload and Generate Questions
              </>
            )}
          </button>

          {error && (
            <div className="bg-error-50 border border-error text-error px-4 py-3 rounded-lg flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              {error}
            </div>
          )}

          {message && (
            <div className="bg-success-50 border border-success text-success px-4 py-3 rounded-lg flex items-center">
              <CheckCircle className="h-5 w-5 mr-2" />
              {message}
            </div>
          )}
        </form>
      </div>

      {/* Upload History */}
      <div className="bg-white rounded-xl shadow-sm border border-siemens-primary-light">
        <div className="px-6 py-4 border-b border-siemens-primary-light">
          <h2 className="text-lg font-semibold text-siemens-secondary">
            Document History
          </h2>
          <p className="text-sm text-siemens-secondary-light">
            Click on a document to view or manage its questions
          </p>
        </div>

        <div className="divide-y divide-siemens-primary-light">
          {uploads.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-siemens-secondary-light mx-auto mb-4" />
              <p className="text-siemens-secondary-light">No documents found</p>
              <p className="text-sm text-siemens-secondary-light mt-1">
                Upload your first PDF to get started
              </p>
            </div>
          ) : (
            uploads.map((upload) => (
              <div
                key={upload.id}
                onClick={() => handleReusePdf(upload.id)}
                className="px-6 py-4 hover:bg-siemens-primary-5 transition-colors cursor-pointer"
              >
                <div className="flex items-center space-x-4">
                  <div className="p-3 rounded-lg bg-siemens-primary-10">
                    <FileText className="h-6 w-6 text-siemens-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-siemens-secondary truncate">
                      {upload.display_name}
                    </h3>
                    <div className="flex flex-wrap gap-x-4 mt-1">
                      <p className="text-xs text-siemens-secondary-light">
                        <span className="font-medium">Original:</span>{" "}
                        {upload.original_name}
                      </p>
                      <p className="text-xs text-siemens-secondary-light">
                        <span className="font-medium">Uploaded:</span>{" "}
                        {new Date(upload.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-siemens-secondary-light" />
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
