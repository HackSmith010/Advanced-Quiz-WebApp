import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
  Users,
  FileQuestion,
  ClipboardList,
  Upload,
  Activity,
} from "lucide-react";

const Overview = () => {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalQuestions: 0,
    totalTests: 0,
    activeTests: 0,
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchOverviewStats();
  }, []);

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return "Just now";
  };

  const fetchOverviewStats = async () => {
    try {
      const [studentsRes, questionsRes, testsRes] = await Promise.all([
        axios.get("/api/students"),
        axios.get("/api/questions"),
        axios.get("/api/tests"),
      ]);

      const activeTests = testsRes.data.filter(
        (test) => test.status === "active"
      ).length;

      setStats({
        totalStudents: studentsRes.data.length,
        totalQuestions: questionsRes.data.length,
        totalTests: testsRes.data.length,
        activeTests,
      });

      const recentTests = testsRes.data.map((test) => ({
        type: "Test Created",
        icon: ClipboardList,
        title: `New test created: "${test.title}"`,
        date: test.created_at,
      }));
      const recentQuestions = questionsRes.data.map((q) => ({
        type: "Question Added",
        icon: FileQuestion,
        title: `New question added to bank`,
        subtitle: q.original_text,
        date: q.created_at,
      }));

      const combinedActivity = [...recentTests, ...recentQuestions]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 4);

      setRecentActivity(combinedActivity);
    } catch (error) {
      console.error("Error fetching overview stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: "Total Students",
      value: stats.totalStudents,
      icon: Users,
      bgColor: "bg-siemens-primary-100",
      textColor: "text-siemens-primary",
    },
    {
      title: "Question Bank",
      value: stats.totalQuestions,
      icon: FileQuestion,
      bgColor: "bg-green-100",
      textColor: "text-green-500",
    },
    {
      title: "Total Tests",
      value: stats.totalTests,
      icon: ClipboardList,
      bgColor: "bg-purple-100",
      textColor: "text-purple-500",
    },
    {
      title: "Active Tests",
      value: stats.activeTests,
      icon: Activity,
      bgColor: "bg-orange-100",
      textColor: "text-orange-500",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-siemens-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-siemens-secondary">
          Dashboard Overview
        </h1>
        <p className="text-siemens-secondary-light mt-2">
          Monitor your teaching activities and student progress
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, index) => (
          <div
            key={index}
            className="bg-white rounded-xl shadow-sm border border-border p-6 hover:shadow-md transition-all duration-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-secondary">
                  {stat.title}
                </p>
                <p className="text-2xl font-bold text-text-primary mt-2">
                  {stat.value}
                </p>
              </div>
              <div className={`p-3 rounded-full ${stat.bgColor}`}>
                <stat.icon className={`h-6 w-6 ${stat.textColor}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-border p-6">
        <h2 className="text-xl font-semibold text-siemens-secondary mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => navigate("/dashboard/upload")}
            className="flex items-center p-4 border border-border rounded-lg hover:bg-siemens-primary-50 transition-colors group"
          >
            <div className="p-2 rounded-lg bg-siemens-primary-50 group-hover:bg-siemens-primary/20 mr-4 transition-colors">
              <Upload className="h-5 w-5 text-siemens-primary" />
            </div>
            <div className="text-left">
              <p className="font-medium text-siemens-secondary">Upload PDF</p>
              <p className="text-sm text-text-secondary">Add new questions</p>
            </div>
          </button>

          <button
            onClick={() => navigate("/dashboard/tests")}
            className="flex items-center p-4 border border-border rounded-lg hover:bg-siemens-primary-50 transition-colors group"
          >
            <div className="p-2 rounded-lg bg-siemens-primary-50 group-hover:bg-siemens-primary/20 mr-4 transition-colors">
              <ClipboardList className="h-5 w-5 text-siemens-primary" />
            </div>
            <div className="text-left">
              <p className="font-medium text-siemens-secondary">Create Test</p>
              <p className="text-sm text-text-secondary">Set up a new quiz</p>
            </div>
          </button>

          <button
            onClick={() => navigate("/dashboard/batches")}
            className="flex items-center p-4 border border-border rounded-lg hover:bg-siemens-primary-50 transition-colors group"
          >
            <div className="p-2 rounded-lg bg-siemens-primary-50 group-hover:bg-siemens-primary/20 mr-4 transition-colors">
              <Users className="h-5 w-5 text-siemens-primary" />
            </div>
            <div className="text-left">
              <p className="font-medium text-siemens-secondary">
                Manage Batches
              </p>
              <p className="text-sm text-text-secondary">Organize students</p>
            </div>
          </button>
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="bg-white rounded-xl shadow-sm border border-border p-6 mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-siemens-secondary">
            Recent Activity
          </h2>
          <button className="text-sm font-medium text-siemens-primary hover:text-siemens-primary-dark">
            View All
          </button>
        </div>
        <div className="space-y-4">
          {recentActivity.map((activity, index) => (
            <div
              key={index}
              className="flex items-start p-3 hover:bg-siemens-primary-50 rounded-lg transition-colors"
            >
              <div className="p-2 rounded-full bg-siemens-primary-50 mr-3 mt-1">
                <activity.icon className="h-4 w-4 text-siemens-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-siemens-secondary">
                  {activity.title}
                </p>
                {activity.subtitle && (
                  <p className="text-xs text-text-secondary truncate w-96">
                    {activity.subtitle}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  {formatTimeAgo(activity.date)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Overview;
