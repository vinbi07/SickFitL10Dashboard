import type { KpiDetailsSlideData } from "@/lib/member-kpi/presentationTypes";
import type { SlideKpi } from "@/lib/member-kpi/slideHelper";

const STATUS_STYLES: Record<string, string> = {
  "On Track": "bg-emerald-700 text-slate-100",
  "At Risk": "bg-amber-600 text-slate-100",
  Behind: "bg-red-700 text-slate-100",
  Complete: "bg-blue-700 text-slate-100",
  Paused: "bg-stone-500 text-slate-100",
};

function KpiDetailRow({ kpi }: { kpi: SlideKpi }) {
  const pct = Math.min(100, Math.max(0, kpi.progress));
  const badgeCls = STATUS_STYLES[kpi.status] ?? "bg-stone-500 text-slate-100";

  const isYesNo = kpi.goalType === "Yes / No";
  const currentDisplay = isYesNo
    ? kpi.status === "Complete" ? "Yes" : "No"
    : kpi.current != null ? String(kpi.current) : "—";

  const targetDisplay = isYesNo
    ? null
    : kpi.target != null ? String(kpi.target) : "—";

  return (
    <div className="rounded-xl border border-app-border bg-app-base p-4">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white leading-snug">{kpi.name}</p>
          {kpi.description && (
            <p className="mt-0.5 text-xs text-app-muted line-clamp-1">{kpi.description}</p>
          )}
        </div>
        <span className={`inline-block shrink-0 rounded px-2 py-0.5 text-[11px] font-semibold leading-tight ${badgeCls}`}>
          {kpi.status}
        </span>
      </div>

      <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-app-border">
        <div
          className="h-full rounded-full bg-brand transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-xs text-app-muted">
        <div className="flex items-center gap-3">
          <span>
            <span className="text-white font-medium">{currentDisplay}</span>
            {targetDisplay && <> / {targetDisplay}</>}
            {kpi.unit && <> {kpi.unit}</>}
          </span>
          <span className="text-app-border">·</span>
          <span>{kpi.timePeriod}</span>
        </div>
        <span className="font-semibold text-brand">{Math.round(pct)}%</span>
      </div>

      {kpi.notes && (
        <p className="mt-2 text-xs text-app-muted line-clamp-2 border-t border-app-border pt-2">
          {kpi.notes}
        </p>
      )}
    </div>
  );
}

export function MemberKpiDetailsSlide({ data }: { data: KpiDetailsSlideData }) {
  const subtitle =
    data.totalPages > 1
      ? `Page ${data.pageIndex + 1} of ${data.totalPages}`
      : "All KPIs";

  return (
    <div className="flex min-h-[420px] flex-col">
      <div className="mb-4">
        <h2 className="font-heading text-2xl text-white">KPI Details</h2>
        <p className="mt-1 text-sm text-app-muted">{subtitle}</p>
      </div>

      {data.kpis.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-app-muted">No KPIs to display.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {data.kpis.map((kpi) => (
            <KpiDetailRow key={kpi.name} kpi={kpi} />
          ))}
        </div>
      )}
    </div>
  );
}
