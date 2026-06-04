import type { NextStepsSlideData, TaskSlideItem } from "@/lib/member-kpi/presentationTypes";
import type { SlideKpi } from "@/lib/member-kpi/slideHelper";

function KpiAttentionCard({ kpi, urgency }: { kpi: SlideKpi; urgency: "behind" | "at-risk" }) {
  const pct = Math.min(100, Math.max(0, kpi.progress));
  const barColor = urgency === "behind" ? "bg-red-600" : "bg-amber-500";
  const labelColor = urgency === "behind" ? "text-red-500" : "text-amber-500";
  const label = urgency === "behind" ? "Behind" : "At Risk";

  return (
    <div className="rounded-xl border border-app-border bg-app-base p-4">
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="font-semibold text-white leading-snug text-sm">{kpi.name}</p>
        <span className={`shrink-0 text-xs font-semibold ${labelColor}`}>{label}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-app-border">
        <div
          className={`h-full rounded-full ${barColor} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1.5 text-xs text-app-muted">{Math.round(pct)}% complete</p>
    </div>
  );
}

function OpenTaskRow({ task }: { task: TaskSlideItem }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-app-border bg-app-base px-3 py-2">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white leading-snug">{task.title}</p>
        {task.due_date && (
          <p className="text-[10px] text-app-muted">Due {task.due_date}</p>
        )}
      </div>
      <span className="shrink-0 text-[10px] text-app-muted">{task.source}</span>
    </div>
  );
}

export function MemberNextStepsSlide({ data }: { data: NextStepsSlideData }) {
  const hasIssues = !data.allOnTrack || data.openTasks.length > 0;

  if (!hasIssues) {
    return (
      <div className="flex min-h-[420px] flex-col">
        <div className="mb-6">
          <h2 className="font-heading text-2xl text-white">Next Steps</h2>
          <p className="mt-1 text-sm text-app-muted">Follow-up actions and focus areas</p>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="rounded-2xl border border-emerald-700/40 bg-emerald-700/10 p-10 text-center">
            <p className="text-4xl mb-3">🎉</p>
            <p className="font-heading text-xl text-emerald-400">All KPIs On Track or Complete</p>
            <p className="mt-2 text-sm text-app-muted">
              No KPIs need immediate attention. Keep up the great work!
            </p>
            {data.openTasks.length === 0 && (
              <p className="mt-1 text-sm text-app-muted">No open tasks remaining.</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[420px] flex-col">
      <div className="mb-4">
        <h2 className="font-heading text-2xl text-white">Next Steps</h2>
        <p className="mt-1 text-sm text-app-muted">KPIs needing attention and open tasks</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* KPIs needing attention */}
        {(data.behindKpis.length > 0 || data.atRiskKpis.length > 0) && (
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-app-muted">
              KPIs Needing Attention
            </h3>
            <div className="flex flex-col gap-2">
              {data.behindKpis.map((k) => (
                <KpiAttentionCard key={k.name} kpi={k} urgency="behind" />
              ))}
              {data.atRiskKpis.map((k) => (
                <KpiAttentionCard key={k.name} kpi={k} urgency="at-risk" />
              ))}
            </div>
          </div>
        )}

        {/* Open tasks */}
        {data.openTasks.length > 0 && (
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-app-muted">
              Open Tasks
            </h3>
            <div className="flex flex-col gap-2">
              {data.openTasks.map((t) => (
                <OpenTaskRow key={t.id} task={t} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Recommended actions callout */}
      <div className="mt-4 rounded-xl border border-brand/30 bg-brand/5 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand mb-1">
          Recommended Follow-Up
        </p>
        <ul className="flex flex-col gap-1">
          {data.behindKpis.map((k) => (
            <li key={k.name} className="text-sm text-white">
              · Review blockers for <span className="font-semibold">{k.name}</span>
            </li>
          ))}
          {data.atRiskKpis.map((k) => (
            <li key={k.name} className="text-sm text-white">
              · Monitor progress on <span className="font-semibold">{k.name}</span>
            </li>
          ))}
          {data.openTasks.length > 0 && (
            <li className="text-sm text-white">
              · Clear {data.openTasks.length} open task{data.openTasks.length !== 1 ? "s" : ""} before next review
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
