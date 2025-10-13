"use client";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

type LoginPhase = "login" | "mfa";

export default function Login() {
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

  // Form states
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  // UI states
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);
  const [caps, setCaps] = useState(false);
  const [emailErr, setEmailErr] = useState<string | null>(null);
  const [pwErr, setPwErr] = useState<string | null>(null);

  // MFA
  const [phase, setPhase] = useState<LoginPhase>("login");
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const mfaInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedEmail = localStorage.getItem("rememberedEmail");
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  useEffect(() => {
    if (phase === "mfa") {
      setTimeout(() => mfaInputRef.current?.focus(), 50);
    }
  }, [phase]);

  // Helpers
  const validateEmail = (v: string) => /^\S+@\S+\.\S+$/.test(v);
  const passwordStrength = (v: string) => {
    let score = 0;
    if (v.length >= 8) score++;
    if (/[A-Z]/.test(v)) score++;
    if (/[a-z]/.test(v)) score++;
    if (/\d/.test(v)) score++;
    if (/[^A-Za-z0-9]/.test(v)) score++;
    const labels = ["Very weak", "Weak", "Okay", "Good", "Strong"];
    const colors = ["bg-red-500", "bg-orange-500", "bg-amber-500", "bg-lime-500", "bg-emerald-500"];
    return {
      score: Math.min(score, 5),
      label: labels[Math.max(0, score - 1)] || "Very weak",
      color: colors[Math.max(0, score - 1)] || "bg-red-500"
    };
  };
  const pwStrength = passwordStrength(pw);

  function onCapsCheck(e: React.KeyboardEvent<HTMLInputElement>) {
    setCaps(e.getModifierState && e.getModifierState("CapsLock"));
  }

  // Login submit
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setInfo(null);

    const eOk = validateEmail(email);
    const pOk = pw.length >= 6;
    setEmailErr(eOk ? null : "Enter a valid email");
    setPwErr(pOk ? null : "Password must be at least 6 characters");
    if (!eOk || !pOk) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: pw, rememberMe }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (data?.mfaRequired || data?.mfa_required) {
          setPhase("mfa");
          setMfaToken(data?.mfaToken || data?.mfa_token || null);
          setInfo("Enter the 6‑digit authentication code");
        } else {
          throw new Error(data?.message || "Login failed");
        }
        return;
      }

      rememberMe ? localStorage.setItem("rememberedEmail", email) : localStorage.removeItem("rememberedEmail");
      navigate("/");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  // MFA submit
  async function handleMfaSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!mfaToken) {
      setErr("MFA session expired. Please login again.");
      setPhase("login");
      return;
    }
    setLoading(true);
    setErr(null);
    setInfo(null);
    try {
      const res = await fetch(`${API_URL}/auth/mfa/verify`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: mfaCode, mfaToken }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "MFA verification failed");

      rememberMe ? localStorage.setItem("rememberedEmail", email) : localStorage.removeItem("rememberedEmail");
      navigate("/");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "MFA verification failed");
    } finally {
      setLoading(false);
    }
  }

  // Magic link
  async function handleMagicLink() {
    setErr(null);
    setInfo(null);
    if (!validateEmail(email)) {
      setEmailErr("Enter a valid email to receive a magic link");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/magic-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error("Could not send magic link");
      setInfo("Magic link sent! Check your inbox.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Magic link failed");
    } finally {
      setLoading(false);
    }
  }

  function autofillDemo() {
    setEmail("demo@example.com");
    setPw("Demo@1234");
    setInfo("Demo credentials filled. Click Login to proceed.");
  }

  function OAuthBtn({ provider, label }: { provider: "google" | "github"; label: string }) {
    return (
      <button
        type="button"
        onClick={() => (window.location.href = `${API_URL}/auth/oauth/${provider}`)}
        className="w-full py-2.5 rounded-lg border border-white/15 bg-slate-900/60 hover:bg-slate-900/40 transition flex items-center justify-center gap-2"
      >
        <span className="text-lg">{provider === "google" ? "🟢" : "🐙"}</span>
        <span className="font-medium">{label}</span>
      </button>
    );
  }

  return (
    <main className="min-h-screen relative overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="pointer-events-none absolute -top-20 -left-20 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />

      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-5xl grid md:grid-cols-2 gap-6">
          {/* Left panel */}
          <div className="hidden md:flex flex-col justify-between rounded-2xl border border-white/10 bg-slate-900/60 p-8">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">💰</div>
                <div className="text-xl font-semibold">FinancePro</div>
              </div>
              <h2 className="text-3xl font-bold leading-tight">Track. Budget. Grow.</h2>
              <p className="text-slate-300 mt-2">All your personal finances in one beautiful dashboard.</p>

              <ul className="mt-6 space-y-3 text-slate-300">
                <li>• Bank‑level security, privacy first</li>
                <li>• Insights and alerts to cut overspending</li>
                <li>• Exportable reports and backups</li>
              </ul>
            </div>
            <div className="text-slate-400 text-sm">
              By logging in, you agree to our{" "}
              <Link to="/terms" className="text-blue-400 hover:underline">Terms</Link> and{" "}
              <Link to="/privacy" className="text-blue-400 hover:underline">Privacy Policy</Link>.
            </div>
          </div>

          {/* Right panel */}
          <form
            onSubmit={phase === "login" ? handleSubmit : handleMfaSubmit}
            aria-busy={loading}
            className="bg-slate-900/90 p-8 rounded-2xl w-full shadow-2xl space-y-5 border border-white/10 backdrop-blur"
          >
            <h1 className="text-3xl font-bold">{phase === "login" ? "Welcome Back" : "Two‑Factor Authentication"}</h1>
            <p className="text-slate-400">{phase === "login" ? "Sign in to continue to your dashboard." : "Enter the 6‑digit code from your authenticator app or SMS."}</p>

            {err && <div className="text-red-400 text-sm p-2 bg-red-900/20 rounded border border-red-500">{err}</div>}
            {info && <div className="text-emerald-300 text-sm p-2 bg-emerald-900/20 rounded border border-emerald-700/40">{info}</div>}

            {phase === "login" ? (
              <>
                {/* OAuth */}
                <div className="grid grid-cols-2 gap-3">
                  <OAuthBtn provider="google" label="Continue with Google" />
                  <OAuthBtn provider="github" label="Continue with GitHub" />
                </div>

                <div className="relative my-2 flex items-center gap-4">
                  <div className="h-px flex-1 bg-white/10" />
                  <span className="text-xs text-slate-400">or continue with email</span>
                  <div className="h-px flex-1 bg-white/10" />
                </div>

                {/* Email & password */}
                <label className="block">
                  <span className="text-sm text-slate-300">Email</span>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-black">📧</span>
                    <input
                      type="email"
                      placeholder="you@email.com"
                      className="input pl-10"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setEmailErr(e.target.value ? (validateEmail(e.target.value) ? null : "Invalid email") : null);
                      }}
                      required
                      autoComplete="email"
                    />
                  </div>
                  {emailErr && <div className="text-xs text-red-400 mt-1">{emailErr}</div>}
                </label>

                <label className="block">
                  <span className="text-sm text-slate-300">Password</span>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔒</span>
                    <input
                      type={showPw ? "text" : "password"}
                      placeholder="••••••••"
                      className="input pl-10 pr-12"
                      value={pw}
                      onChange={(e) => {
                        setPw(e.target.value);
                        setPwErr(e.target.value.length >= 6 ? null : "Minimum 6 characters");
                      }}
                      onKeyUp={onCapsCheck}
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((s) => !s)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-white px-2"
                    >
                      {showPw ? "🙈" : "👁️"}
                    </button>
                  </div>
                  {caps && <div className="text-xs text-amber-300 mt-1">Caps Lock is ON</div>}
                  {pw && (
                    <div className="mt-2">
                      <div className="h-1.5 w-full bg-white/10 rounded">
                        <div
                          className={`h-1.5 ${pwStrength.color} rounded transition-all`}
                          style={{ width: `${(pwStrength.score / 5) * 100}%` }}
                        />
                      </div>
                      <div className="text-xs text-slate-400 mt-1">Strength: {pwStrength.label}</div>
                    </div>
                  )}
                  {pwErr && <div className="text-xs text-red-400 mt-1">{pwErr}</div>}
                </label>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                    <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
                    <span>Remember me</span>
                  </label>
                  <Link to="/forgot-password" className="text-sm text-blue-400 hover:underline">Forgot Password?</Link>
                </div>

                <button
                  disabled={loading}
                  type="submit"
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading && <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4A4 4 0 008 12H4z"></path></svg>}
                  {loading ? "Logging in..." : "Login"}
                </button>

                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={handleMagicLink} className="button bg-slate-800 hover:bg-slate-700">Send magic link</button>
                  <button type="button" onClick={autofillDemo} className="button">Use demo account</button>
                </div>

                <p className="text-sm text-slate-400 text-center">
                  Don’t have an account? <Link to="/register" className="text-blue-400 hover:underline">Register</Link>
                </p>
              </>
            ) : (
              // MFA step
              <>
                <div className="grid grid-cols-6 gap-2">
                  <input
                    ref={mfaInputRef}
                    inputMode="numeric"
                    pattern="\d*"
                    maxLength={6}
                    placeholder="Enter 6‑digit code"
                    className="input col-span-6 text-center tracking-widest"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    required
                  />
                </div>

                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    className="button bg-slate-800 hover:bg-slate-700"
                    onClick={() => { setPhase("login"); setMfaCode(""); setMfaToken(null); setErr(null); setInfo(null); }}
                  >
                    Back
                  </button>
                  <button
                    disabled={loading || mfaCode.length !== 6}
                    type="submit"
                    className="button bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loading ? "Verifying..." : "Verify"}
                  </button>
                </div>

                <div className="text-sm text-slate-400">
                  Lost access? <Link to="/recovery" className="text-blue-400 hover:underline">Use a recovery code</Link>
                </div>
              </>
            )}
          </form>
        </div>
      </div>
    </main>
  );
}
