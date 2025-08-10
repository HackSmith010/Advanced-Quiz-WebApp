import React, { useState, useEffect } from "react";
import axios from "axios";
import { UserCheck, Clock, AlertCircle, Loader2 } from "lucide-react";

const UserManagement = () => {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(null);

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  const fetchPendingUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/auth/pending-users");
      setPendingUsers(response.data);
      setError("");
    } catch (err) {
      setError("Failed to load pending users. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId) => {
    try {
      setProcessing(userId);
      await axios.put(`/api/auth/approve-user/${userId}`);
      fetchPendingUsers();
    } catch (err) {
      setError("Failed to approve user. Please try again.");
      console.error(err);
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-siemens-secondary">
          User Approval Requests
        </h1>
        <p className="text-siemens-secondary-light">
          Review and approve new user registrations
        </p>
      </div>

      {error && (
        <div className="bg-error-50 border border-error text-error px-4 py-3 rounded-lg mb-6 flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-siemens-primary" />
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-siemens-primary-light overflow-hidden">
          {pendingUsers.length === 0 ? (
            <div className="p-8 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-siemens-primary-10 mb-3">
                <UserCheck className="h-6 w-6 text-siemens-primary" />
              </div>
              <h3 className="text-lg font-medium text-siemens-secondary mb-1">
                No pending requests
              </h3>
              <p className="text-siemens-secondary-light">
                All user requests have been processed
              </p>
            </div>
          ) : (
            <div className="divide-y divide-siemens-primary-light">
              {pendingUsers.map((user) => (
                <div
                  key={user.id}
                  className="p-4 hover:bg-siemens-primary-5 transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-siemens-secondary">
                        {user.name}
                      </p>
                      <p className="text-sm text-siemens-secondary-light">
                        {user.email}
                      </p>
                      <div className="flex items-center mt-1">
                        <Clock className="h-3 w-3 text-siemens-secondary-light mr-1" />
                        <span className="text-xs text-siemens-secondary-light">
                          Requested on{" "}
                          {new Date(user.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleApprove(user.id)}
                      disabled={processing === user.id}
                      className="flex items-center space-x-1 bg-siemens-success hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm transition-colors disabled:opacity-70"
                    >
                      {processing === user.id ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Processing</span>
                        </>
                      ) : (
                        <>
                          <UserCheck className="h-4 w-4" />
                          <span>Approve</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UserManagement;
