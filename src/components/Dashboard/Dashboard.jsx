import React, { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import Overview from "./Overview";
import StudentsManager from "./StudentsManager";
import QuestionsManager from "./QuestionsManager";
import TestsManager from "./TestsManager";
import PDFUpload from "./PDFUpload";
import BatchesManager from './BatchesManager';
import UserManagement from './UserManagement';

const Dashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header setSidebarOpen={setSidebarOpen} />

        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100">
          <div className="container mx-auto px-6 py-8">
            <Routes>
              <Route
                path="/"
                element={<Navigate to="/dashboard/overview" replace />}
              />
              <Route path="/overview" element={<Overview />} />
              <Route path="/students" element={<StudentsManager />} />
              <Route path="/batches" element={<BatchesManager />} />
              <Route path="/questions" element={<QuestionsManager />} />
              <Route path="/tests" element={<TestsManager />} />
              <Route path="/upload" element={<PDFUpload />} />
              <Route path="/users" element={<UserManagement />} /> 
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
