"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../auth";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  // form
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [newsletter, setNewsletter] = useState(false);
  const [hasReferral, setHasReferral] = useState(false);
  const [referral, setReferral] = useState("");

  // ui
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [capsPw, setCapsPw] = useState(false);
  const [capsConfirm, setCapsConfirm] = useState(false);

  // field errors
  const [emailErr, setEmailErr] = useState<string | null>(null);
  const [pwErr, setPwErr] = useState<string | null>(null);
  const [confirmErr, setConfirmErr] = useState<string | null>(null);

  const confirmRef = useRef<HTMLInputElement>(null);

  // helpers
  const validateEmail = (v: string) => /^\S+@\S+\.\S+$/.test(v);
  const hasUpper = (v: string) => /[A-Z]/.test(v);
  const hasLower = (v: string) => /[a-z]/.test(v);
  const hasNumber = (v: string) => /\d/.test(v);
  const hasSymbol = (v: string) => /[^A-Za-z0-9]/.test(v);

  const pwScore = useMemo(() => {
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (hasUpper(pw)) score++;
    if (hasNumber(pw)) score++;
    if (hasSymbol(pw)) score++;
    const labels = ["Very weak", "Weak", "Okay", "Good", "Strong", "Excellent"];
    const colors = ["bg-red-500", "bg-orange-500", "bg-amber-500", "bg-lime-500", "bg-emerald-500", "bg-teal-500"];
    return {
      score,
      label: labels[Math.min(score, labels.length - 1)],
      color: colors[Math.min(score, colors.length - 1)],
      checks: {
        len8: pw.length >= 8,
        len12: pw.length >= 12,
        upper: hasUpper(pw),
        lower: hasLower(pw),
        number: hasNumber(pw),
        symbol: hasSymbol(pw),
      },
    };
  }, [pw]);

  function onCapsCheckPw(e: React.KeyboardEvent<HTMLInputElement>) {
    setCapsPw(e.getModifierState && e.getModifierState("CapsLock"));
  }
  function onCapsCheckConfirm(e: React.KeyboardEvent<HTMLInputElement>) {
    setCapsConfirm(e.getModifierState && e.getModifierState("CapsLock"));
  }

  function genPassword(len = 12) {
    const lower = "abcdefghijklmnopqrstuvwxyz";
    const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const nums = "0123456789";
    const syms = "!@#$%^&*()-_=+[]{};:,.?";
    const all = lower + upper + nums + syms;
    const pick = (s: string) => s[Math.floor(Math.random() * s.length)];
    let res = [pick(lower), pick(upper), pick(nums), pick(syms)];
    for (let i = res.length; i < len; i++) res.push(pick(all));
    // shuffle
    for (let i = res.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [res[i], res[j]] = [res[j], res[i]];
    }
    const pwd = res.join("");
    setPw(pwd);
    setConfirm("");
    setTimeout(() => confirmRef.current?.focus(), 50);
  }

  // validate on change
  useEffect(() => {
    if (!email) setEmailErr(null);
    else setEmailErr(validateEmail(email) ? null : "Enter a valid email");
  }, [email]);

  useEffect(() => {
    // required rule: min 6 (to match your backend leniency), recommend 8+ for strength
    if (!pw) setPwErr(null);
    else setPwErr(pw.length >= 6 ? null : "Password must be at least 6 characters");
    if (!confirm) setConfirmErr(null);
    else setConfirmErr(pw === confirm ? null : "Passwords do not match");
  }, [pw, confirm]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setInfo(null);

    // client checks
    if (!validateEmail(email)) {
      setEmailErr("Enter a valid email");
      return;
    }
    if (pw.length < 6) {
      setPwErr("Password must be at least 6 characters");
      return;
    }
    if (pw !== confirm) {
      setConfirmErr("Passwords do not match");
      return;
    }
    if (!termsAccepted) {
      setErr("Please accept the Terms & Privacy Policy");
      return;
    }

    setLoading(true);
    try {
      // If your register supports extra metadata, you can pass them there as a third arg
      // e.g., await register(email, pw, { referral, newsletter });
      await register(email, pw);
      setInfo("Account created successfully! Redirecting to login…");
      setTimeout(() => navigate("/login"), 1000);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  function OAuthBtn({ provider, label }: { provider: "google" | "github"; label: string }) {
    return (
      <button
        type="button"
        onClick={() => (window.location.href = `/api/auth/oauth/${provider}`)}
        className="w-full py-2.5 rounded-lg border border-white/15 bg-slate-900/60 hover:bg-slate-900/40 transition flex items-center justify-center gap-2"
      >
        <span className="text-lg">{provider === "google" ? "🟢" : "🐙"}</span>
        <span className="font-medium">{label}</span>
      </button>
    );
  }

  const canSubmit =
    !loading &&
    validateEmail(email) &&
    pw.length >= 6 &&
    confirm.length > 0 &&
    pw === confirm &&
    termsAccepted;

  return (
    <main className="min-h-screen relative overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Accent blobs */}
      <div className="pointer-events-none absolute -top-20 -left-20 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />

      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-5xl grid md:grid-cols-2 gap-6">
          {/* Left: Marketing panel */}
          <div className="hidden md:flex flex-col justify-between rounded-2xl border border-white/10 bg-slate-900/60 p-8">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">💰</div>
                <div className="text-xl font-semibold">FinancePro</div>
              </div>
              <h2 className="text-3xl font-bold leading-tight">Join the smarter money club</h2>
              <p className="text-slate-300 mt-2">Create an account to start tracking and optimizing your spending.</p>
              <ul className="mt-6 space-y-3 text-slate-300">
                <li>• Secure by default, privacy‑first</li>
                <li>• Budgets, alerts, and insights</li>
                <li>• Exportable reports and backups</li>
              </ul>
            </div>
            <div className="text-slate-400 text-sm">
              By creating an account, you agree to our{" "}
              <Link to="/terms" className="text-blue-400 hover:underline">Terms</Link>{" "}
              and{" "}
              <Link to="/privacy" className="text-blue-400 hover:underline">Privacy Policy</Link>.
            </div>
          </div>

          {/* Right: Register form */}
          <form onSubmit={submit} className="bg-slate-900/90 p-8 rounded-2xl w-full shadow-2xl space-y-5 border border-white/10 backdrop-blur">
            <h1 className="text-3xl font-bold text-center">Create Account</h1>
            <p className="text-slate-400 text-center">It only takes a minute.</p>

            {err && <div className="text-red-400 text-sm p-2 bg-red-900/20 rounded border border-red-500">{err}</div>}
            {info && <div className="text-emerald-300 text-sm p-2 bg-emerald-900/20 rounded border border-emerald-700/40">{info}</div>}

            {/* OAuth */}
            <div className="grid grid-cols-2 gap-3">
              <OAuthBtn provider="google" label="Sign up with Google" />
              <OAuthBtn provider="github" label="Sign up with GitHub" />
            </div>

            <div className="relative my-2 flex items-center gap-4">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-xs text-slate-400">or sign up with email</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            {/* Email */}
            <label className="block">
              <span className="text-sm text-slate-300">Email</span>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">📧</span>
                <input
                  type="email"
                  className="input pl-10"
                  placeholder="you@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              {emailErr && <div className="text-xs text-red-400 mt-1">{emailErr}</div>}
            </label>

            {/* Password */}
            <label className="block">
              <span className="text-sm text-slate-300">Password</span>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔒</span>
                <input
                  type={showPw ? "text" : "password"}
                  className="input pl-10 pr-24"
                  placeholder="••••••••"
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  onKeyUp={onCapsCheckPw}
                  required
                  autoComplete="new-password"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <button type="button" onClick={() => setShowPw((s) => !s)} className="text-slate-300 hover:text-white px-2" aria-label={showPw ? "Hide password" : "Show password"}>
                    {showPw ? "🙈" : "👁️"}
                  </button>
                  <button type="button" onClick={() => genPassword()} className="text-xs px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-white/10">
                    Generate
                  </button>
                </div>
              </div>
              {capsPw && <div className="text-xs text-amber-300 mt-1">Caps Lock is ON</div>}
              {pwErr && <div className="text-xs text-red-400 mt-1">{pwErr}</div>}
              {pw && (
                <div className="mt-2">
                  <div className="h-1.5 w-full bg-white/10 rounded">
                    <div className={`h-1.5 ${pwScore.color} rounded transition-all`} style={{ width: `${Math.min(100, (pwScore.score / 5) * 100)}%` }} />
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400 mt-1">
                    <span>Strength: {pwScore.label}</span>
                    <span className="text-slate-500">8+ chars recommended</span>
                  </div>
                  <ul className="grid grid-cols-2 gap-1 mt-2 text-xs">
                    <li className={`flex items-center gap-2 ${pwScore.checks.len8 ? "text-emerald-300" : "text-slate-400"}`}>{pwScore.checks.len8 ? "✅" : "⬜️"} 8+ characters</li>
                    <li className={`flex items-center gap-2 ${pwScore.checks.upper ? "text-emerald-300" : "text-slate-400"}`}>{pwScore.checks.upper ? "✅" : "⬜️"} Uppercase</li>
                    <li className={`flex items-center gap-2 ${pwScore.checks.number ? "text-emerald-300" : "text-slate-400"}`}>{pwScore.checks.number ? "✅" : "⬜️"} Number</li>
                    <li className={`flex items-center gap-2 ${pwScore.checks.symbol ? "text-emerald-300" : "text-slate-400"}`}>{pwScore.checks.symbol ? "✅" : "⬜️"} Symbol</li>
                  </ul>
                </div>
              )}
            </label>

            {/* Confirm */}
            <label className="block">
              <span className="text-sm text-slate-300">Confirm Password</span>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">✅</span>
                <input
                  ref={confirmRef}
                  type={showConfirm ? "text" : "password"}
                  className="input pl-10 pr-12"
                  placeholder="Re-enter password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  onKeyUp={onCapsCheckConfirm}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-white px-2"
                  aria-label={showConfirm ? "Hide confirmation" : "Show confirmation"}
                >
                  {showConfirm ? "🙈" : "👁️"}
                </button>
              </div>
              {capsConfirm && <div className="text-xs text-amber-300 mt-1">Caps Lock is ON</div>}
              {confirm && confirm !== pw && <div className="text-xs text-red-400 mt-1">Passwords do not match</div>}
              {confirmErr && <div className="text-xs text-red-400 mt-1">{confirmErr}</div>}
            </label>

            {/* Optional fields */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                <input type="checkbox" checked={hasReferral} onChange={(e) => setHasReferral(e.target.checked)} />
                <span>I have a referral code</span>
              </label>
              {hasReferral && (
                <input
                  type="text"
                  className="input"
                  placeholder="Referral code (optional)"
                  value={referral}
                  onChange={(e) => setReferral(e.target.value)}
                />
              )}
              <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                <input type="checkbox" checked={newsletter} onChange={(e) => setNewsletter(e.target.checked)} />
                <span>Send me product updates (optional)</span>
              </label>
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
              <input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} className="rounded border-slate-700 focus:ring-blue-500" />
              <span>
                I accept the{" "}
                <Link to="/terms" className="text-blue-400 hover:underline font-medium">Terms & Conditions</Link>{" "}
                and{" "}
                <Link to="/privacy" className="text-blue-400 hover:underline font-medium">Privacy Policy</Link>
              </span>
            </label>

            <button
              disabled={!canSubmit}
              type="submit"
              className="w-full py-3 bg-green-600 hover:bg-green-500 rounded-lg font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && (
                <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4A4 4 0 008 12H4z"></path>
                </svg>
              )}
              {loading ? "Creating Account..." : "Register"}
            </button>

            <p className="text-sm text-slate-400 text-center">
              Already have an account?{" "}
              <Link to="/login" className="text-blue-400 hover:underline">Login</Link>
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}