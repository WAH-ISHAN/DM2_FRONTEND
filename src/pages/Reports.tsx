"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  BarElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler,
  ChartDataset,
  ChartType,
  Chart
} from "chart.js";
import { api } from "../api";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  BarElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
);

interface MonthlyData {
  monthly: [string, number][];
  byCat: { k: string; v: number }[];
  forecast?: number;
}

// Draw center text in doughnut
const CenterTextPlugin = {
  id: "centerText",
  afterDraw(
    chart: Chart,
    _args: any,
    opts?: { text?: string | string[]; color?: string; font?: string }
  ) {
    const text = opts?.text;
    if (!text) return;
    const { ctx } = chart;
    let x = 0,
      y = 0;
    try {
      const arc = chart.getDatasetMeta(0)?.data?.[0];
      if (arc) {
        x = arc.x;
        y = arc.y;
      }
    } catch {}
    if (!x || !y) {
      const { chartArea } = chart;
      x = (chartArea.left + chartArea.right) / 2;
      y = (chartArea.top + chartArea.bottom) / 2;
    }
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = opts?.color || "#E5E7EB";
    ctx.font = opts?.font || "600 14px ui-sans-serif, system-ui, -apple-system";
    const lines = Array.isArray(text) ? text : [text];
    const lh = 16;
    lines.forEach((line: string, i: number) =>
      ctx.fillText(line, x, y - ((lines.length - 1) / 2) * lh + i * lh)
    );
    ctx.restore();
  },
};

ChartJS.register(CenterTextPlugin);

export default function ReportsPage() {
  const [data, setData] = useState<MonthlyData | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState("Rs.");

  // Controls
  const [monthsWindow, setMonthsWindow] = useState(12);
  const [chartKind, setChartKind] = useState<"line" | "bar">("line");
  const [maWindow, setMaWindow] = useState(3);
  const [catLimit, setCatLimit] = useState(6);

  // Refs
  const lineRef = useRef<HTMLCanvasElement>(null);
  const pieRef = useRef<HTMLCanvasElement>(null);
  const lineChart = useRef<Chart | null>(null);
  const pieChart = useRef<Chart | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("currency");
    if (saved) setCurrency(saved);
  }, []);

  const reload = async () => {
    try {
      setLoading(true);
      const summary = await api.getReports();
      setData(summary);
      setErr(null);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  // Derived monthly arrays
  const monthlyLabelsAll = useMemo(() => (data?.monthly || []).map(([m]) => String(m)), [data]);
  const monthlyValuesAll = useMemo(() => (data?.monthly || []).map(([, v]) => Number(v || 0)), [data]);

  const windowSize =
    monthsWindow && monthsWindow > 0
      ? Math.min(monthsWindow, monthlyLabelsAll.length)
      : monthlyLabelsAll.length;

  const monthlyLabels = useMemo(() => monthlyLabelsAll.slice(-windowSize), [monthlyLabelsAll, windowSize]);
  const monthlyValues = useMemo(() => monthlyValuesAll.slice(-windowSize), [monthlyValuesAll, windowSize]);

  const nfmt = (n: number | undefined) => `${currency} ${Number(n || 0).toLocaleString()}`;

  const sum = (arr: number[]) => arr.reduce((s, x) => s + x, 0);
  const avg = (arr: number[]) => (arr.length ? sum(arr) / arr.length : 0);

  // KPIs
  const totalAll = useMemo(() => sum(monthlyValuesAll), [monthlyValuesAll]);
  const avgMonthly = useMemo(() => avg(monthlyValuesAll), [monthlyValuesAll]);
  const best = useMemo(() => {
    if (!monthlyValuesAll.length) return { label: "-", value: 0 };
    const i = monthlyValuesAll.indexOf(Math.max(...monthlyValuesAll));
    return { label: monthlyLabelsAll[i], value: monthlyValuesAll[i] };
  }, [monthlyLabelsAll, monthlyValuesAll]);
  const worst = useMemo(() => {
    if (!monthlyValuesAll.length) return { label: "-", value: 0 };
    const i = monthlyValuesAll.indexOf(Math.min(...monthlyValuesAll));
    return { label: monthlyLabelsAll[i], value: monthlyValuesAll[i] };
  }, [monthlyLabelsAll, monthlyValuesAll]);

  const mom = useMemo(() => {
    if (monthlyValuesAll.length < 2) return null;
    const last = monthlyValuesAll[monthlyValuesAll.length - 1];
    const prev = monthlyValuesAll[monthlyValuesAll.length - 2];
    if (prev === 0) return null;
    return ((last - prev) / prev) * 100;
  }, [monthlyValuesAll]);

  // Moving average
  const movingAvg = useMemo(() => {
    if (!maWindow || maWindow <= 1) return [];
    return monthlyValues.map((_, i, arr) => {
      if (i + 1 < maWindow) return null;
      const w = arr.slice(i - maWindow + 1, i + 1);
      return Number((sum(w as number[]) / maWindow).toFixed(2));
    });
  }, [monthlyValues, maWindow]);

  // Categories: group into Top N + Other
  const categoriesRaw = useMemo(() => data?.byCat || [], [data]);
  const categoriesSorted = useMemo(
    () => categoriesRaw.slice().sort((a, b) => Number(b.v || 0) - Number(a.v || 0)),
    [categoriesRaw]
  );
  const catTop = useMemo(() => {
    const top = categoriesSorted.slice(0, catLimit);
    const rest = categoriesSorted.slice(catLimit);
    const otherSum = sum(rest.map((c) => Number(c.v || 0)));
    return otherSum > 0 ? [...top, { k: "Other", v: otherSum }] : top;
  }, [categoriesSorted, catLimit]);

  // Anomalies
  const anomalies = useMemo(() => {
    const a = avgMonthly || 0;
    if (!a) return [];
    return monthlyValuesAll
      .map((v: number, i: number) => ({ label: monthlyLabelsAll[i], value: v }))
      .filter((m) => m.value > a * 1.3 || m.value < a * 0.7);
  }, [monthlyLabelsAll, monthlyValuesAll, avgMonthly]);

  const catColors = [
    "#EF4444", "#F59E0B", "#10B981", "#3B82F6", "#8B5CF6", "#EC4899",
    "#06B6D4", "#84CC16", "#F97316", "#22C55E", "#0EA5E9", "#A78BFA"
  ];

  // Export helpers
  const exportMonthlyCSV = () => {
    const lines = ["month,amount", ...monthlyLabels.map((m, i) => `${m},${monthlyValues[i]}`)];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "monthly_expenses.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const exportCategoriesCSV = () => {
    const lines = ["category,amount", ...categoriesSorted.map((c) => `${c.k},${c.v}`)];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "category_expenses.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPNG = (chartRef: React.RefObject<Chart>, filename: string) => {
    const ch = chartRef.current;
    if (!ch) return;
    const url = ch.toBase64Image("image/png", 1.0);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
  };

  // Build charts
  useEffect(() => {
    if (!data) return;

    // clear old
    lineChart.current?.destroy();
    pieChart.current?.destroy();

    // LINE/BAR CHART
    const lctx = lineRef.current?.getContext("2d");
    if (lctx && monthlyLabels.length) {
      lineChart.current = new ChartJS(lctx, {
        type: chartKind,
        data: {
          labels: monthlyLabels,
          datasets: [
            {
              type: chartKind,
              label: `Expenses (${currency})`,
              data: monthlyValues,
              borderColor: "#3B82F6",
              backgroundColor: (ctx) => {
                const chart = ctx.chart;
                const { ctx: c, chartArea } = chart;
                if (!chartArea) return "rgba(59,130,246,0.15)";
                const grad = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                grad.addColorStop(0, "rgba(59,130,246,0.35)");
                grad.addColorStop(1, "rgba(59,130,246,0.05)");
                return chartKind === "bar" ? "#3B82F6" : grad;
              },
              tension: 0.25,
              fill: chartKind === "line",
            } as ChartDataset<"line" | "bar", (number | null)[]>,
            ...(maWindow > 1
              ? [
                  {
                    type: "line" as const,
                    label: `${maWindow}-mo MA`,
                    data: movingAvg,
                    borderColor: "#A78BFA",
                    backgroundColor: "transparent",
                    borderDash: [6, 4],
                    spanGaps: true,
                    tension: 0.2,
                    pointRadius: 0,
                  } as ChartDataset<"line", (number | null)[]>,
                ]
              : []),
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                color: "#CBD5E1",
                callback: (value) => `${currency} ${Number(value).toLocaleString()}`,
              },
              grid: { color: "rgba(148,163,184,0.15)" },
            },
            x: {
              ticks: { color: "#CBD5E1", maxRotation: 0, autoSkip: true },
              grid: { color: "rgba(148,163,184,0.08)" },
            },
          },
          plugins: {
            legend: { labels: { color: "#F9FAFB" } },
            tooltip: {
              mode: "index",
              intersect: false,
              callbacks: {
                label(ctx) {
                  const val = ctx.raw == null ? ctx.parsed.y : ctx.raw;
                  return `${ctx.dataset.label}: ${currency} ${Number(val ?? 0).toLocaleString()}`;
                },
              },
            },
          },
        },
      });
    }

    // DOUGHNUT CHART
    const pctx = pieRef.current?.getContext("2d");
    if (pctx && catTop.length) {
      const totalCats = catTop.reduce((s, c) => s + Number(c.v || 0), 0) || 1;
      pieChart.current = new ChartJS(pctx, {
        type: "doughnut",
        data: {
          labels: catTop.map((c) => c.k),
          datasets: [
            {
              data: catTop.map((c) => Number(c.v || 0)),
              backgroundColor: catTop.map((_, i) => catColors[i % catColors.length]),
              borderWidth: 0,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: "65%",
          plugins: {
            legend: { position: "bottom", labels: { color: "#F9FAFB" } },
            tooltip: {
              callbacks: {
                label(ctx) {
                  const val = Number(ctx.parsed);
                  const pct = (val / totalCats) * 100;
                  return `${ctx.label}: ${currency} ${val.toLocaleString()} (${pct.toFixed(1)}%)`;
                },
              },
            },
            // @ts-ignore: Custom plugin
            centerText: {
              text: ["Categories", `${currency} ${totalCats.toLocaleString()}`],
              color: "#E5E7EB",
              font: "600 13px ui-sans-serif, system-ui",
            },
          },
        },
      });
    }

    return () => {
      lineChart.current?.destroy();
      pieChart.current?.destroy();
    };
  }, [data, currency, monthsWindow, chartKind, maWindow, catTop, monthlyLabels, monthlyValues, movingAvg]);

  return (
    <main className="container mx-auto px-6 py-12 text-white">
      {/* ...rest of JSX unchanged, it's already fine... */}
    </main>
  );
}
