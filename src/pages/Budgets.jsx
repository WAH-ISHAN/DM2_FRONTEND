// src/pages/Budgets.jsx
import { useEffect, useMemo, useState } from "react";
import { api } from "../api";

function ProgressBar({ pct, color = "bg-emerald-500", showLabel = false }) {
  const safe = Math.max(0, Math.min(100, Number.isFinite(pct) ? pct : 0));
  return (
    <div className="w-full h-3 rounded-full overflow-hidden bg-white/10">
      <div
        aria-label="Budget usage"
        className={`${color} h-full transition-all duration-300`}
        style={{ width: `${safe}%` }}
      />
      {showLabel && (
        <div className="mt-1 text-xs text-slate-300">{safe}% used</div>
      )}
    </div>
  );
}

function RadialProgress({ pct, size = 112, track = "rgba(255,255,255,0.08)", color = "#22c55e" }) {
  const deg = Math.max(0, Math.min(100, pct)) * 3.6;
  return (
    <div
      className="relative"
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: `conic-gradient(${color} ${deg}deg, ${track} 0)`,
      }}
    >
      <div
        className="absolute inset-2 rounded-full"
        style={{ background: "rgba(0,0,0,0.35)" }}
      />
      <div className="absolute inset-0 flex items-center justify-center text-xl font-bold">
        {Math.round(Math.max(0, Math.min(100, pct)))}%
      </div>
    </div>
  );
}

function ConfirmDialog({ open, title, message, onCancel, onConfirm }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-slate-900 p-5">
        <h3 className="text-lg font-semibold mb-1">{title}</h3>
        <p className="text-slate-300 mb-4">{message}</p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="button bg-white/10">Cancel</button>
          <button onClick={onConfirm} className="button bg-red-600 hover:bg-red-500">Delete</button>
        </div>
      </div>
    </div>
  );
}

function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, 2500);
    return () => clearTimeout(t);
  }, [toast, onClose]);
  if (!toast) return null;
  const color =
    toast.type === "error"
      ? "bg-red-600"
      : toast.type === "success"
      ? "bg-emerald-600"
      : "bg-slate-700";
  return (
    <div className="fixed top-4 right-4 z-50">
      <div className={`rounded-lg px-4 py-2 text-white shadow-lg ${color}`}>
        {toast.msg}
      </div>
    </div>
  );
}

const CATEGORY_SUGGESTIONS = [
  "Food",
  "Transport",
  "Rent",
  "Utilities",
  "Entertainment",
  "Shopping",
  "Health",
  "Savings",
  "Travel",
  "Education",
  "Other",
];

function categoryIcon(cat) {
  const c = (cat || "").toLowerCase();
  if (c.includes("food") || c.includes("grocer")) return "🍔";
  if (c.includes("transport") || c.includes("taxi") || c.includes("ride")) return "🚌";
  if (c.includes("rent") || c.includes("home") || c.includes("house")) return "🏠";
  if (c.includes("util") || c.includes("bill") || c.includes("electric")) return "💡";
  if (c.includes("entertain") || c.includes("movie") || c.includes("music")) return "🎬";
  if (c.includes("shop") || c.includes("clothes")) return "🛍️";
  if (c.includes("health") || c.includes("medical")) return "🩺";
  if (c.includes("save")) return "🏦";
  if (c.includes("travel") || c.includes("flight")) return "✈️";
  if (c.includes("edu") || c.includes("study")) return "🎓";
  return "📁";
}

function statusMeta(pct) {
  if (pct < 70) {
    return {
      label: "Under",
      bar: "bg-emerald-500",
      dot: "bg-emerald-400",
      text: "text-emerald-300",
      ring: "ring-emerald-500/20",
      chip: "bg-emerald-500/15 text-emerald-300",
    };
  } else if (pct < 100) {
    return {
      label: "At risk",
      bar: "bg-amber-500",
      dot: "bg-amber-400",
      text: "text-amber-300",
      ring: "ring-amber-500/20",
      chip: "bg-amber-500/15 text-amber-300",
    };
  }
  return {
    label: "Over",
    bar: "bg-red-600",
    dot: "bg-red-500",
    text: "text-red-300",
    ring: "ring-red-500/20",
    chip: "bg-red-500/15 text-red-300",
  };
}

export default function Budgets() {
  const [list, setList] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ category: "Food", limit: 0, spent: 0 });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [currency, setCurrency] = useState("Rs.");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all | under | risk | over
  const [sort, setSort] = useState("pct-desc"); // name-asc | spent-desc | limit-desc | pct-desc | remaining-asc
  const [confirm, setConfirm] = useState({ open: false, id: null });
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem("currency");
    if (saved) setCurrency(saved);
  }, []);

  const loadBudgets = async () => {
    try {
      setLoading(true);
      setErr(null);
      const data = await api.getBudgets();
      setList(data || []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load budgets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBudgets();
  }, []);

  const summary = useMemo(() => {
    const totalLimit = list.reduce((s, b) => s + (b.limit || 0), 0);
    const totalSpent = list.reduce((s, b) => s + (b.spent || 0), 0);
    const remaining = totalLimit - totalSpent;
    const overallPct = totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : 0;
    return { totalLimit, totalSpent, remaining, overallPct };
  }, [list]);

  const viewList = useMemo(() => {
    const q = search.trim().toLowerCase();
    let arr = list.map((b) => {
      const spent = Number(b.spent || 0);
      const limit = Math.max(0, Number(b.limit || 0));
      const pct = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : spent > 0 ? 100 : 0;
      const remaining = limit - spent;
      const meta = statusMeta(pct);
      return { ...b, pct, remaining, _meta: meta };
    });

    if (q) arr = arr.filter((b) => b.category?.toLowerCase().includes(q));

    if (statusFilter !== "all") {
      arr = arr.filter((b) => {
        if (statusFilter === "under") return b.pct < 70;
        if (statusFilter === "risk") return b.pct >= 70 && b.pct < 100;
        if (statusFilter === "over") return b.pct >= 100;
        return true;
      });
    }

    arr.sort((a, b) => {
      switch (sort) {
        case "name-asc":
          return (a.category || "").localeCompare(b.category || "");
        case "spent-desc":
          return (b.spent || 0) - (a.spent || 0);
        case "limit-desc":
          return (b.limit || 0) - (a.limit || 0);
        case "remaining-asc":
          return (a.remaining || 0) - (b.remaining || 0);
        case "pct-desc":
        default:
          return b.pct - a.pct;
      }
    });

    return arr;
  }, [list, search, statusFilter, sort]);

  function resetForm() {
    setForm({ category: "Food", limit: 0, spent: 0 });
    setEditingId(null);
    setFormOpen(false);
  }

  async function submitBudget(e) {
    e.preventDefault();
    if (!form.category?.trim()) return setToast({ type: "error", msg: "Category is required" });
    const limit = Math.max(0, Number(form.limit || 0));
    const spent = Math.max(0, Number(form.spent || 0));
    try {
      setErr(null);
      if (editingId !== null) {
        const updated = await api.updateBudget(editingId, {
          category: form.category.trim(),
          limit,
          spent,
        });
        setList((prev) => prev.map((x) => (x.id === editingId ? updated : x)));
        setToast({ type: "success", msg: "Budget updated" });
        resetForm();
      } else {
        const created = await api.createBudget(form.category.trim(), limit);
        // If API supports creating with spent, adjust above accordingly. If not, optionally update here if spent > 0.
        if (spent > 0 && created?.id) {
          const updated = await api.updateBudget(created.id, { spent });
          setList((prev) => [...prev, updated]);
        } else {
          await loadBudgets();
        }
        setToast({ type: "success", msg: "Budget added" });
        resetForm();
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
      setToast({ type: "error", msg: "Save failed" });
    }
  }

  async function adjustSpent(id, delta) {
    const b = list.find((x) => x.id === id);
    if (!b) return;
    const next = Math.max(0, (Number(b.spent) || 0) + delta);
    try {
      const updated = await api.updateBudget(id, { spent: next });
      setList((prev) => prev.map((x) => (x.id === id ? updated : x)));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Update failed");
      setToast({ type: "error", msg: "Update failed" });
    }
  }

  async function setSpentExact(id, value) {
    const b = list.find((x) => x.id === id);
    if (!b) return;
    const next = Math.max(0, Number(value || 0));
    if (next === b.spent) return;
    try {
      const updated = await api.updateBudget(id, { spent: next });
      setList((prev) => prev.map((x) => (x.id === id ? updated : x)));
      setToast({ type: "success", msg: "Spent updated" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Update failed");
      setToast({ type: "error", msg: "Update failed" });
    }
  }

  async function removeBudget(id) {
    try {
      await api.deleteBudget(id);
      setList((prev) => prev.filter((x) => x.id !== id));
      setToast({ type: "success", msg: "Budget removed" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Delete failed");
      setToast({ type: "error", msg: "Delete failed" });
    }
  }

  const onEdit = (b) => {
    setForm({
      category: b.category || "Food",
      limit: Number(b.limit || 0),
      spent: Number(b.spent || 0),
    });
    setEditingId(b.id);
    setFormOpen(true);
  };

  const currencyOptions = ["Rs.", "$", "€", "£", "₹", "₱", "₦"];

  return (
    <main className="container mx-auto px-6 py-12 text-white">
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between mb-6">
        <h1 className="text-3xl font-bold">🎯 Budgets</h1>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-300">Currency</label>
          <select
            value={currency}
            onChange={(e) => {
              setCurrency(e.target.value);
              localStorage.setItem("currency", e.target.value);
            }}
            className="input bg-white/10"
          >
            {currencyOptions.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <button
            className="button bg-blue-600 hover:bg-blue-500"
            onClick={() => {
              setFormOpen((s) => !s);
              if (editingId !== null) setEditingId(null);
            }}
          >
            {formOpen ? "Close" : "Add Budget"}
          </button>
        </div>
      </div>

      {err && <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-red-200">{err}</div>}

      {!loading && (
        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <div className="p-4 rounded-xl border border-white/10 bg-white/5">
            <div className="text-slate-400 text-sm">Total Limit</div>
            <div className="text-2xl font-semibold">
              {currency} {summary.totalLimit.toLocaleString()}
            </div>
          </div>
          <div className="p-4 rounded-xl border border-white/10 bg-white/5">
            <div className="text-slate-400 text-sm">Total Spent</div>
            <div className="text-2xl font-semibold">
              {currency} {summary.totalSpent.toLocaleString()}
            </div>
          </div>
          <div className="p-4 rounded-xl border border-white/10 bg-white/5">
            <div className="text-slate-400 text-sm">Remaining</div>
            <div className={`text-2xl font-semibold ${summary.remaining >= 0 ? "text-emerald-300" : "text-red-300"}`}>
              {currency} {summary.remaining.toLocaleString()}
            </div>
          </div>
          <div className="p-4 rounded-xl border border-white/10 bg-white/5 flex items-center justify-between">
            <div>
              <div className="text-slate-400 text-sm mb-1">Overall Usage</div>
              <div className="text-2xl font-bold">{summary.overallPct}%</div>
            </div>
            <RadialProgress
              pct={summary.overallPct}
              color={summary.overallPct < 70 ? "#22c55e" : summary.overallPct < 100 ? "#f59e0b" : "#dc2626"}
            />
          </div>
        </div>
      )}

      {formOpen && (
        <form onSubmit={submitBudget} className="mb-6 p-4 rounded-xl border border-white/10 bg-white/5">
          <div className="grid md:grid-cols-4 gap-3">
            <input
              type="text"
              placeholder="Category (e.g., Food)"
              className="input"
              value={form.category || ""}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              required
            />
            <input
              type="number"
              placeholder="Limit"
              min={0}
              className="input"
              value={form.limit ?? 0}
              onChange={(e) => setForm((f) => ({ ...f, limit: Number(e.target.value) }))}
              required
            />
            <input
              type="number"
              placeholder="Spent (optional)"
              min={0}
              className="input"
              value={form.spent ?? 0}
              onChange={(e) => setForm((f) => ({ ...f, spent: Number(e.target.value) }))}
            />
            <div className="flex gap-2">
              <button className="button flex-1 bg-blue-600 hover:bg-blue-500">
                {editingId !== null ? "Update" : "Add"} Budget
              </button>
              <button type="button" onClick={resetForm} className="button bg-white/10">
                {editingId !== null ? "Cancel" : "Clear"}
              </button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {CATEGORY_SUGGESTIONS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setForm((f) => ({ ...f, category: c }))}
                className={`px-3 py-1 rounded-full text-xs border border-white/10 hover:border-white/20 ${
                  form.category === c ? "bg-white/10" : "bg-transparent"
                }`}
              >
                {categoryIcon(c)} {c}
              </button>
            ))}
          </div>
        </form>
      )}

      <div className="mb-4 flex flex-col md:flex-row gap-3 md:items-center">
        <div className="flex-1">
          <input
            className="input w-full"
            placeholder="Search category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-white/5 rounded-lg p-1">
            {[
              { key: "all", label: "All" },
              { key: "under", label: "Under" },
              { key: "risk", label: "At risk" },
              { key: "over", label: "Over" },
            ].map((t) => (
              <button
                key={t.key}
                className={`px-3 py-1 rounded-md text-sm ${
                  statusFilter === t.key ? "bg-white/10" : "text-slate-300"
                }`}
                onClick={() => setStatusFilter(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <select
            className="input"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            title="Sort by"
          >
            <option value="pct-desc">Usage % (high → low)</option>
            <option value="spent-desc">Spent (high → low)</option>
            <option value="limit-desc">Limit (high → low)</option>
            <option value="remaining-asc">Remaining (low → high)</option>
            <option value="name-asc">Name (A → Z)</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-xl border border-white/10 p-4 bg-white/5 animate-pulse">
              <div className="h-5 w-1/3 bg-white/10 rounded mb-3" />
              <div className="h-3 w-full bg-white/10 rounded" />
              <div className="mt-3 h-4 w-1/2 bg-white/10 rounded" />
            </div>
          ))}
        </div>
      ) : viewList.length === 0 ? (
        <div className="p-8 rounded-xl border border-white/10 bg-white/5 text-center text-slate-300">
          <div className="text-3xl mb-2">🗂️</div>
          No budgets found. Try changing filters or add a new budget.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {viewList.map((b) => {
            const pct = b.pct;
            const meta = b._meta;
            const color = meta.bar;
            const remaining = b.remaining;
            return (
              <div
                key={b.id}
                className={`rounded-xl border border-white/10 p-4 bg-white/5 hover:bg-white/[0.07] transition ${meta.ring}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="text-xl">{categoryIcon(b.category)}</div>
                    <div>
                      <h3 className="font-semibold">{b.category}</h3>
                      <div className="text-xs text-slate-400">
                        {currency} {Number(b.spent || 0).toLocaleString()} / {currency}{" "}
                        {Number(b.limit || 0).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className={`px-2 py-0.5 rounded-full text-xs ${meta.chip} flex items-center gap-1`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                    {meta.label}
                  </div>
                </div>

                <ProgressBar pct={pct} color={color} />

                <div className="mt-2 flex items-center justify-between text-sm">
                  <div className="text-slate-300">
                    Used: <span className={meta.text}>{pct}%</span>
                  </div>
                  <div className={`${remaining >= 0 ? "text-emerald-300" : "text-red-300"} font-medium`}>
                    {remaining >= 0 ? "Remaining" : "Over by"}: {currency} {Math.abs(remaining).toLocaleString()}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <div className="flex gap-1">
                    <button className="button bg-white/10 text-xs" onClick={() => adjustSpent(b.id, 100)}>+100</button>
                    <button className="button bg-white/10 text-xs" onClick={() => adjustSpent(b.id, 500)}>+500</button>
                    <button className="button bg-white/10 text-xs" onClick={() => adjustSpent(b.id, -100)}>-100</button>
                    <button className="button bg-white/10 text-xs" onClick={() => adjustSpent(b.id, -500)}>-500</button>
                  </div>

                  <div className="flex items-center gap-1 ml-auto">
                    <span className="text-xs text-slate-400">Spent</span>
                    <input
                      type="number"
                      min={0}
                      defaultValue={Number(b.spent || 0)}
                      onBlur={(e) => setSpentExact(b.id, e.target.value)}
                      className="w-28 input"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button className="button bg-white/10 text-xs" onClick={() => onEdit(b)}>Edit</button>
                    <button
                      className="button bg-red-600/80 hover:bg-red-600 text-xs"
                      onClick={() => setConfirm({ open: true, id: b.id })}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={confirm.open}
        title="Remove budget?"
        message="This action cannot be undone."
        onCancel={() => setConfirm({ open: false, id: null })}
        onConfirm={() => {
          const id = confirm.id;
          setConfirm({ open: false, id: null });
          if (id != null) removeBudget(id);
        }}
      />
    </main>
  );
}