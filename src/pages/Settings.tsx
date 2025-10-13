"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api";
import type { Expense, Budget, Saving } from "../types";

type BackupPayload = {
  expenses?: Expense[];
  budgets?: Budget[];
  savings?: Saving[];
  meta?: Record<string, unknown>;
};

export default function SettingsPage() {
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Notices
  const [info, setInfo] = useState<string>("");
  const [busy, setBusy] = useState(false);

  // Prefs
  const [currency, setCurrency] = useState("Rs.");
  const [theme, setTheme] = useState<"system" | "light" | "dark">("dark");
  const [dateFmt, setDateFmt] = useState<"YYYY-MM-DD" | "DD/MM/YYYY" | "MM/DD/YYYY">("YYYY-MM-DD");
  const [numFmt, setNumFmt] = useState<"1,234.56" | "1.234,56">("1,234.56");
  const [firstDay, setFirstDay] = useState<"Mon" | "Sun">("Mon");
  const [defaultRoute, setDefaultRoute] = useState<string>("/");

  // Data stats
  const [counts, setCounts] = useState({ expenses: 0, budgets: 0, savings: 0 });

  // Import flow
  const [pendingImport, setPendingImport] = useState<{ name: string; payload: BackupPayload } | null>(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ step: string; current: number; total: number } | null>(null);

  // Load prefs
  useEffect(() => {
    const c = localStorage.getItem("currency");
    if (c) setCurrency(c);
    const t = (localStorage.getItem("theme") as any) || "dark";
    setTheme(t);
    setDateFmt((localStorage.getItem("dateFmt") as any) || "YYYY-MM-DD");
    setNumFmt((localStorage.getItem("numFmt") as any) || "1,234.56");
    setFirstDay((localStorage.getItem("firstDay") as any) || "Mon");
    setDefaultRoute(localStorage.getItem("defaultRoute") || "/");
  }, []);

  // Apply theme
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else if (theme === "light") root.classList.remove("dark");
    else {
      // system: best effort (keeps current; app is dark-first)
    }
  }, [theme]);

  // Load counts
  const refreshCounts = async () => {
    try {
      setBusy(true);
      const [ex, bu, sa] = await Promise.all([api.getExpenses(), api.getBudgets(), api.getSavings()]);
      setCounts({ expenses: ex.length, budgets: bu.length, savings: sa.length });
    } catch (e) {
      setInfo(e instanceof Error ? e.message : "Failed to load counts");
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    refreshCounts();
  }, []);

  // Save prefs
  const saveCurrency = (c: string) => {
    setCurrency(c);
    localStorage.setItem("currency", c);
    setInfo("Currency updated.");
  };
  const saveTheme = (t: "system" | "light" | "dark") => {
    setTheme(t);
    localStorage.setItem("theme", t);
    setInfo("Theme preference saved.");
  };
  const saveDateFmt = (v: typeof dateFmt) => {
    setDateFmt(v);
    localStorage.setItem("dateFmt", v);
    setInfo("Date format saved.");
  };
  const saveNumFmt = (v: typeof numFmt) => {
    setNumFmt(v);
    localStorage.setItem("numFmt", v);
    setInfo("Number format saved.");
  };
  const saveFirstDay = (v: typeof firstDay) => {
    setFirstDay(v);
    localStorage.setItem("firstDay", v);
    setInfo("Calendar preference saved.");
  };
  const saveDefaultRoute = (v: string) => {
    setDefaultRoute(v);
    localStorage.setItem("defaultRoute", v);
    setInfo("Default page updated.");
  };

  const openFile = () => inputRef.current?.click();

  // Date sample preview
  const dateSample = useMemo(() => {
    const d = new Date(2025, 0, 9); // Jan 9, 2025
    const pad = (x: number) => String(x).padStart(2, "0");
    const Y = d.getFullYear();
    const M = pad(d.getMonth() + 1);
    const D = pad(d.getDate());
    if (dateFmt === "YYYY-MM-DD") return `${Y}-${M}-${D}`;
    if (dateFmt === "DD/MM/YYYY") return `${D}/${M}/${Y}`;
    return `${M}/${D}/${Y}`;
  }, [dateFmt]);

  // Backup JSON
  async function downloadJson() {
    setInfo("");
    try {
      setBusy(true);
      const [expenses, budgets, savings] = await Promise.all([api.getExpenses(), api.getBudgets(), api.getSavings()]);
      const payload: BackupPayload = {
        expenses,
        budgets,
        savings,
        meta: {
          exportedAt: new Date().toISOString(),
          currency,
          dateFmt,
          numFmt,
          firstDay,
          app: "FinancePro",
        },
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "finance-backup.json";
      a.click();
      URL.revokeObjectURL(url);
      setInfo("Backup downloaded.");
    } catch (e) {
      setInfo(e instanceof Error ? e.message : "Download failed");
    } finally {
      setBusy(false);
    }
  }

  // CSV helpers
  async function downloadExpensesCsv() {
    setInfo("");
    try {
      setBusy(true);
      const data = await api.getExpenses();
      const headers = ["Date", "Category", "Description", "Amount"];
      const csv = [
        headers.join(","),
        ...data.map((r) =>
          [
            r.date,
            `"${(r.category || "").replace(/"/g, '""')}"`,
            `"${(r.description || "").replace(/"/g, '""')}"`,
            r.amount,
          ].join(",")
        ),
      ].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "expenses.csv";
      a.click();
      URL.revokeObjectURL(url);
      setInfo("Expenses CSV exported.");
    } catch (e) {
      setInfo(e instanceof Error ? e.message : "Export failed");
    } finally {
      setBusy(false);
    }
  }

  async function downloadBudgetsCsv() {
    setInfo("");
    try {
      setBusy(true);
      const data = await api.getBudgets();
      const headers = ["Category", "Limit"];
      const csv = [
        headers.join(","),
        ...data.map((b: any) => [`"${(b.category || "").replace(/"/g, '""')}"`, b.limit ?? 0].join(",")),
      ].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "budgets.csv";
      a.click();
      URL.revokeObjectURL(url);
      setInfo("Budgets CSV exported.");
    } catch (e) {
      setInfo(e instanceof Error ? e.message : "Export failed");
    } finally {
      setBusy(false);
    }
  }

  async function downloadSavingsCsv() {
    setInfo("");
    try {
      setBusy(true);
      const data = await api.getSavings();
      const headers = ["Name", "Target", "Current"];
      const csv = [
        headers.join(","),
        ...data.map((s: any) =>
          [`"${(s.name || "").replace(/"/g, '""')}"`, s.target ?? 0, s.current ?? 0].join(",")
        ),
      ].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "savings.csv";
      a.click();
      URL.revokeObjectURL(url);
      setInfo("Savings CSV exported.");
    } catch (e) {
      setInfo(e instanceof Error ? e.message : "Export failed");
    } finally {
      setBusy(false);
    }
  }

  // Handle file choose -> preview first
  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const json = JSON.parse(text) as BackupPayload;
      const valid =
        typeof json === "object" &&
        (Array.isArray(json.expenses) || Array.isArray(json.budgets) || Array.isArray(json.savings));
      if (!valid) {
        setInfo("Invalid backup file.");
        return;
      }
      setPendingImport({ name: file.name, payload: json });
      setInfo(`Ready to import: ${file.name}`);
    } catch (err) {
      setInfo(err instanceof Error ? err.message : "Import error");
    } finally {
      e.target.value = "";
    }
  }

  async function runImport() {
    if (!pendingImport) return;
    if (
      !confirm(
        "Import will replace all existing data (multiple API calls). Continue?"
      )
    )
      return;

    const { payload } = pendingImport;
    setImporting(true);
    setImportProgress({ step: "Clearing existing", current: 0, total: 1 });
    setInfo("");

    try {
      // Clear existing
      const [ex, bu, sa] = await Promise.all([api.getExpenses(), api.getBudgets(), api.getSavings()]);
      await Promise.all(ex.map((x: any) => api.deleteExpense(x.id)));
      await Promise.all(bu.map((x: any) => api.deleteBudget(x.id)));
      await Promise.all(sa.map((x: any) => api.deleteSaving(x.id)));

      // Restore (sequential with progress)
      const total =
        (payload.expenses?.length || 0) + (payload.budgets?.length || 0) + (payload.savings?.length || 0);
      let done = 0;
      const bump = (step: string) => setImportProgress({ step, current: done, total });

      // Expenses
      bump("Importing expenses");
      for (const e of payload.expenses || []) {
        // Map to expected fields to avoid id collisions
        await api.createExpense({
          date: (e as any).date,
          category: (e as any).category,
          description: (e as any).description,
          amount: Number((e as any).amount || 0),
        });
        done++; bump("Importing expenses");
      }

      // Budgets
      bump("Importing budgets");
      for (const b of payload.budgets || []) {
        await api.createBudget((b as any).category, Number((b as any).limit || 0));
        done++; bump("Importing budgets");
      }

      // Savings (preserve current if available)
      bump("Importing savings");
      for (const s of payload.savings || []) {
        const created = await api.createSaving((s as any).name, Number((s as any).target || 0));
        const current = Number((s as any).current || 0);
        if (current > 0 && created?.id) {
          await api.updateSaving(created.id, { current });
        }
        done++; bump("Importing savings");
      }

      setPendingImport(null);
      setInfo("Import completed.");
      refreshCounts();
    } catch (e) {
      setInfo(e instanceof Error ? e.message : "Import error");
    } finally {
      setImporting(false);
      setImportProgress(null);
    }
  }

  // Clear everything
  async function clearData() {
    if (!confirm("Are you sure? This will delete all expenses, budgets, and savings.")) return;
    setInfo("");
    try {
      setBusy(true);
      const [ex, bu, sa] = await Promise.all([api.getExpenses(), api.getBudgets(), api.getSavings()]);
      await Promise.all(ex.map((x: any) => api.deleteExpense(x.id)));
      await Promise.all(bu.map((b: any) => api.deleteBudget(b.id)));
      await Promise.all(sa.map((s: any) => api.deleteSaving(s.id)));
      setInfo("All data cleared.");
      refreshCounts();
    } catch (e) {
      setInfo(e instanceof Error ? e.message : "Clear failed");
    } finally {
      setBusy(false);
    }
  }

  // Clear local preferences
  function clearLocalSettings() {
    if (!confirm("Reset local preferences (theme, currency, formats)?")) return;
    localStorage.removeItem("currency");
    localStorage.removeItem("theme");
    localStorage.removeItem("dateFmt");
    localStorage.removeItem("numFmt");
    localStorage.removeItem("firstDay");
    localStorage.removeItem("defaultRoute");
    setInfo("Local preferences reset.");
  }

  // Optional: seed demo data
  async function seedDemoData() {
    if (!confirm("Add a small set of demo data?")) return;
    setBusy(true);
    setInfo("");
    try {
      const today = new Date();
      const ym = today.toISOString().slice(0, 7);
      const demoExpenses: Expense[] = [
        { id: 0, date: `${ym}-02`, category: "Food", description: "Groceries", amount: 3200 },
        { id: 0, date: `${ym}-05`, category: "Transport", description: "Taxi", amount: 1500 },
        { id: 0, date: `${ym}-10`, category: "Bills", description: "Internet", amount: 4500 },
        { id: 0, date: `${ym}-15`, category: "Entertainment", description: "Movies", amount: 1800 },
        { id: 0, date: `${ym}-21`, category: "Shopping", description: "Clothes", amount: 5200 },
      ];
      for (const e of demoExpenses) {
        await api.createExpense({
          date: e.date,
          category: e.category,
          description: e.description,
          amount: e.amount,
        });
      }
      await api.createBudget("Food", 20000);
      await api.createBudget("Transport", 10000);
      const s1 = await api.createSaving("Emergency Fund", 200000);
      if (s1?.id) await api.updateSaving(s1.id, { current: 25000 });
      const s2 = await api.createSaving("New Phone", 150000);
      if (s2?.id) await api.updateSaving(s2.id, { current: 60000 });

      setInfo("Demo data added.");
      refreshCounts();
    } catch (e) {
      setInfo(e instanceof Error ? e.message : "Demo data failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="container mx-auto px-6 py-12 text-white">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">⚙️ Settings & Backup</h1>
        <div className="text-sm text-slate-400">
          {busy ? "Working…" : "Ready"}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <div className="p-4 rounded-xl border border-white/10 bg-white/5">
          <div className="text-slate-300 text-sm">Expenses</div>
          <div className="text-2xl font-semibold mt-1">{counts.expenses.toLocaleString()}</div>
        </div>
        <div className="p-4 rounded-xl border border-white/10 bg-white/5">
          <div className="text-slate-300 text-sm">Budgets</div>
          <div className="text-2xl font-semibold mt-1">{counts.budgets.toLocaleString()}</div>
        </div>
        <div className="p-4 rounded-xl border border-white/10 bg-white/5">
          <div className="text-slate-300 text-sm">Savings</div>
          <div className="text-2xl font-semibold mt-1">{counts.savings.toLocaleString()}</div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-6">
        {/* Preferences */}
        <div className="card p-5 rounded-xl border border-white/10 bg-white/5">
          <h2 className="text-xl font-semibold">Preferences</h2>
          <p className="text-slate-300 mt-1">Customize app preferences.</p>

          <div className="mt-3">
            <label className="block text-sm text-slate-300 mb-1" htmlFor="currency">Currency</label>
            <select id="currency" value={currency} onChange={(e) => saveCurrency(e.target.value)} className="select">
              <option value="Rs.">Rs. (LKR)</option>
              <option value="$">$ (USD)</option>
              <option value="€">€ (EUR)</option>
              <option value="£">£ (GBP)</option>
            </select>
          </div>

          <div className="mt-3">
            <label className="block text-sm text-slate-300 mb-1">Theme</label>
            <div className="grid grid-cols-3 gap-2">
              <button className={`button ${theme === "dark" ? "bg-slate-700" : ""}`} onClick={() => saveTheme("dark")}>Dark</button>
              <button className={`button ${theme === "light" ? "bg-slate-700" : ""}`} onClick={() => saveTheme("light")}>Light</button>
              <button className={`button ${theme === "system" ? "bg-slate-700" : ""}`} onClick={() => saveTheme("system")}>System</button>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-slate-300 mb-1">Date format</label>
              <select className="select" value={dateFmt} onChange={(e) => saveDateFmt(e.target.value as any)}>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              </select>
              <div className="text-xs text-slate-400 mt-1">Sample: {dateSample}</div>
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1">Number format</label>
              <select className="select" value={numFmt} onChange={(e) => saveNumFmt(e.target.value as any)}>
                <option>1,234.56</option>
                <option>1.234,56</option>
              </select>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-slate-300 mb-1">First day</label>
              <select className="select" value={firstDay} onChange={(e) => saveFirstDay(e.target.value as any)}>
                <option>Mon</option>
                <option>Sun</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1">Default page</label>
              <select className="select" value={defaultRoute} onChange={(e) => saveDefaultRoute(e.target.value)}>
                <option value="/">Dashboard</option>
                <option value="/expenses">Expenses</option>
                <option value="/budgets">Budgets</option>
                <option value="/savings">Savings</option>
                <option value="/reports">Reports</option>
              </select>
            </div>
          </div>

          <div className="mt-3">
            <button className="button bg-slate-800 hover:bg-slate-700 w-full" onClick={clearLocalSettings}>
              Reset Local Preferences
            </button>
          </div>
        </div>

        {/* Backup & Export */}
        <div className="md:col-span-2 card p-5 rounded-xl border border-white/10 bg-white/5">
          <h2 className="text-xl font-semibold">Backup & Export</h2>
          <p className="text-slate-300 mt-1">Manage your data backups.</p>

          <div className="mt-3 grid md:grid-cols-3 gap-3">
            <button onClick={downloadJson} className="button bg-blue-600 hover:bg-blue-500">Download JSON Backup</button>
            <button onClick={downloadExpensesCsv} className="button bg-green-600 hover:bg-green-500">Export Expenses CSV</button>
            <button onClick={downloadBudgetsCsv} className="button bg-emerald-600 hover:bg-emerald-500">Export Budgets CSV</button>
            <button onClick={downloadSavingsCsv} className="button bg-cyan-600 hover:bg-cyan-500 md:col-span-1">Export Savings CSV</button>
            <button onClick={seedDemoData} className="button bg-slate-800 hover:bg-slate-700 md:col-span-2">Add Demo Data</button>
          </div>
        </div>

        {/* Restore Backup */}
        <div className="card p-5 rounded-xl border border-white/10 bg-white/5">
          <h2 className="text-xl font-semibold">Restore Backup</h2>
          <p className="text-slate-300 mt-1">Import a JSON backup file.</p>
          <button onClick={openFile} className="button mt-3 bg-emerald-600 hover:bg-emerald-500" aria-controls="backupFile">
            Select File…
          </button>
          <input ref={inputRef} id="backupFile" type="file" accept="application/json" className="hidden" onChange={handleFile} />

          {pendingImport && (
            <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-3">
              <div className="font-medium mb-1">Ready to import: {pendingImport.name}</div>
              <ul className="text-sm text-slate-300">
                <li>Expenses: {(pendingImport.payload.expenses || []).length}</li>
                <li>Budgets: {(pendingImport.payload.budgets || []).length}</li>
                <li>Savings: {(pendingImport.payload.savings || []).length}</li>
              </ul>
              {importProgress ? (
                <div className="mt-3 text-sm text-slate-300">
                  {importProgress.step} — {importProgress.current}/{importProgress.total}
                  <div className="mt-2 h-2 bg-white/10 rounded overflow-hidden">
                    <div
                      className="h-full bg-emerald-500"
                      style={{
                        width: `${importProgress.total ? Math.round((importProgress.current / importProgress.total) * 100) : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex gap-2">
                  <button className="button bg-emerald-600 hover:bg-emerald-500" onClick={runImport} disabled={importing}>
                    {importing ? "Importing…" : "Import Now"}
                  </button>
                  <button className="button" onClick={() => setPendingImport(null)} disabled={importing}>
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Danger Zone */}
        <div className="card p-5 rounded-xl border border-white/10 bg-white/5">
          <h2 className="text-xl font-semibold">Danger Zone</h2>
          <p className="text-slate-300 mt-1">These actions cannot be undone.</p>
          <button onClick={clearData} className="button mt-3 w-full bg-red-600 hover:bg-red-500">
            Clear All Data
          </button>
        </div>
      </div>

      {info && (
        <div className="mt-2 text-slate-300">
          {info}
        </div>
      )}
    </main>
  );
}