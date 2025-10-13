import React, { useState } from "react";
import { Routes, Route, Link, useNavigate, useLocation } from "react-router-dom";
import { AuthProvider, RequireAuth, useAuth } from "./auth";

import Dashboard from "./pages/Dashboard";
import Budgets from "./pages/Budgets";
import Expenses from "./pages/Expenses";
import Savings from "./pages/Savings";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import Register from "./pages/Register";

// -----------------------------------------------------------------------------
// Unified Navbar (brand + routes + login/logout)
function Navbar() {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const navLinks = [
    { to: "/", label: "Dashboard" },
    { to: "/expenses", label: "Expenses" },
    { to: "/budgets", label: "Budgets" },
    { to: "/savings", label: "Savings" },
    { to: "/reports", label: "Reports" },
    { to: "/settings", label: "Settings" },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur">
      <nav className="container mx-auto flex items-center justify-between px-6 py-3 md:py-4 text-slate-200">
        {/* Brand */}
        <Link
          to="/"
          onClick={() => setOpen(false)}
          className="flex items-center gap-2 text-lg font-bold text-emerald-400 hover:text-emerald-300 transition"
        >
          💰 FinancePro
        </Link>

        {/* Hamburger (mobile) */}
        <button
          className="p-2 text-slate-200 md:hidden hover:bg-white/10 rounded transition"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {open ? (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-6 w-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-6 w-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>

        {/* Links */}
        <ul
          className={`${
            open ? "max-h-96 opacity-100" : "max-h-0 opacity-0 md:max-h-none md:opacity-100"
          } absolute left-0 top-full w-full overflow-hidden bg-slate-950/95 backdrop-blur
             border-t border-white/10 transition-all duration-300 md:static md:flex md:w-auto md:border-0 md:bg-transparent md:p-0`}
        >
          {navLinks.map((l) => {
            const active = pathname === l.to;
            return (
              <li key={l.to} className="md:ml-2">
                <Link
                  to={l.to}
                  onClick={() => setOpen(false)}
                  className={`block px-4 py-3 text-sm font-medium transition hover:text-white md:rounded-lg ${
                    active ? "text-emerald-400" : ""
                  }`}
                >
                  {l.label}
                </Link>
              </li>
            );
          })}

          {/* Right‑side auth buttons */}
          <li className="md:ml-4">
            {user ? (
              <div className="flex flex-col md:flex-row items-center gap-2 md:gap-3 px-4 py-3 md:px-0">
                <span className="text-sm text-slate-400">{user.email}</span>
                <button
                  onClick={() => logout().then(() => navigate("/login"))}
                  className="rounded bg-red-600/80 px-3 py-1.5 text-sm font-semibold hover:bg-red-600 transition"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex flex-col md:flex-row gap-2 px-4 py-3 md:px-0">
                <Link
                  to="/login"
                  onClick={() => setOpen(false)}
                  className="rounded bg-blue-600/80 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-600 transition text-center"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  onClick={() => setOpen(false)}
                  className="rounded bg-emerald-600/80 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-600 transition text-center"
                >
                  Register
                </Link>
              </div>
            )}
          </li>
        </ul>
      </nav>
    </header>
  );
}

// -----------------------------------------------------------------------------
// App component
export default function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-slate-950 text-white">
        <Navbar />
        <main className="p-4 md:p-6">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route
              path="/"
              element={
                <RequireAuth>
                  <Dashboard />
                </RequireAuth>
              }
            />
            <Route
              path="/budgets"
              element={
                <RequireAuth>
                  <Budgets />
                </RequireAuth>
              }
            />
            <Route
              path="/expenses"
              element={
                <RequireAuth>
                  <Expenses />
                </RequireAuth>
              }
            />
            <Route
              path="/savings"
              element={
                <RequireAuth>
                  <Savings />
                </RequireAuth>
              }
            />
            <Route
              path="/reports"
              element={
                <RequireAuth>
                  <Reports />
                </RequireAuth>
              }
            />
            <Route
              path="/settings"
              element={
                <RequireAuth>
                  <Settings />
                </RequireAuth>
              }
            />
          </Routes>
        </main>
      </div>
    </AuthProvider>
  );
}