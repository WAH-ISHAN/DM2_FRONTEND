"use client";
import { useEffect, useMemo, useState } from "react";

export default function SmallDash({ expenses: initialExpenses, currency: initialCurrency }) {
  const [expenses, setExpenses] = useState(initialExpenses || []);
  const [currency, setCurrency] = useState(initialCurrency || "Rs.");
  const [loading, setLoading] = useState(!initialExpenses);
  const [err, setErr] = useState(null);

  // Load currency from localStorage if not provided
  useEffect(() => {
    if (!initialCurrency) {
      const saved = localStorage.getItem("currency");
      if (saved) setCurrency(saved);
    }
  }, [initialCurrency]);

  // Fetch expenses if not passed as prop
  useEffect(() => {
    if (initialExpenses) return;
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/expenses", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load expenses");
        const data = await res.json();
        if (mounted) setExpenses(Array.isArray(data) ? data : []);
      } catch (e) {
        if (mounted) setErr(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [initialExpenses]);

  const nfmt = (n) => `${currency} ${Number(n || 0).toLocaleString()}`;

  const now = new Date();
  const monthLabel = now.toLocaleString("default", { month: "short", year: "numeric" });
  const ymNow = now.toISOString().slice(0, 7);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const today = now.getDate();

  // Build per-day totals for this month
  const { daily, maxDaily, monthlyTotal } = useMemo(() => {
    const d = Array.from({ length: daysInMonth }, () => 0);
    let sum = 0;
    for (const x of expenses) {
      if (!x || !x.date || typeof x.amount !== "number") continue;
      if (!String(x.date).startsWith(ymNow)) continue;
      const day = parseInt(String(x.date).slice(8, 10), 10);
      if (!Number.isFinite(day) || day < 1 || day > daysInMonth) continue;
      d[day - 1] += x.amount;
      sum += x.amount;
    }
    const mx = Math.max(1, ...d);
    return { daily: d, maxDaily: mx, monthlyTotal: sum };
  }, [expenses, ymNow, daysInMonth]);

  const avgPerDay = today ? monthlyTotal / today : 0;
  const projected = avgPerDay * daysInMonth;
  const daysTracked = daily.filter((v) => v > 0).length;

  // Top categories for this month
  const topCats = useMemo(() => {
    const map = new Map();
    for (const x of expenses) {
      if (!x || !x.date || !String(x.date).startsWith(ymNow)) continue;
      const key = x.category || "Other";
      map.set(key, (map.get(key) || 0) + Number(x.amount || 0));
    }
    return Array.from(map.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 4);
  }, [expenses, ymNow]);

  const sparkPoints = useMemo(() => {
    // Map [0..days-1] to 100x40 viewport
    return daily
      .map((v, i) => {
        const x = (i / Math.max(1, daysInMonth - 1)) * 100;
        const y = 40 - (v / maxDaily) * 34 - 2; // padding top/bottom
        return `${x},${y}`;
      })
      .join(" ");
  }, [daily, daysInMonth, maxDaily]);

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">Spending Trend</h3>
        <span className="text-sm text-slate-400">{monthLabel}</span>
      </div>

      {err && <div className="text-rose-300 text-sm mb-2">{err}</div>}

      {loading ? (
        <div className="h-24 rounded bg-white/10 animate-pulse" />
      ) : (
        <>
          <div className="h-24">
            <svg viewBox="0 0 100 40" className="w-full h-full">
              <polyline
                fill="none"
                stroke="#34d399"
                strokeWidth="2"
                points={sparkPoints}
              />
              <line x1="0" y1="38" x2="100" y2="38" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
            </svg>
          </div>

          {/* Stats */}
          <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
              <div className="text-slate-400">This Month</div>
              <div className="text-lg font-semibold mt-0.5">{nfmt(monthlyTotal)}</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
              <div className="text-slate-400">Avg / Day</div>
              <div className="text-lg font-semibold mt-0.5">{nfmt(avgPerDay)}</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
              <div className="text-slate-400">Projected</div>
              <div className="text-lg font-semibold mt-0.5">{nfmt(projected)}</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
              <div className="text-slate-400">Days tracked</div>
              <div className="text-lg font-semibold mt-0.5">{daysTracked}/{daysInMonth}</div>
            </div>
          </div>

          {/* Top categories */}
          <div className="mt-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Top Categories</div>
              <div className="text-xs text-slate-400">This month</div>
            </div>
            <div className="mt-2 space-y-2">
              {topCats.length === 0 ? (
                <div className="text-slate-400 text-sm">No category data yet.</div>
              ) : (
                topCats.map((c, i) => {
                  const colors = ["bg-emerald-500", "bg-blue-500", "bg-amber-500", "bg-fuchsia-500"];
                  const color = colors[i % colors.length];
                  const pct = monthlyTotal ? Math.round((c.amount / monthlyTotal) * 100) : 0;
                  return (
                    <div key={c.name}>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${color}`} />
                          <span className="text-slate-300">{c.name}</span>
                        </div>
                        <div className="text-slate-300">{nfmt(c.amount)} <span className="text-slate-400">({pct}%)</span></div>
                      </div>
                      <div className="mt-1.5 h-2 bg-white/10 rounded overflow-hidden">
                        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}