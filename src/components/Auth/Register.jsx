import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { Mail, Lock, User, Eye, EyeOff, CheckCircle } from "lucide-react";

const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isFocused, setIsFocused] = useState({
    name: false,
    email: false,
    password: false,
    confirmPassword: false,
  });

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      return setError("Passwords do not match");
    }
    if (password.length < 6) {
      return setError("Password must be at least 6 characters long");
    }

    setLoading(true);
    try {
      const result = await register(name, email, password);
      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.error || "Registration failed. Please try again.");
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-siemens-primary-50 px-4">
        <div className="max-w-md w-full text-center bg-white p-8 rounded-xl shadow-lg border border-siemens-primary-light">
          <CheckCircle className="h-16 w-16 text-siemens-success mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-siemens-secondary mb-2">
            Registration Successful!
          </h2>
          <p className="text-siemens-secondary-light mb-6">
            Your account has been created. You can now sign in to access the
            platform.
          </p>
          <Link
            to="/login"
            className="inline-block px-6 py-2 bg-siemens-primary hover:bg-siemens-primary-dark text-white font-medium rounded-lg transition-colors"
          >
            Proceed to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-siemens-primary-50 px-4">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <img
              src="/logo.png"
              alt="Siemens Logo"
              className="h-20 w-auto"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src =
                  "https://assets.new.siemens.com/siemens/assets/api/uuid:9d0e7b8b5c6b4e3d8e9f7a6b5c4d3e2f/width:1125/quality:high/logo-siemens.png";
              }}
            />
          </div>
          <h1 className="text-2xl font-bold text-siemens-secondary">
            Siemens Technical Academy
          </h1>
          <h2 className="text-xl mt-2 text-siemens-primary">
            WC&S Test Platform
          </h2>
        </div>

        <div className="bg-white py-8 px-6 rounded-xl shadow-lg border border-siemens-primary-light">
          <h3 className="text-center text-lg font-medium mb-6 text-siemens-secondary">
            Create Teacher Account
          </h3>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="px-4 py-3 rounded-lg flex items-center bg-error-50 border border-error text-error">
                <svg
                  className="w-5 h-5 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium mb-2 text-siemens-secondary"
              >
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User
                    className={`h-5 w-5 ${
                      isFocused.name
                        ? "text-siemens-primary"
                        : "text-siemens-secondary-light"
                    }`}
                  />
                </div>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onFocus={() => setIsFocused({ ...isFocused, name: true })}
                  onBlur={() => setIsFocused({ ...isFocused, name: false })}
                  className={`block w-full pl-10 pr-3 py-3 rounded-lg focus:outline-none transition-colors border ${
                    isFocused.name
                      ? "border-siemens-primary bg-siemens-primary-50"
                      : "border-gray-300 bg-white"
                  }`}
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium mb-2 text-siemens-secondary"
              >
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail
                    className={`h-5 w-5 ${
                      isFocused.email
                        ? "text-siemens-primary"
                        : "text-siemens-secondary-light"
                    }`}
                  />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setIsFocused({ ...isFocused, email: true })}
                  onBlur={() => setIsFocused({ ...isFocused, email: false })}
                  className={`block w-full pl-10 pr-3 py-3 rounded-lg focus:outline-none transition-colors border ${
                    isFocused.email
                      ? "border-siemens-primary bg-siemens-primary-50"
                      : "border-gray-300 bg-white"
                  }`}
                  placeholder="your.email@example.com"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium mb-2 text-siemens-secondary"
              >
                Password (min 6 characters)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock
                    className={`h-5 w-5 ${
                      isFocused.password
                        ? "text-siemens-primary"
                        : "text-siemens-secondary-light"
                    }`}
                  />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setIsFocused({ ...isFocused, password: true })}
                  onBlur={() => setIsFocused({ ...isFocused, password: false })}
                  className={`block w-full pl-10 pr-10 py-3 rounded-lg focus:outline-none transition-colors border ${
                    isFocused.password
                      ? "border-siemens-primary bg-siemens-primary-50"
                      : "border-gray-300 bg-white"
                  }`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-siemens-secondary-light" />
                  ) : (
                    <Eye className="h-5 w-5 text-siemens-secondary-light" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium mb-2 text-siemens-secondary"
              >
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock
                    className={`h-5 w-5 ${
                      isFocused.confirmPassword
                        ? "text-siemens-primary"
                        : "text-siemens-secondary-light"
                    }`}
                  />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onFocus={() =>
                    setIsFocused({ ...isFocused, confirmPassword: true })
                  }
                  onBlur={() =>
                    setIsFocused({ ...isFocused, confirmPassword: false })
                  }
                  className={`block w-full pl-10 pr-10 py-3 rounded-lg focus:outline-none transition-colors border ${
                    isFocused.confirmPassword
                      ? "border-siemens-primary bg-siemens-primary-50"
                      : "border-gray-300 bg-white"
                  }`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={
                    showConfirmPassword ? "Hide password" : "Show password"
                  }
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-siemens-secondary-light" />
                  ) : (
                    <Eye className="h-5 w-5 text-siemens-secondary-light" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full flex justify-center items-center py-3 px-4 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-siemens-primary-light focus:ring-offset-2 font-medium transition-colors ${
                loading
                  ? "bg-siemens-primary-light opacity-70"
                  : "bg-siemens-primary hover:bg-siemens-primary-dark"
              } text-white`}
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Creating Account...
                </>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-siemens-secondary-light">
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-medium hover:underline text-siemens-primary"
              >
                Sign in here
              </Link>
            </p>
          </div>
        </div>

        <div className="text-center">
          <p className="text-xs text-siemens-secondary-light">
            © {new Date().getFullYear()}  All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
