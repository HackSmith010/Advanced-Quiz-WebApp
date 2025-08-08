import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Brain, 
  Home, 
  Users, 
  FileQuestion, 
  ClipboardList, 
  Upload,
  Box, // New Icon for Batches
  X
} from 'lucide-react';

const Sidebar = ({ open, setOpen }) => {
  const navigation = [
    { name: 'Overview', href: '/dashboard/overview', icon: Home },
    // The "Students" link is removed, as it's now part of Batches
    { name: 'Batches & Students', href: '/dashboard/batches', icon: Box }, 
    { name: 'Questions', href: '/dashboard/questions', icon: FileQuestion },
    { name: 'Tests', href: '/dashboard/tests', icon: ClipboardList },
    { name: 'Upload PDF', href: '/dashboard/upload', icon: Upload },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div 
          className="fixed inset-0 z-40 lg:hidden bg-black bg-opacity-50"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform 
        ${open ? 'translate-x-0' : '-translate-x-full'} 
        lg:translate-x-0 lg:static lg:inset-0 transition duration-200 ease-in-out
      `}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <div className="flex items-center">
            <Brain className="h-8 w-8 text-blue-600" />
            <span className="ml-2 text-xl font-bold text-gray-900">IntelliQuiz AI</span>
          </div>
          <button
            className="lg:hidden text-gray-500 hover:text-gray-700"
            onClick={() => setOpen(false)}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <nav className="mt-6">
          <div className="px-3 space-y-1">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) =>
                  `group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`
                }
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.name}
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </>
  );
};

export default Sidebar;
