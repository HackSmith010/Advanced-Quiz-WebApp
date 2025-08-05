import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Menu, LogOut, User } from 'lucide-react';

const Header = ({ setSidebarOpen }) => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="flex justify-between items-center px-6 py-4">
        <div className="flex items-center">
          <button
            className="lg:hidden text-gray-500 hover:text-gray-700"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="bg-blue-100 p-2 rounded-full">
              <User className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{user?.name}</p>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
          </div>
          
          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span className="text-sm">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;