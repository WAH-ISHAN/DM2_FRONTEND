export function ProgressBar({
  pct,
  color = "from-cyan-500 to-blue-500",
}: {
  pct: number;
  color?: string;
}) {
  const safe = Math.max(0, Math.min(100, pct));
  return (
    <div className="w-full h-3 rounded bg-white/5 overflow-hidden">
      <div
        className={`h-full bg-gradient-to-r ${color}`}
        style={{ width: `${safe}%` }}
      />
    </div>
  );
}