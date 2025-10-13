import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { StatCard } from "../Components/StatCard";
import SmallDash from "../Components/SmallDash";

export default function Dashboard() {
  // Fix no-undef errors: define state variables
  const [currency, setCurrency] = useState("Rs.");
  const [stats, setStats] = useState({
    total: 0,
    monthly: 0,
    prevMonthly: null,
    categories: [],
    budgets: [],
    recent: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Example: simulate fetching data
  useEffect(() => {
    // Replace this with real API call
    setTimeout(() => {
      setStats({
        total: 5000,
        monthly: 1200,
        prevMonthly: 1000,
        categories: [
          { name: "Food", amount: 400 },
          { name: "Transport", amount: 200 },
          { name: "Shopping", amount: 300 },
        ],
        budgets: [
          { name: "Food", spent: 400, limit: 350 },
          { name: "Transport", spent: 200, limit: 300 },
          { name: "Shopping", spent: 300, limit: 500 },
        ],
        recent: [
          { id: 1, title: "Lunch", amount: 200, category: "Food", date: "2025-10-10" },
          { id: 2, title: "Bus Ticket", amount: 50, category: "Transport", date: "2025-10-09" },
        ],
      });
      setLoading(false);
    }, 1000);
  }, []);

  // Derived values (safe fallbacks)
  const safeCurrency = currency ?? "₹";
  const total = Number(stats?.total ?? 0);
  const monthly = Number(stats?.monthly ?? 0);
  const prevMonthly = typeof stats?.prevMonthly === "number" ? stats.prevMonthly : null;

  const monthLabel = new Date().toLocaleString("default", { month: "short", year: "numeric" });
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const today = now.getDate();

  const avgPerDay = today ? monthly / today : 0;
  const projected = avgPerDay * daysInMonth;
  const momChange = prevMonthly && prevMonthly > 0 ? ((monthly - prevMonthly) / prevMonthly) * 100 : null;

  const categories = Array.isArray(stats?.categories) ? stats.categories : [];
  const topCategories = categories
    .slice()
    .sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0))
    .slice(0, 5);

  const budgets = Array.isArray(stats?.budgets) ? stats.budgets : [];
  const recent = Array.isArray(stats?.recent) ? stats.recent.slice(0, 6) : [];

  const overspentBudgets = budgets.filter((b) => Number(b?.spent ?? 0) > Number(b?.limit ?? 0));

  const insightText = (() => {
    if (momChange != null && momChange > 10)
      return "This month is trending higher than last month. Trim top categories.";
    if (momChange != null && momChange < -10)
      return "Great! You're spending less than last month. Keep it up.";
    if (projected && monthly && projected > monthly * 1.3)
      return "Spending is accelerating — set a budget alert.";
    return "Track frequent categories to cut overspending faster.";
  })();

  const nfmt = (n, opts) =>
    `${safeCurrency} ${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0, ...opts })}`;

  const pct = (n, d) => {
    if (!d || d === 0) return 0;
    return Math.min(100, Math.max(0, Math.round((n / d) * 100)));
  };

  return (
    <main className="container mx-auto px-6 py-12 text-white">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold">Personal Finance Dashboard</h1>
          <p className="text-slate-400 mt-1">Snapshot of your spending</p>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Link
            to="/expenses?add=1"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/90 text-slate-900 px-4 py-2 font-medium hover:bg-emerald-400 transition"
          >
            ➕ Add Expense
          </Link>
          <Link
            to="/settings?tab=import"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700/70 px-4 py-2 hover:bg-slate-800/50 transition"
          >
            📥 Import CSV
          </Link>
        </div>
      </header>

      {error && <p className="text-red-400 mb-4">{error}</p>}

      {loading && !error && (
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="card p-6 h-28 animate-pulse bg-slate-800/40 border border-slate-700/40 rounded-xl" />
          <div className="card p-6 h-28 animate-pulse bg-slate-800/40 border border-slate-700/40 rounded-xl" />
          <div className="card p-6 h-28 animate-pulse bg-slate-800/40 border border-slate-700/40 rounded-xl" />
          <div className="card p-6 h-28 animate-pulse bg-slate-800/40 border border-slate-700/40 rounded-xl" />
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Key stats */}
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <StatCard
              icon="💸"
              label="Total Expenses"
              value={`${safeCurrency} ${total.toLocaleString()}`}
              gradient="from-emerald-500/20 to-emerald-500/0"
            />
            <StatCard
              icon="📆"
              label={`This Month (${monthLabel})`}
              value={`${safeCurrency} ${monthly.toLocaleString()}`}
              gradient="from-blue-500/20 to-blue-500/0"
            />
            <StatCard
              icon="🗓️"
              label="Avg / Day"
              value={nfmt(avgPerDay, { maximumFractionDigits: 0 })}
              gradient="from-amber-500/20 to-amber-500/0"
            />
            <StatCard
              icon="🔮"
              label="Projected Month-End"
              value={nfmt(projected)}
              gradient="from-fuchsia-500/20 to-fuchsia-500/0"
            />
          </div>

          {/* Insight + MoM */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="card p-6 rounded-xl border border-slate-700/60 bg-slate-800/40">
              <div className="text-slate-300 text-sm">Quick Insight</div>
              <div className="text-lg mt-1">{insightText}</div>
              {momChange != null && (
                <div
                  className={`inline-flex mt-3 px-2.5 py-1 rounded-full text-xs font-medium ${
                    momChange >= 0 ? "bg-rose-500/20 text-rose-300" : "bg-emerald-500/20 text-emerald-300"
                  }`}
                >
                  MoM {momChange >= 0 ? "▲" : "▼"} {Math.abs(momChange).toFixed(1)}%
                </div>
              )}
            </div>

            <div className="card p-6 rounded-xl border border-slate-700/60 bg-slate-800/40">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">Category Breakdown</h3>
                <Link to="/reports" className="text-sm text-slate-300 hover:text-white">
                  View all →
                </Link>
              </div>
              <div className="mt-4 space-y-4">
                {topCategories.length > 0 ? (
                  topCategories.map((c, idx) => {
                    const colorClasses = ["bg-emerald-500", "bg-blue-500", "bg-amber-500", "bg-fuchsia-500", "bg-violet-500"];
                    const color = colorClasses[idx % colorClasses.length];
                    const amount = Number(c?.amount ?? 0);
                    const p = pct(amount, monthly || total || 1);
                    return (
                      <div key={c?.name ?? idx}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${color}`} />
                            <span className="text-slate-300">{c?.name ?? "Category"}</span>
                          </div>
                          <span className="font-medium">{nfmt(amount)}</span>
                        </div>
                        <div className="mt-2 h-2 bg-slate-700/60 rounded overflow-hidden">
                          <div className={`h-full ${color}`} style={{ width: `${p}%` }} />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-slate-400">No category data yet.</div>
                )}
              </div>
            </div>

            <div className="card p-6 rounded-xl border border-slate-700/60 bg-slate-800/40">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">Budgets Overview</h3>
                <Link to="/budgets" className="text-sm text-slate-300 hover:text-white">
                  Manage →
                </Link>
              </div>
              <div className="mt-4 space-y-4">
                {budgets.length > 0 ? (
                  budgets.slice(0, 4).map((b, idx) => {
                    const spent = Number(b?.spent ?? 0);
                    const limit = Number(b?.limit ?? 0) || 1;
                    const p = Math.min(100, Math.round((spent / limit) * 100));
                    const over = spent > limit;
                    return (
                      <div key={b?.name ?? idx}>
                        <div className="flex items-center justify-between">
                          <div className="text-slate-300">{b?.name ?? "Budget"}</div>
                          <div className={`text-sm ${over ? "text-rose-300" : "text-slate-300"}`}>
                            {nfmt(spent)} / {nfmt(limit)}
                          </div>
                        </div>
                        <div className="mt-2 h-2 bg-slate-700/60 rounded overflow-hidden">
                          <div
                            className={`h-full ${over ? "bg-rose-500" : "bg-emerald-500"}`}
                            style={{ width: `${p}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-slate-400">No budgets yet. Create one to track monthly limits.</div>
                )}
              </div>
            </div>
          </div>

          {/* Mini chart / small dashboard */}
          <section className="my-8">
            <div className="card p-6 rounded-xl border border-slate-700/60 bg-slate-800/40">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold">Spending Trend</h3>
                <div className="text-sm text-slate-300">{monthLabel}</div>
              </div>
              <SmallDash />
            </div>
          </section>

          {/* Navigation shortcuts */}
          <div className="grid md:grid-cols-3 gap-6">
            <Link
              to="/expenses"
              className="card p-6 hover:-translate-y-0.5 transition rounded-xl border border-slate-700/60 bg-slate-800/40"
            >
              <h2 className="text-xl font-semibold">📈 Expenses</h2>
              <p className="text-slate-300 mt-2">View & manage expenses</p>
            </Link>
            <Link
              to="/budgets"
              className="card p-6 hover:-translate-y-0.5 transition rounded-xl border border-slate-700/60 bg-slate-800/40"
            >
              <h2 className="text-xl font-semibold">🎯 Budgets</h2>
              <p className="text-slate-300 mt-2">Create & monitor budgets</p>
            </Link>
            <Link
              to="/savings"
              className="card p-6 hover:-translate-y-0.5 transition rounded-xl border border-slate-700/60 bg-slate-800/40"
            >
              <h2 className="text-xl font-semibold">🏦 Savings</h2>
              <p className="text-slate-300 mt-2">Track your goals</p>
            </Link>
          </div>

          {/* Recent + Alerts */}
          <div className="mt-8 grid md:grid-cols-2 gap-6">
            <div className="card p-6 rounded-xl border border-slate-700/60 bg-slate-800/40">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-semibold">🧾 Recent Transactions</h2>
                <Link to="/expenses" className="text-sm text-slate-300 hover:text-white">
                  See all →
                </Link>
              </div>
              {recent.length > 0 ? (
                <ul className="divide-y divide-slate-700/50">
                  {recent.map((t, idx) => (
                    <li key={t?.id ?? idx} className="py-3 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="font-medium">{t?.merchant ?? t?.title ?? "Expense"}</span>
                        <span className="text-slate-400 text-sm">
                          {t?.category ?? "General"} •{" "}
                          {t?.date ? new Date(t.date).toLocaleDateString() : "—"}
                        </span>
                      </div>
                      <div className="font-medium">{nfmt(t?.amount ?? 0)}</div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-400">No recent transactions.</p>
              )}
            </div>

            <div className="card p-6 rounded-xl border border-slate-700/60 bg-slate-800/40">
              <h2 className="text-xl font-semibold mb-2">🚨 Alerts</h2>
              <div className="space-y-3">
                {momChange != null && momChange > 10 && (
                  <div className="rounded-lg border border-rose-600/30 bg-rose-500/10 px-4 py-3 text-rose-200">
                    Spending is up {momChange.toFixed(1)}% vs last month.
                  </div>
                )}
                {overspentBudgets.map((b, idx) => (
                  <div
                    key={b?.name ?? idx}
                    className="rounded-lg border border-rose-600/30 bg-rose-500/10 px-4 py-3 text-rose-200"
                  >
                    Budget overspent: {b?.name} — {nfmt(b?.spent)} / {nfmt(b?.limit)}
                  </div>
                ))}
                {!overspentBudgets.length && !(momChange != null && momChange > 10) && (
                  <div className="text-slate-400">No alerts right now.</div>
                )}
              </div>
            </div>
          </div>

          {/* Reports & Settings */}
          <div className="mt-8 grid md:grid-cols-2 gap-6">
            <Link
              to="/reports"
              className="card p-6 hover:-translate-y-0.5 transition rounded-xl border border-slate-700/60 bg-slate-800/40"
            >
              <h2 className="text-xl font-semibold">📊 Reports</h2>
              <p className="text-slate-300 mt-2">Analyze expenditures</p>
            </Link>
            <Link
              to="/settings"
              className="card p-6 hover:-translate-y-0.5 transition rounded-xl border border-slate-700/60 bg-slate-800/40"
            >
              <h2 className="text-xl font-semibold">⚙️ Settings</h2>
              <p className="text-slate-300 mt-2">Backup & preferences</p>
            </Link>
          </div>
        </>
      )}
    </main>
  );
}
