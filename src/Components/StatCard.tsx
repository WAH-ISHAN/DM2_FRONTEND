import React from "react";

export function StatCard({
  icon,
  label,
  value,
  hint,
  gradient = "from-blue-500/20 to-blue-500/0",
}: {
  icon?: React.ReactNode;
  label: string;
  value: React.ReactNode;
  hint?: string;
  gradient?: string;
}) {
  return (
    <div className="stat relative">
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-b ${gradient}`} />
      <div className="relative flex items-start gap-3">
        {icon && <div className="text-2xl">{icon}</div>}
        <div>
          <div className="text-slate-300 text-sm">{label}</div>
          <div className="text-3xl font-bold">{value}</div>
          {hint && <div className="text-xs text-slate-400 mt-1">{hint}</div>}
        </div>
      </div>
    </div>
  );
}