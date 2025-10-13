import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import type { Saving } from "../types";
import { ProgressBar } from "../components/Progress";

type SortKey = "name" | "target" | "current" | "remaining" | "progress";
type SortDir = "asc" | "desc";

export default function SavingsPage() {
  // State
  const [currency, setCurrency] = useState("Rs.");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [goals, setGoals] = useState<Saving[]>([]);

  // Form state
  const [form, setForm] = useState<Partial<Saving>>({ name: "", target: 0, current: 0 });
  const [editId, setEditId] = useState<number | null>(null);

  // Quick contribution state per goal
  const [entry, setEntry] = useState<{ id: number; amount: number }>({ id: 0, amount: 0 });

  // UI controls
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"All" | "Active" | "Completed">("All");
  const [sortKey, setSortKey] = useState<SortKey>("progress");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [incPreset, setIncPreset] = useState(1000); // quick top-up default

  // Load settings
  useEffect(() => {
    const saved = localStorage.getItem("currency");
    if (saved) setCurrency(saved);
  }, []);

  // Load data
  const load = async () => {
    try {
      setLoading(true);
      const list = await api.getSavings(); // expects Saving[]
      setGoals(list || []);
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load savings");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  // Helpers
  const nfmt = (n: number | string) =>
    `${currency} ${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  const resetForm = () => {
    setForm({ name: "", target: 0, current: 0 });
    setEditId(null);
  };

  // Derived summary
  const summary = useMemo(() => {
    const totalCurrent = goals.reduce((s, g) => s + (g.current || 0), 0);
    const totalTarget = goals.reduce((s, g) => s + (g.target || 0), 0);
    const overallPct = totalTarget ? Math.round((totalCurrent / totalTarget) * 100) : 0;
    const completed = goals.filter((g) => (g.current || 0) >= (g.target || 0)).length;
    const avgProgress =
      goals.length > 0
        ? Math.round(
            goals.reduce((s, g) => s + Math.min(100, Math.round(((g.current || 0) / Math.max(1, g.target || 0)) * 100)), 0) /
              goals.length
          )
        : 0;
    const largest =
      goals.length > 0
        ? goals.reduce((max, g) => ((g.target || 0) > (max.target || 0) ? g : max), goals[0])
        : null;
    return { totalCurrent, totalTarget, overallPct, completed, avgProgress, largest };
  }, [goals]);

  // Filters + sorting
  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return goals.filter((g) => {
      const okQ = !ql || g.name.toLowerCase().includes(ql);
      const done = (g.current || 0) >= (g.target || 0);
      const okStatus =
        status === "All" ? true : status === "Completed" ? done : !done;
      return okQ && okStatus;
    });
  }, [goals, q, status]);

  const sorted = useMemo(() => {
    const arr = filtered.slice();
    arr.sort((a, b) => {
      const progA = Math.min(100, ((a.current || 0) / Math.max(1, a.target || 0)) * 100);
      const progB = Math.min(100, ((b.current || 0) / Math.max(1, b.target || 0)) * 100);
      const remainingA = Math.max(0, (a.target || 0) - (a.current || 0));
      const remainingB = Math.max(0, (b.target || 0) - (b.current || 0));

      let va: number | string = 0;
      let vb: number | string = 0;
      switch (sortKey) {
        case "name":
          va = a.name.toLowerCase();
          vb = b.name.toLowerCase();
          break;
        case "target":
          va = a.target || 0;
          vb = b.target || 0;
          break;
        case "current":
          va = a.current || 0;
          vb = b.current || 0;
          break;
        case "remaining":
          va = remainingA;
          vb = remainingB;
          break;
        case "progress":
        default:
          va = progA;
          vb = progB;
      }
      if (typeof va === "string" && typeof vb === "string") {
        return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      const diff = Number(va) - Number(vb);
      return sortDir === "asc" ? diff : -diff;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  // Actions
  async function submitGoal(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    const name = (form.name || "").trim();
    const target = Number(form.target || 0);
    const current = Number(form.current || 0);

    if (!name) return setErr("Please enter a goal name");
    if (target <= 0) return setErr("Target must be greater than 0");
    if (current < 0) return setErr("Current cannot be negative");
    if (current > target) return setErr("Current cannot exceed target");

    try {
      if (editId != null) {
        const updated = await api.updateSaving(editId, { name, target, current });
        setGoals((prev) => prev.map((x) => (x.id === editId ? updated : x)));
      } else {
        const created = await api.createSaving({ name, target, current });
        setGoals((prev) => [created, ...prev]);
      }
      resetForm();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    }
  }

  async function deleteGoal(id: number) {
    if (!confirm("Delete this goal?")) return;
    try {
      await api.deleteSaving(id);
      setGoals((prev) => prev.filter((x) => x.id !== id));
      if (editId === id) resetForm();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Delete failed");
    }
  }

  async function contribute(id: number, amount: number) {
    if (amount <= 0) return;
    const g = goals.find((x) => x.id === id);
    if (!g) return;
    const updatedVal = Math.min(g.target, (g.current || 0) + amount);
    try {
      const updated = await api.updateSaving(id, { current: updatedVal });
      setGoals((prev) => prev.map((x) => (x.id === id ? updated : x)));
      setEntry({ id: 0, amount: 0 });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Update failed");
    }
  }

  // Export
  const exportCSV = () => {
    const header = "id,name,current,target,remaining,progress";
    const lines = sorted.map((g) => {
      const remaining = Math.max(0, (g.target || 0) - (g.current || 0));
      const prog = Math.min(100, Math.round(((g.current || 0) / Math.max(1, g.target || 0)) * 100));
      return [g.id, `"${g.name.replace(/"/g, '""')}"`, g.current || 0, g.target || 0, remaining, prog].join(",");
    });
    const blob = new Blob([header + "\n" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "savings_goals.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  // Ring helper
  const ringStyle = (pct: number, color = "#22d3ee") => ({
    background: `conic-gradient(${color} ${pct * 3.6}deg, rgba(255,255,255,0.08) 0deg)`,
  });

  return (
    <main className="container mx-auto px-6 py-12 text-white">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">🏦 Savings Goals</h1>
        <div className="flex items-center gap-2">
          <button className="button" onClick={exportCSV}>Export CSV</button>
          <select
            className="select"
            value={incPreset}
            onChange={(e) => setIncPreset(Number(e.target.value))}
            title="Quick add preset"
          >
            {[500, 1000, 5000, 10000].map((v) => (
              <option key={v} value={v}>+{v.toLocaleString()}</option>
            ))}
          </select>
        </div>
      </div>

      {err && <div className="mb-4 rounded-lg border border-rose-600/30 bg-rose-500/10 p-3 text-rose-200">{err}</div>}

      {!loading && (
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 rounded-xl border border-white/10 bg-white/5">
            <div className="text-slate-300 text-sm">Total Saved</div>
            <div className="text-2xl font-semibold mt-1">{nfmt(summary.totalCurrent)}</div>
          </div>
          <div className="p-4 rounded-xl border border-white/10 bg-white/5">
            <div className="text-slate-300 text-sm">Total Target</div>
            <div className="text-2xl font-semibold mt-1">{nfmt(summary.totalTarget)}</div>
          </div>
          <div className="p-4 rounded-xl border border-white/10 bg-white/5">
            <div className="text-slate-300 text-sm">Completed Goals</div>
            <div className="text-2xl font-semibold mt-1">{summary.completed}</div>
          </div>
          <div className="p-4 rounded-xl border border-white/10 bg-white/5">
            <div className="text-slate-300 text-sm">Avg Progress</div>
            <div className="text-2xl font-semibold mt-1">{summary.avgProgress}%</div>
          </div>
        </div>
      )}

      {!loading && (
        <div className="card p-5 mb-6 rounded-xl border border-white/10 bg-white/5">
          <h2 className="text-xl font-semibold mb-2">Overall Progress</h2>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-slate-300">
                Saved: {nfmt(summary.totalCurrent)} / Target: {nfmt(summary.totalTarget)}
              </p>
            </div>
            <div className="text-2xl font-bold">{summary.overallPct}%</div>
          </div>
          <div className="mt-2">
            <ProgressBar pct={summary.overallPct} color="from-cyan-500 to-blue-500" />
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card p-4 mb-6 rounded-xl border border-white/10 bg-white/5 grid md:grid-cols-4 gap-3">
        <input
          className="input"
          placeholder="Search goals…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select className="select" value={status} onChange={(e) => setStatus(e.target.value as any)}>
          <option>All</option>
          <option>Active</option>
          <option>Completed</option>
        </select>
        <select
          className="select"
          value={`${sortKey}:${sortDir}`}
          onChange={(e) => {
            const [k, d] = e.target.value.split(":") as [SortKey, SortDir];
            setSortKey(k); setSortDir(d);
          }}
        >
          <option value="progress:desc">Sort: Progress (high→low)</option>
          <option value="progress:asc">Sort: Progress (low→high)</option>
          <option value="remaining:asc">Sort: Remaining (low→high)</option>
          <option value="remaining:desc">Sort: Remaining (high→low)</option>
          <option value="target:desc">Sort: Target (high→low)</option>
          <option value="target:asc">Sort: Target (low→high)</option>
          <option value="name:asc">Sort: Name (A→Z)</option>
          <option value="name:desc">Sort: Name (Z→A)</option>
        </select>
        <div className="hidden md:flex items-center text-sm text-slate-400">
          {sorted.length} of {goals.length} goals
        </div>
      </div>

      {/* Form */}
      <form onSubmit={submitGoal} className="card p-4 grid md:grid-cols-4 gap-3 mb-6 text-sm rounded-xl border border-white/10 bg-white/5">
        <input
          type="text"
          placeholder="Goal name"
          className="input"
          value={form.name || ""}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          required
        />
        <input
          type="number"
          placeholder="Target"
          min={0}
          className="input"
          value={form.target ?? 0}
          onChange={(e) => setForm((f) => ({ ...f, target: Number(e.target.value) }))}
          required
        />
        <input
          type="number"
          placeholder="Current (optional)"
          min={0}
          className="input"
          value={form.current ?? 0}
          onChange={(e) => setForm((f) => ({ ...f, current: Number(e.target.value) }))}
        />
        <div className="flex gap-2">
          <button type="submit" className="button flex-1 bg-blue-600 hover:bg-blue-500">
            {editId !== null ? "Update" : "Add"} Goal
          </button>
          {editId !== null && (
            <button type="button" onClick={resetForm} className="button">
              Cancel
            </button>
          )}
        </div>
      </form>

      {loading ? (
        <div className="space-y-3">
          <div className="skeleton h-28" />
          <div className="skeleton h-28" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="card p-6 text-slate-300 rounded-xl border border-white/10 bg-white/5">
          No goals yet. Add your first one above ✨
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map((g) => {
            const pct = Math.min(100, Math.round(((g.current || 0) / Math.max(1, g.target || 0)) * 100));
            const remaining = Math.max(0, (g.target || 0) - (g.current || 0));
            const complete = pct >= 100;
            return (
              <div key={g.id} className="card p-4 rounded-xl border border-white/10 bg-white/5">
                <div className="flex items-start gap-4">
                  {/* Progress ring */}
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full" style={ringStyle(pct, complete ? "#22c55e" : "#06b6d4")} />
                    <div className="absolute inset-0 m-2 rounded-full bg-slate-900/80 flex items-center justify-center text-sm">
                      {pct}%
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{g.name}</h3>
                      {complete && (
                        <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-300">
                          Completed
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-slate-300 mt-1">
                      {nfmt(g.current || 0)} / {nfmt(g.target || 0)}
                      {remaining > 0 && <span className="text-slate-400"> • Remaining: {nfmt(remaining)}</span>}
                    </div>
                  </div>
                </div>

                <div className="mt-3">
                  <ProgressBar pct={pct} color={complete ? "from-emerald-500 to-green-500" : "from-cyan-500 via-sky-500 to-blue-500"} />
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <div className="flex gap-1">
                    <button type="button" className="button text-xs" onClick={() => contribute(g.id, incPreset)}>
                      +{incPreset.toLocaleString()}
                    </button>
                    <button type="button" className="button text-xs" onClick={() => contribute(g.id, incPreset * 5)}>
                      +{(incPreset * 5).toLocaleString()}
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      placeholder="Custom"
                      className="w-24 input py-1 text-xs"
                      value={entry.id === g.id ? entry.amount : ""}
                      onChange={(e) =>
                        setEntry({ id: g.id, amount: Number(e.target.value) || 0 })
                      }
                    />
                    <button
                      type="button"
                      className="button bg-emerald-600 hover:bg-emerald-500 text-xs"
                      onClick={() => contribute(g.id, entry.id === g.id ? entry.amount : 0)}
                    >
                      Add
                    </button>
                  </div>

                  <div className="ml-auto flex gap-2">
                    {!complete && (
                      <button
                        type="button"
                        className="button text-xs"
                        onClick={() =>
                          contribute(g.id, Math.max(0, (g.target || 0) - (g.current || 0)))
                        }
                        title="Fill to target"
                      >
                        Fill
                      </button>
                    )}
                    <button
                      type="button"
                      className="button text-xs"
                      onClick={() => {
                        setForm(g);
                        setEditId(g.id);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="button bg-red-600/80 hover:bg-red-600 text-xs"
                      onClick={() => deleteGoal(g.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}