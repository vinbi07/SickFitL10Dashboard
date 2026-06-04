import type { OverviewSlideData } from "@/lib/member-kpi/presentationTypes";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return (parts[0]?.[0] ?? "?").toUpperCase();
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
}

function clamp(n: number): number {
  return Math.min(100, Math.max(0, n));
}

interface StatBoxProps {
  label: string;
  value: number;
  color: string;
}

function StatBox({ label, value, color }: StatBoxProps) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-app-border bg-app-base px-4 py-4 text-center">
      <span className={`font-heading text-3xl font-bold ${color}`}>{value}</span>
      <span className="mt-1 text-xs text-app-muted">{label}</span>
    </div>
  );
}

export function MemberOverviewSlide({ data }: { data: OverviewSlideData }) {
  const pct = clamp(data.overallProgress);
  const accent = data.accentColor ?? "#e72027";

  return (
    <div className="flex min-h-[420px] flex-col">
      <p className="mb-6 text-[10px] uppercase tracking-[0.18em] text-app-muted">
        SickFit Nexus · Member KPI Trackers
      </p>

      {/* Member identity + progress number */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <div
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-xl font-bold text-slate-100"
            style={{ backgroundColor: accent }}
          >
            {getInitials(data.memberName)}
          </div>
          <div>
            <h2 className="font-heading text-3xl text-white">{data.memberName}</h2>
            {data.role && (
              <p className="mt-0.5 text-sm text-app-muted">{data.role}</p>
            )}
          </div>
        </div>

        <div className="text-right">
          <p className="font-heading text-6xl font-bold" style={{ color: accent }}>
            {data.overallProgress}%
          </p>
          <p className="text-sm text-app-muted">Overall Progress</p>
        </div>
      </div>

      {/* Overall progress bar */}
      <div className="mt-6 h-3 w-full overflow-hidden rounded-full bg-app-border">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: accent }}
        />
      </div>

      {/* KPI status stats */}
      <div className="mt-6 grid grid-cols-5 gap-3">
        <StatBox label="On Track" value={data.onTrack} color="text-emerald-500" />
        <StatBox label="At Risk" value={data.atRisk} color="text-amber-500" />
        <StatBox label="Behind" value={data.behind} color="text-red-500" />
        <StatBox label="Complete" value={data.complete} color="text-blue-500" />
        <StatBox label="Paused" value={data.paused} color="text-stone-400" />
      </div>

      {/* Footer */}
      <div className="mt-auto flex items-end justify-between pt-8">
        <p className="text-xs text-app-muted">{data.reportingPeriod}</p>
        <p className="text-xs text-app-muted">{data.totalKpis} KPI{data.totalKpis !== 1 ? "s" : ""} tracked</p>
      </div>
    </div>
  );
}
