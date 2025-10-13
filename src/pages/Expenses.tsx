import { useEffect, useMemo, useState, useCallback } from "react";
import { api } from "../api";
import type { Expense } from "../types";

const categories = ["All", "Food", "Transport", "Bills", "Shopping", "Entertainment", "Health", "Other"];
const catColor: Record<string, string> = {
  Food: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
  Transport: "bg-cyan-500/15 text-cyan-300 border-cyan-500/20",
  Bills: "bg-amber-500/15 text-amber-300 border-amber-500/20",
  Shopping: "bg-pink-500/15 text-pink-300 border-pink-500/20",
  Entertainment: "bg-violet-500/15 text-violet-300 border-violet-500/20",
  Health: "bg-red-500/15 text-red-300 border-red-500/20",
  Other: "bg-slate-500/15 text-slate-300 border-slate-500/20",
};

type SortKey = "date" | "amount" | "category" | "description";
type SortDir = "asc" | "desc";

export default function Expenses() {
  const [form, setForm] = useState<Partial<Expense>>({
    date: new Date().toISOString().slice(0, 10),
    category: "Food",
    description: "",
    amount: 0,
  });
  const [items, setItems] = useState<Expense[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [currency, setCurrency] = useState("Rs.");

  // Filters
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [minAmount, setMinAmount] = useState<string>("");
  const [maxAmount, setMaxAmount] = useState<string>("");

  // Sorting + pagination + bulk
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState<number[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("currency");
    if (saved) setCurrency(saved);
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setItems(await api.getExpenses());
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load expenses");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [q, cat, startDate, endDate, minAmount, maxAmount]);

  // Utils
  const nfmt = (n: number | string) =>
    `${currency} ${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  const parseNum = (s: string) => (s.trim() === "" ? null : Number(s));
  const toTime = (d: string) => new Date(d).getTime();

  // Filtered
  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const min = parseNum(minAmount);
    const max = parseNum(maxAmount);
    const sd = startDate ? toTime(startDate) : null;
    const ed = endDate ? toTime(endDate) : null;

    return items.filter((x) => {
      if (cat !== "All" && x.category !== cat) return false;
      if (ql && !(x.description.toLowerCase().includes(ql) || x.category.toLowerCase().includes(ql))) return false;

      if (sd && toTime(x.date) < sd) return false;
      if (ed && toTime(x.date) > ed) return false;

      if (min != null && x.amount < min) return false;
      if (max != null && x.amount > max) return false;

      return true;
    });
  }, [items, q, cat, startDate, endDate, minAmount, maxAmount]);

  // Sort
  const sorted = useMemo(() => {
    const arr = filtered.slice();
    arr.sort((a, b) => {
      let va: number | string = a[sortKey];
      let vb: number | string = b[sortKey];

      if (sortKey === "date") {
        va = toTime(String(va));
        vb = toTime(String(vb));
      }
      if (typeof va === "string" && typeof vb === "string") {
        return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      const diff = Number(va) - Number(vb);
      return sortDir === "asc" ? diff : -diff;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [totalPages, page]);
  const startIdx = (page - 1) * pageSize;
  const pageRows = sorted.slice(startIdx, startIdx + pageSize);

  // Totals
  const totalFiltered = useMemo(() => filtered.reduce((s, x) => s + x.amount, 0), [filtered]);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const monthLabel = now.toLocaleString("default", { month: "short", year: "numeric" });

  const monthlyFiltered = useMemo(
    () =>
      filtered
        .filter((x) => {
          const t = toTime(x.date);
          return t >= monthStart.getTime() && t <= monthEnd.getTime();
        })
        .reduce((s, x) => s + x.amount, 0),
    [filtered, monthStart, monthEnd]
  );

  const avgPerExpense = useMemo(() => (filtered.length ? totalFiltered / filtered.length : 0), [filtered, totalFiltered]);

  // Category breakdown
  const catTotals = useMemo(() => {
    const map = new Map<string, number>();
    for (const x of filtered) {
      map.set(x.category, (map.get(x.category) || 0) + x.amount);
    }
    const arr = Array.from(map.entries()).map(([name, amount]) => ({ name, amount }));
    arr.sort((a, b) => b.amount - a.amount);
    return arr.slice(0, 6);
  }, [filtered]);

  // Sparkline data (this month)
  const spark = useMemo(() => {
    const daysInMonth = monthEnd.getDate();
    const arr = Array.from({ length: daysInMonth }, () => 0);
    for (const x of filtered) {
      const d = new Date(x.date);
      if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
        arr[d.getDate() - 1] += x.amount;
      }
    }
    const max = Math.max(1, ...arr);
    return { arr, max, daysInMonth };
  }, [filtered, now, monthEnd]);

  // Form helpers
  const resetForm = () => {
    setForm({ date: new Date().toISOString().slice(0, 10), category: "Food", description: "", amount: 0 });
    setEditingId(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.date || !form.category || form.amount == null) return;
    if (Number(form.amount) <= 0) { setErr("Amount must be greater than 0"); return; }

    setErr(null);
    try {
      if (editingId) {
        const updated = await api.updateExpense(editingId, {
          date: form.date!, category: form.category!, description: form.description || "", amount: Number(form.amount),
        });
        setItems((prev) => prev.map((x) => (x.id === editingId ? updated : x)));
      } else {
        await api.createExpense({
          date: form.date!, category: form.category!, description: form.description || "", amount: Number(form.amount),
        });
        await load();
      }
      resetForm();
    } catch (e) { setErr(e instanceof Error ? e.message : "Save failed"); }
  };

  const edit = (x: Expense) => { setForm(x); setEditingId(x.id); };
  const del = async (id: number) => {
    if (!confirm("Delete this expense?")) return;
    try {
      await api.deleteExpense(id);
      setItems((prev) => prev.filter((x) => x.id !== id));
      if (editingId === id) resetForm();
      setSelected((sel) => sel.filter((s) => s !== id));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Delete failed");
    }
  };

  // Bulk + CSV
  const toggleSelect = (id: number) =>
    setSelected((sel) => (sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]));

  const pageAllSelected = pageRows.length > 0 && pageRows.every((r) => selected.includes(r.id));
  const toggleSelectAllPage = () => {
    if (pageAllSelected) {
      setSelected((sel) => sel.filter((id) => !pageRows.some((r) => r.id === id)));
    } else {
      setSelected((sel) => Array.from(new Set([...sel, ...pageRows.map((r) => r.id)])));
    }
  };

  const toCSV = (rows: Expense[]) => {
    const header = ["id", "date", "category", "description", "amount"].join(",");
    const lines = rows.map((r) =>
      [r.id, r.date, r.category, `"${(r.description || "").replace(/"/g, '""')}"`, r.amount].join(",")
    );
    return [header, ...lines].join("\n");
  };

  const exportCSV = (rows: Expense[], filename = "expenses.csv") => {
    const blob = new Blob([toCSV(rows)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const bulkDelete = async () => {
    if (!selected.length) return;
    if (!confirm(`Delete ${selected.length} selected expense(s)?`)) return;
    try {
      await Promise.all(selected.map((id) => api.deleteExpense(id)));
      setItems((prev) => prev.filter((x) => !selected.includes(x.id)));
      setSelected([]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Bulk delete failed");
    }
  };

  const sortBy = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortIcon = (key: SortKey) =>
    sortKey !== key ? "↕︎" : sortDir === "asc" ? "↑" : "↓";

  const clearFilters = () => {
    setQ("");
    setCat("All");
    setStartDate("");
    setEndDate("");
    setMinAmount("");
    setMaxAmount("");
  };

  return (
    <main className="container mx-auto px-6 py-12 text-white">
      <div className="mb-6 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">📈 Expenses</h1>
          <p className="text-slate-400">Add, edit, and analyze your spending</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-slate-400">Filtered Total</div>
          <div className="text-2xl font-bold">{nfmt(totalFiltered)}</div>
        </div>
      </div>

      {err && <div className="mb-4 rounded-lg border border-rose-600/30 bg-rose-500/10 p-3 text-rose-200">{err}</div>}

      {!loading && (
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <div className="card p-4 rounded-xl border border-slate-700/60 bg-slate-800/40">
            <div className="text-slate-400 text-sm">This Month ({monthLabel})</div>
            <div className="text-xl font-semibold mt-1">{nfmt(monthlyFiltered)}</div>
          </div>
          <div className="card p-4 rounded-xl border border-slate-700/60 bg-slate-800/40">
            <div className="text-slate-400 text-sm">Avg per Expense</div>
            <div className="text-xl font-semibold mt-1">{nfmt(avgPerExpense)}</div>
          </div>
          <div className="card p-4 rounded-xl border border-slate-700/60 bg-slate-800/40">
            <div className="text-slate-400 text-sm">Records (filtered)</div>
            <div className="text-xl font-semibold mt-1">{filtered.length.toLocaleString()}</div>
          </div>
          <div className="card p-4 rounded-xl border border-slate-700/60 bg-slate-800/40">
            <div className="text-slate-400 text-sm">Records (total)</div>
            <div className="text-xl font-semibold mt-1">{items.length.toLocaleString()}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card p-4 mb-6 rounded-xl border border-slate-700/60 bg-slate-800/40">
        <div className="grid md:grid-cols-3 gap-3">
          <input
            className="input"
            placeholder="Search by description or category…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select className="select" value={cat} onChange={(e) => setCat(e.target.value)}>
            {categories.map((c) => <option key={c}>{c}</option>)}
          </select>
          <div className="flex gap-2">
            <select
              className="select flex-1"
              value={`${sortKey}:${sortDir}`}
              onChange={(e) => {
                const [k, d] = e.target.value.split(":") as [SortKey, SortDir];
                setSortKey(k); setSortDir(d);
              }}
            >
              <option value="date:desc">Sort: Date (newest)</option>
              <option value="date:asc">Sort: Date (oldest)</option>
              <option value="amount:desc">Sort: Amount (high→low)</option>
              <option value="amount:asc">Sort: Amount (low→high)</option>
              <option value="category:asc">Sort: Category (A→Z)</option>
              <option value="category:desc">Sort: Category (Z→A)</option>
              <option value="description:asc">Sort: Description (A→Z)</option>
              <option value="description:desc">Sort: Description (Z→A)</option>
            </select>
            <button className="button" type="button" onClick={() => exportCSV(filtered, "expenses_filtered.csv")}>Export CSV</button>
          </div>
        </div>
        <div className="grid md:grid-cols-4 gap-3 mt-3">
          <input type="date" aria-label="Start date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <input type="date" aria-label="End date" className="input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          <input type="number" aria-label="Min amount" className="input" placeholder="Min amount" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} />
          <div className="flex gap-2">
            <input type="number" aria-label="Max amount" className="input flex-1" placeholder="Max amount" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} />
            <button className="button" type="button" onClick={clearFilters}>Clear</button>
          </div>
        </div>
        <div className="hidden md:flex text-sm text-slate-400 self-center mt-2">
          {filtered.length} of {items.length} records
        </div>
      </div>

      {/* Insight row: Sparkline + Category breakdown */}
      {!loading && filtered.length > 0 && (
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="card p-4 rounded-xl border border-slate-700/60 bg-slate-800/40">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold">Monthly Trend</h3>
              <span className="text-sm text-slate-400">{monthLabel}</span>
            </div>
            <div className="h-24">
              <svg viewBox="0 0 100 40" className="w-full h-full">
                <polyline
                  fill="none"
                  stroke="#34d399"
                  strokeWidth="2"
                  points={spark.arr.map((v, i) => {
                    const x = (i / Math.max(1, spark.daysInMonth - 1)) * 100;
                    const y = 40 - (v / spark.max) * 36 - 2; // padding
                    return `${x},${y}`;
                  }).join(" ")}
                />
                {/* Baseline */}
                <line x1="0" y1="38" x2="100" y2="38" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
              </svg>
            </div>
            <div className="mt-2 text-slate-400 text-sm">
              Days tracked: {spark.arr.filter((v) => v > 0).length}/{spark.daysInMonth}
            </div>
          </div>

          <div className="card p-4 rounded-xl border border-slate-700/60 bg-slate-800/40">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Category Breakdown</h3>
            </div>
            <div className="mt-4 space-y-3">
              {catTotals.length === 0 ? (
                <div className="text-slate-400">No data for current filters.</div>
              ) : (
                catTotals.map((c, i) => {
                  const colors = ["bg-emerald-500", "bg-blue-500", "bg-amber-500", "bg-fuchsia-500", "bg-violet-500", "bg-cyan-500"];
                  const color = colors[i % colors.length];
                  const p = totalFiltered ? Math.min(100, Math.round((c.amount / totalFiltered) * 100)) : 0;
                  return (
                    <div key={c.name}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${color}`} />
                          <span className="text-slate-300">{c.name}</span>
                        </div>
                        <div className="text-sm">{nfmt(c.amount)} <span className="text-slate-400">({p}%)</span></div>
                      </div>
                      <div className="mt-2 h-2 bg-slate-700/60 rounded overflow-hidden">
                        <div className={`h-full ${color}`} style={{ width: `${p}%` }} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={submit} className="card p-4 grid md:grid-cols-5 gap-3 mb-6 rounded-xl border border-slate-700/60 bg-slate-800/40">
        <input type="date" aria-label="Date" className="input" value={form.date || ""} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} required />
        <select aria-label="Category" className="select" value={form.category || "Food"} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
          {categories.filter(c => c !== "All").map((c) => <option key={c}>{c}</option>)}
        </select>
        <input type="text" aria-label="Description" placeholder="Description" className="input"
          value={form.description || ""} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} required />
        <input type="number" step="0.01" aria-label="Amount" placeholder="Amount" min={0} className="input"
          value={form.amount ?? 0} onChange={(e) => setForm((f) => ({ ...f, amount: Number(e.target.value) }))} required />
        <div className="flex gap-2">
          <button className="button flex-1 bg-blue-600 hover:bg-blue-500" type="submit">{editingId ? "Update" : "Add"}</button>
          {editingId && <button type="button" onClick={resetForm} className="button">Cancel</button>}
        </div>
      </form>

      {/* Bulk actions */}
      {selected.length > 0 && (
        <div className="card p-4 mb-4 rounded-xl border border-slate-700/60 bg-slate-800/40 flex items-center justify-between">
          <div className="text-slate-300">{selected.length} selected</div>
          <div className="flex gap-2">
            <button className="button bg-red-600/80 hover:bg-red-600" onClick={bulkDelete}>Delete selected</button>
            <button className="button" onClick={() => exportCSV(items.filter((x) => selected.includes(x.id)), "expenses_selected.csv")}>Export selected</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          <div className="skeleton h-10" />
          <div className="skeleton h-10" />
          <div className="skeleton h-10" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-6 text-slate-300 rounded-xl border border-slate-700/60 bg-slate-800/40">No records found. Add your first expense above ✨</div>
      ) : (
        <>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th className="th w-10">
                    <input type="checkbox" aria-label="Select all on page" checked={pageAllSelected} onChange={toggleSelectAllPage} />
                  </th>
                  <th className="th cursor-pointer" onClick={() => sortBy("date")}>Date <span className="text-slate-500">{sortIcon("date")}</span></th>
                  <th className="th cursor-pointer" onClick={() => sortBy("category")}>Category <span className="text-slate-500">{sortIcon("category")}</span></th>
                  <th className="th cursor-pointer" onClick={() => sortBy("description")}>Description <span className="text-slate-500">{sortIcon("description")}</span></th>
                  <th className="th cursor-pointer text-right" onClick={() => sortBy("amount")}>Amount <span className="text-slate-500">{sortIcon("amount")}</span></th>
                  <th className="th">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((x) => (
                  <tr key={x.id} className={`row hover:bg-white/5 ${editingId === x.id ? "bg-white/5" : ""}`}>
                    <td className="td">
                      <input type="checkbox" checked={selected.includes(x.id)} onChange={() => toggleSelect(x.id)} />
                    </td>
                    <td className="td">{new Date(x.date).toLocaleDateString()}</td>
                    <td className="td">
                      <span className={`badge ${catColor[x.category] || ""}`}>{x.category}</span>
                    </td>
                    <td className="td">{x.description}</td>
                    <td className="td text-right">{nfmt(x.amount)}</td>
                    <td className="td">
                      <div className="flex gap-2 justify-end">
                        <button className="button text-xs" onClick={() => edit(x)}>Edit</button>
                        <button className="button bg-red-600/80 hover:bg-red-600 text-xs" onClick={() => del(x.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
                <tr className="bg-white/5 font-semibold">
                  <td className="td" colSpan={4}>Page total</td>
                  <td className="td text-right">
                    {nfmt(pageRows.reduce((s, y) => s + y.amount, 0))}
                  </td>
                  <td className="td" />
                </tr>
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-slate-400">
              Showing {startIdx + 1}-{Math.min(sorted.length, startIdx + pageSize)} of {sorted.length}
            </div>
            <div className="flex items-center gap-3">
              <select className="select" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
                {[10, 20, 50, 100].map((n) => <option key={n} value={n}>{n} / page</option>)}
              </select>
              <button className="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
              <span className="text-slate-300 text-sm">Page {page} of {totalPages}</span>
              <button className="button" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
            </div>
          </div>
        </>
      )}
    </main>
  );
}