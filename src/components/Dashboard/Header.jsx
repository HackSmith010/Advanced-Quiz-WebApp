import React, { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { Menu, LogOut, User, AlertTriangle } from "lucide-react";

const ConfirmationModal = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl border border-siemens-primary-light">
        <div className="flex flex-col items-center text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <AlertTriangle className="h-6 w-6 text-siemens-error" />
          </div>
          <h3 className="text-lg font-semibold text-siemens-secondary mb-2">
            Confirm Logout
          </h3>
          <p className="text-sm text-siemens-secondary-light mb-6">
            Are you sure you want to sign out of your account?
          </p>
          <div className="w-full flex justify-center space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-sm font-medium rounded-lg border border-gray-300 text-siemens-secondary hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="px-5 py-2 text-sm font-medium rounded-lg bg-siemens-error text-white hover:bg-red-700 transition-colors shadow-sm"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Header = ({ setSidebarOpen }) => {
  const { user, logout } = useAuth();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleLogoutClick = () => setShowConfirm(true);
  const confirmLogout = () => {
    logout();
    setShowConfirm(false);
  };

  return (
    <>
      <header className="bg-white shadow-sm border-b border-siemens-primary-light">
        <div className="flex justify-between items-center px-6 py-4">
          <div className="flex items-center">
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-siemens-primary-10 text-siemens-secondary-light hover:text-siemens-primary transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-3 bg-siemens-primary-10 rounded-full pl-3 pr-4 py-1">
              <div className="bg-white p-1.5 rounded-full shadow-sm">
                <User className="h-4 w-4 text-siemens-primary" />
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-siemens-secondary truncate max-w-[160px]">
                  {user?.name}
                </p>
                <p className="text-xs text-siemens-secondary-light truncate max-w-[160px]">
                  {user?.email}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogoutClick}
              className="flex items-center space-x-2 group"
              aria-label="Logout"
            >
              <div className="p-2 rounded-lg bg-siemens-primary-10 text-siemens-primary hover:bg-siemens-primary hover:text-white transition-colors">
                <LogOut className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium text-siemens-primary hidden sm:inline">
                Sign Out
              </span>
            </button>
          </div>
        </div>
      </header>
      <ConfirmationModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={confirmLogout}
      />
    </>
  );
};

export default Header;
