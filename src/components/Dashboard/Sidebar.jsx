import React from "react";
import { NavLink } from "react-router-dom";
import {
  Home,
  Box,
  FileQuestion,
  ClipboardList,
  Upload,
  X,
  UserCog,
} from "lucide-react";

const Sidebar = ({ open, setOpen }) => {
  const navigation = [
    { name: "Overview", href: "/dashboard/overview", icon: Home },
    { name: "Batches & Students", href: "/dashboard/batches", icon: Box },
    { name: "Questions", href: "/dashboard/questions", icon: FileQuestion },
    { name: "Tests", href: "/dashboard/tests", icon: ClipboardList },
    { name: "Upload PDF", href: "/dashboard/upload", icon: Upload },
    { name: "User Management", href: "/dashboard/users", icon: UserCog },
  ];

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 lg:hidden bg-black bg-opacity-50"
          onClick={() => setOpen(false)}
        />
      )}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-68 bg-white shadow-lg transform ${
          open ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 lg:static lg:inset-0 transition duration-200 ease-in-out border-r border-siemens-primary-light`}
      >
        <div className="flex items-center justify-between h-20 px-6 border-b border-siemens-primary-light">
          <div className="flex items-center space-x-3">
            <img
              src="/logo.png"
              alt="Siemens Logo"
              className="h-12 w-auto"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src =
                  "https://assets.new.siemens.com/siemens/assets/api/uuid:9d0e7b8b5c6b4e3d8e9f7a6b5c4d3e2f/width:1125/quality:high/logo-siemens.png";
              }}
            />
            <div className="min-w-0">
              <p className="text-xs text-siemens-secondary-light truncate">
                Siemens Technical Academy
              </p>
              <p className="text-sm font-medium text-siemens-secondary truncate">
                WC&S Test Platform
              </p>
            </div>
          </div>
          <button
            className="lg:hidden text-siemens-secondary-light hover:text-siemens-primary"
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
                  `group flex items-center px-3 py-3 text-sm font-medium rounded-lg mx-2 transition-colors ${
                    isActive
                      ? "bg-siemens-primary-50 text-siemens-primary"
                      : "text-siemens-secondary-light hover:bg-siemens-primary-50 hover:text-siemens-primary"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon
                      className={`mr-3 h-5 w-5 ${
                        isActive
                          ? "text-siemens-primary"
                          : "text-siemens-secondary-light group-hover:text-siemens-primary"
                      }`}
                    />
                    {item.name}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </>
  );
};

export default Sidebar;