import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Users, 
  FileQuestion, 
  ClipboardList, 
  Upload,
  TrendingUp,
  Activity
} from 'lucide-react';

const Overview = () => {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalQuestions: 0,
    totalTests: 0,
    activeTests: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOverviewStats();
  }, []);

  const fetchOverviewStats = async () => {
    try {
      // MODIFIED: Changed to relative paths for Vercel
      const [studentsRes, questionsRes, testsRes] = await Promise.all([
        axios.get('/api/students'),
        axios.get('/api/questions'),
        axios.get('/api/tests')
      ]);

      const activeTests = testsRes.data.filter(test => test.status === 'active').length;

      setStats({
        totalStudents: studentsRes.data.length,
        totalQuestions: questionsRes.data.length,
        totalTests: testsRes.data.length,
        activeTests
      });
    } catch (error) {
      console.error('Error fetching overview stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Students',
      value: stats.totalStudents,
      icon: Users,
      color: 'blue',
      change: '+12%'
    },
    {
      title: 'Question Bank',
      value: stats.totalQuestions,
      icon: FileQuestion,
      color: 'green',
      change: '+8%'
    },
    {
      title: 'Total Tests',
      value: stats.totalTests,
      icon: ClipboardList,
      color: 'purple',
      change: '+23%'
    },
    {
      title: 'Active Tests',
      value: stats.activeTests,
      icon: Activity,
      color: 'orange',
      change: '+5%'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>
        <p className="text-gray-600 mt-2">Monitor your teaching activities and student progress</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, index) => (
          <div
            key={index}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-full bg-${stat.color}-50`}>
                <stat.icon className={`h-6 w-6 text-${stat.color}-600`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Upload className="h-8 w-8 text-blue-600 mr-3" />
            <div className="text-left">
              <p className="font-medium text-gray-900">Upload PDF</p>
              <p className="text-sm text-gray-600">Add new questions from documents</p>
            </div>
          </button>
          
          <button className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <ClipboardList className="h-8 w-8 text-green-600 mr-3" />
            <div className="text-left">
              <p className="font-medium text-gray-900">Create Test</p>
              <p className="text-sm text-gray-600">Set up a new quiz for students</p>
            </div>
          </button>
          
          <button className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Users className="h-8 w-8 text-purple-600 mr-3" />
            <div className="text-left">
              <p className="font-medium text-gray-900">Manage Students</p>
              <p className="text-sm text-gray-600">Add or edit student information</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Overview;
