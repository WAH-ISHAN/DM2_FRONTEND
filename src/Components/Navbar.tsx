// src/Components/Navbar.jsx
import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";

const navLinks = [
  { to: "/", label: "Dashboard" },
  { to: "/expenses", label: "Expenses" },
  { to: "/budgets", label: "Budgets" },
  { to: "/savings", label: "Savings" },
  { to: "/reports", label: "Reports" },
  { to: "/settings", label: "Settings" },
];

export default function Navbar() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/70 backdrop-blur">
      <nav className="container mx-auto flex items-center justify-between px-6 py-3 md:py-4">
        {/* Brand */}
        <Link
          to="/"
          className="flex items-center gap-2 text-lg font-bold text-emerald-400 hover:text-emerald-300 transition"
        >
          💰 <span className="hidden sm:inline">FinancePro</span>
        </Link>

        {/* Hamburger (mobile) */}
        <button
          className="text-slate-200 md:hidden p-2 rounded hover:bg-white/10 transition"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {open ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="h-6 w-6"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="h-6 w-6"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>

        {/* Links */}
        <ul
          className={`${
            open ? "max-h-96 opacity-100" : "max-h-0 opacity-0 md:max-h-none md:opacity-100"
          } absolute left-0 w-full overflow-hidden border-t border-white/10 bg-slate-950/95 backdrop-blur
             transition-all duration-300 md:static md:flex md:w-auto md:border-0 md:bg-transparent md:p-0`}
        >
          {navLinks.map((l) => {
            const active = pathname === l.to;
            return (
              <li key={l.to} className="md:ml-2">
                <Link
                  onClick={() => setOpen(false)}
                  to={l.to}
                  className={`relative block px-4 py-3 text-sm font-medium text-slate-200 transition
                    hover:text-white md:rounded-lg
                    ${active ? "text-emerald-400" : ""}`}
                >
                  {l.label}
                  {/* underline indicator */}
                  <span
                    className={`absolute left-1/2 bottom-1 h-0.5 w-0 bg-emerald-400 transition-all duration-300 ${
                      active ? "w-2/3 -translate-x-1/2" : "group-hover:w-2/3 -translate-x-1/2"
                    }`}
                  />
                </Link>
              </li>
            );
          })}

          <li className="md:ml-4">
            <Link
              onClick={() => setOpen(false)}
              to="/login"
              className="m-2 block rounded-lg bg-blue-600 px-4 py-2 text-center text-sm font-semibold hover:bg-blue-500 transition text-white md:m-0"
            >
              Login
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  );
}