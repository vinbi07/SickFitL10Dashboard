import type { KpiProgressSlideData } from "@/lib/member-kpi/presentationTypes";
import type { SlideKpi } from "@/lib/member-kpi/slideHelper";

const STATUS_STYLES: Record<string, string> = {
  "On Track": "bg-emerald-700 text-slate-100",
  "At Risk": "bg-amber-600 text-slate-100",
  Behind: "bg-red-700 text-slate-100",
  Complete: "bg-blue-700 text-slate-100",
  Paused: "bg-stone-500 text-slate-100",
};

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_STYLES[status] ?? "bg-stone-500 text-slate-100";
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-[11px] font-semibold leading-tight ${cls}`}>
      {status}
    </span>
  );
}

function KpiProgressCard({ kpi }: { kpi: SlideKpi }) {
  const pct = Math.min(100, Math.max(0, kpi.progress));
  const isYesNo = kpi.goalType === "Yes / No";
  const displayValue = isYesNo
    ? kpi.status === "Complete" ? "Yes" : "No"
    : kpi.current != null
      ? kpi.unit ? `${kpi.current} ${kpi.unit}` : String(kpi.current)
      : "—";
  const targetValue = isYesNo
    ? null
    : kpi.target != null
      ? kpi.unit ? `${kpi.target} ${kpi.unit}` : String(kpi.target)
      : null;

  return (
    <div className="rounded-xl border border-app-border bg-app-base p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <p className="font-semibold text-white leading-tight">{kpi.name}</p>
        <StatusBadge status={kpi.status} />
      </div>

      <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-app-border">
        <div
          className="h-full rounded-full bg-brand transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex items-baseline justify-between text-xs text-app-muted">
        <span className="font-semibold text-white text-sm">{displayValue}</span>
        {targetValue && <span>of {targetValue}</span>}
        <span className="ml-auto text-brand font-semibold">{Math.round(pct)}%</span>
      </div>
    </div>
  );
}

export function MemberKpiProgressSlide({ data }: { data: KpiProgressSlideData }) {
  return (
    <div className="flex min-h-[420px] flex-col">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h2 className="font-heading text-2xl text-white">KPI Progress Snapshot</h2>
          <p className="mt-1 text-sm text-app-muted">Top KPIs at a glance</p>
        </div>
        <div className="flex flex-col gap-1 text-right text-xs">
          {data.topKpi && (
            <span className="text-emerald-500">
              ✓ Best: <span className="font-semibold">{data.topKpi}</span>
            </span>
          )}
          {data.needsAttention && (
            <span className="text-amber-500">
              ⚠ Attention: <span className="font-semibold">{data.needsAttention}</span>
            </span>
          )}
        </div>
      </div>

      {data.kpis.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-app-muted">No KPIs added yet for this member.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.kpis.map((kpi) => (
            <KpiProgressCard key={kpi.name} kpi={kpi} />
          ))}
        </div>
      )}
    </div>
  );
}
