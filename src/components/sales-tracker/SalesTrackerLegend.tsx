export function SalesTrackerLegend() {
  return (
    <div
      className="flex flex-wrap gap-4 text-xs font-semibold uppercase tracking-[0.12em] text-app-muted"
      aria-label="Sales tracker legend"
    >
      <span className="inline-flex items-center gap-2">
        <span className="h-3 w-3 rounded bg-emerald-500" aria-hidden="true" />
        Hit goal
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="h-3 w-3 rounded bg-[#e72027]" aria-hidden="true" />
        Below goal
      </span>
      <span className="inline-flex items-center gap-2">
        <span
          className="h-3 w-3 rounded border border-dashed border-app-border bg-app-base"
          aria-hidden="true"
        />
        No entry
      </span>
    </div>
  );
}
