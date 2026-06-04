import type { TasksSlideData, TaskSlideItem } from "@/lib/member-kpi/presentationTypes";

const ROCK_STATUS_STYLES: Record<string, string> = {
  "On Track": "bg-emerald-700 text-slate-100",
  "Off Track": "bg-red-700 text-slate-100",
  Complete: "bg-blue-700 text-slate-100",
};

const TODO_STATUS_STYLES: Record<string, string> = {
  Complete: "bg-blue-700 text-slate-100",
  "On Track": "bg-emerald-700 text-slate-100",
  "Off Track": "bg-red-700 text-slate-100",
};

function StatusBadge({ status, source }: { status: string; source: "Rock" | "To-Do" }) {
  const map = source === "Rock" ? ROCK_STATUS_STYLES : TODO_STATUS_STYLES;
  const cls = map[status] ?? "bg-stone-500 text-slate-100";
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold leading-tight ${cls}`}>
      {status}
    </span>
  );
}

function TaskCard({ task }: { task: TaskSlideItem }) {
  const sourceColor = task.source === "Rock" ? "border-brand/40 bg-brand/5" : "border-app-border bg-app-base";
  const sourceLabel = task.source === "Rock" ? "🪨 Rock" : "✅ To-Do";

  return (
    <div className={`flex items-start justify-between gap-3 rounded-lg border p-3 ${sourceColor}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] text-app-muted">{sourceLabel}</span>
        </div>
        <p className={`text-sm leading-snug ${task.is_complete ? "text-app-muted line-through" : "text-white"}`}>
          {task.title}
        </p>
        {task.due_date && (
          <p className="mt-1 text-[10px] text-app-muted">Due: {task.due_date}</p>
        )}
      </div>
      <div className="shrink-0">
        <StatusBadge status={task.status} source={task.source} />
      </div>
    </div>
  );
}

export function MemberTasksSlide({ data }: { data: TasksSlideData }) {
  const rocks = data.tasks.filter((t) => t.source === "Rock");
  const todos = data.tasks.filter((t) => t.source === "To-Do");

  return (
    <div className="flex min-h-[420px] flex-col">
      <div className="mb-4">
        <h2 className="font-heading text-2xl text-white">Tasks</h2>
        <p className="mt-1 text-sm text-app-muted">
          {data.tasks.length === 0
            ? "No open tasks for this member."
            : `${data.tasks.length} item${data.tasks.length !== 1 ? "s" : ""} — ${rocks.length} rock${rocks.length !== 1 ? "s" : ""}, ${todos.length} to-do${todos.length !== 1 ? "s" : ""}`}
        </p>
      </div>

      {data.tasks.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="rounded-xl border border-app-border bg-app-base p-8 text-center">
            <p className="text-2xl mb-2">🎯</p>
            <p className="text-white font-semibold">No open tasks</p>
            <p className="text-sm text-app-muted mt-1">No rocks or to-dos assigned to this member.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {/* Rocks first */}
          {rocks.map((t) => (
            <TaskCard key={t.id} task={t} />
          ))}
          {/* Then todos */}
          {todos.map((t) => (
            <TaskCard key={t.id} task={t} />
          ))}
        </div>
      )}
    </div>
  );
}
