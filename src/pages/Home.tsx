"use client";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

type Expense = { id: number; date: string; category: string; description: string; amount: number };

export default function HomePage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [currency, setCurrency] = useState("Rs.");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Read saved currency
  useEffect(() => {
    const saved = localStorage.getItem("currency");
    if (saved) setCurrency(saved);
  }, []);

  // Load data
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/expenses", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load expenses");
        const data: Expense[] = await res.json();
        setExpenses(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to fetch data");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Helpers
  const ymNow = useMemo(() => new Date().toISOString().slice(0, 7), []);
  const ymPrev = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }, []);
  const nfmt = (n: number) => `${currency} ${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  const monthLabel = useMemo(() => new Date().toLocaleString("default", { month: "short", year: "numeric" }), []);
  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

  // Derived stats
  const totalAll = useMemo(() => expenses.reduce((s, x) => s + x.amount, 0), [expenses]);

  const monthlyTotal = useMemo(
    () => expenses.filter((x) => x.date.startsWith(ymNow)).reduce((s, x) => s + x.amount, 0),
    [expenses, ymNow]
  );
  const prevMonthly = useMemo(
    () => expenses.filter((x) => x.date.startsWith(ymPrev)).reduce((s, x) => s + x.amount, 0),
    [expenses, ymPrev]
  );

  const avgPerDay = useMemo(() => {
    const day = today.getDate();
    return day ? monthlyTotal / day : 0;
  }, [monthlyTotal, today]);

  const projected = useMemo(() => avgPerDay * daysInMonth, [avgPerDay, daysInMonth]);
  const momChange = useMemo(() => (prevMonthly > 0 ? ((monthlyTotal - prevMonthly) / prevMonthly) * 100 : null), [monthlyTotal, prevMonthly]);

  // Sparkline for this month (no external libs)
  const spark = useMemo(() => {
    const arr = Array.from({ length: daysInMonth }, () => 0);
    for (const x of expenses) {
      if (!x.date.startsWith(ymNow)) continue;
      const d = parseInt(x.date.slice(8, 10), 10);
      if (d >= 1 && d <= daysInMonth) arr[d - 1] += x.amount;
    }
    const max = Math.max(1, ...arr);
    return { arr, max, daysInMonth };
  }, [expenses, ymNow, daysInMonth]);

  // Category breakdown (this month)
  const catTotals = useMemo(() => {
    const map = new Map<string, number>();
    for (const x of expenses) {
      if (!x.date.startsWith(ymNow)) continue;
      map.set(x.category, (map.get(x.category) || 0) + x.amount);
    }
    return Array.from(map.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6);
  }, [expenses, ymNow]);

  // Recent
  const recent = useMemo(
    () =>
      expenses
        .slice()
        .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.id - a.id))
        .slice(0, 6),
    [expenses]
  );

  // Insight
  const insightText = useMemo(() => {
    if (momChange != null && momChange > 10) return "This month is trending higher than last month. Consider tightening top categories.";
    if (momChange != null && momChange < -10) return "Great! You're spending less than last month. Keep it up.";
    if (projected && monthlyTotal && projected > monthlyTotal * 1.3) return "Spending is accelerating — set a budget alert.";
    return "Track frequent categories to cut overspending faster.";
  }, [momChange, projected, monthlyTotal]);

  return (
    <main className="container mx-auto px-6 py-12 text-white">
      {/* Header */}
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold">Personal Finance Dashboard</h1>
          <p className="text-slate-400 mt-1">Snapshot of your spending</p>
        </div>
        <div className="flex gap-2">
          <Link to="/login" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg">Login</Link>
          <Link to="/register" className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg">Register</Link>
        </div>
      </header>

      {error && <p className="text-red-400 mb-4">{error}</p>}

      {/* Loading skeleton */}
      {loading && !error && (
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="h-28 rounded-xl bg-white/5 border border-white/10 animate-pulse" />
          <div className="h-28 rounded-xl bg-white/5 border border-white/10 animate-pulse" />
          <div className="h-28 rounded-xl bg-white/5 border border-white/10 animate-pulse" />
          <div className="h-28 rounded-xl bg-white/5 border border-white/10 animate-pulse" />
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Key stats */}
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <div className="p-6 bg-white/5 border border-white/10 rounded-xl">
              <div className="text-slate-300 text-sm flex items-center gap-2">💸 Total Expenses</div>
              <div className="text-3xl font-bold mt-1">{nfmt(totalAll)}</div>
            </div>
            <div className="p-6 bg-white/5 border border-white/10 rounded-xl">
              <div className="text-slate-300 text-sm flex items-center gap-2">📆 This Month ({monthLabel})</div>
              <div className="text-3xl font-bold mt-1">{nfmt(monthlyTotal)}</div>
            </div>
            <div className="p-6 bg-white/5 border border-white/10 rounded-xl">
              <div className="text-slate-300 text-sm flex items-center gap-2">🗓️ Avg / Day</div>
              <div className="text-3xl font-bold mt-1">{nfmt(avgPerDay)}</div>
            </div>
            <div className="p-6 bg-white/5 border border-white/10 rounded-xl">
              <div className="text-slate-300 text-sm flex items-center gap-2">🔮 Projected Month‑End</div>
              <div className="text-3xl font-bold mt-1">{nfmt(projected)}</div>
            </div>
          </div>

          {/* Insight + Trend + Categories */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {/* Insight */}
            <div className="p-6 bg-white/5 border border-white/10 rounded-xl">
              <div className="text-slate-300 text-sm">Quick Insight</div>
              <div className="text-lg mt-1">{insightText}</div>
              {momChange != null && (
                <div
                  className={`inline-flex mt-3 px-2.5 py-1 rounded-full text-xs font-medium ${
                    momChange >= 0 ? "bg-rose-500/20 text-rose-200" : "bg-emerald-500/20 text-emerald-200"
                  }`}
                >
                  MoM {momChange >= 0 ? "▲" : "▼"} {Math.abs(momChange).toFixed(1)}%
                </div>
              )}
            </div>

            {/* Trend */}
            <div className="p-6 bg-white/5 border border-white/10 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold">Spending Trend</h3>
                <span className="text-sm text-slate-400">{monthLabel}</span>
              </div>
              <div className="h-24">
                <svg viewBox="0 0 100 40" className="w-full h-full">
                  <polyline
                    fill="none"
                    stroke="#34d399"
                    strokeWidth="2"
                    points={spark.arr
                      .map((v, i) => {
                        const x = (i / Math.max(1, spark.daysInMonth - 1)) * 100;
                        const y = 40 - (v / spark.max) * 36 - 2;
                        return `${x},${y}`;
                      })
                      .join(" ")}
                  />
                  <line x1="0" y1="38" x2="100" y2="38" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
                </svg>
              </div>
              <div className="mt-2 text-slate-400 text-sm">
                Days tracked: {spark.arr.filter((v) => v > 0).length}/{spark.daysInMonth}
              </div>
            </div>

            {/* Categories */}
            <div className="p-6 bg-white/5 border border-white/10 rounded-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Category Breakdown</h3>
                <Link to="/reports" className="text-sm text-slate-300 hover:text-white">View all →</Link>
              </div>
              <div className="mt-4 space-y-3">
                {catTotals.length === 0 ? (
                  <div className="text-slate-400">No category data yet.</div>
                ) : (
                  catTotals.map((c, i) => {
                    const colors = ["bg-emerald-500", "bg-blue-500", "bg-amber-500", "bg-fuchsia-500", "bg-violet-500", "bg-cyan-500"];
                    const color = colors[i % colors.length];
                    const p = monthlyTotal ? Math.min(100, Math.round((c.amount / monthlyTotal) * 100)) : 0;
                    return (
                      <div key={c.name}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${color}`} />
                            <span className="text-slate-300">{c.name}</span>
                          </div>
                          <div className="text-sm">{nfmt(c.amount)} <span className="text-slate-400">({p}%)</span></div>
                        </div>
                        <div className="mt-2 h-2 bg-white/10 rounded overflow-hidden">
                          <div className={`h-full ${color}`} style={{ width: `${p}%` }} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Quick links */}
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { href: "/expenses", title: "📈 Expenses", desc: "View & manage expenses" },
              { href: "/budgets", title: "🎯 Budgets", desc: "Create & monitor budgets" },
              { href: "/savings", title: "🏦 Savings", desc: "Track your goals" },
              { href: "/reports", title: "📊 Reports", desc: "Analyze expenditures" },
            ].map((c) => (
              <Link
                key={c.href}
                to={c.href}
                className="p-6 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition"
              >
                <h2 className="text-xl font-semibold">{c.title}</h2>
                <p className="text-slate-300 mt-2">{c.desc}</p>
              </Link>
            ))}
          </div>

          {/* Recent transactions */}
          <div className="mt-8 grid md:grid-cols-2 gap-6">
            <div className="p-6 bg-white/5 border border-white/10 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold">🧾 Recent Transactions</h3>
                <Link to="/expenses" className="text-sm text-slate-300 hover:text-white">See all →</Link>
              </div>
              {recent.length ? (
                <ul className="divide-y divide-white/10">
                  {recent.map((t) => (
                    <li key={t.id} className="py-3 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="font-medium">{t.description || "Expense"}</span>
                        <span className="text-slate-400 text-sm">
                          {t.category} • {new Date(t.date).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="font-medium">{nfmt(t.amount)}</div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-slate-400">No recent transactions.</div>
              )}
            </div>

            <div className="p-6 bg-white/5 border border-white/10 rounded-xl">
              <h3 className="text-lg font-semibold mb-2">🚀 Get More From Your Data</h3>
              <ul className="space-y-2 text-slate-300">
                <li>• Create budgets to set monthly limits</li>
                <li>• Tag expenses consistently for better breakdowns</li>
                <li>• Export reports for your accountant</li>
                <li>• Backup data in Settings</li>
              </ul>
            </div>
          </div>
        </>
      )}
    </main>
  );
}