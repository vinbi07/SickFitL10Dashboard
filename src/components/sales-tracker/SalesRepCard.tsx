import {
  calculateRepStats,
  formatMoney,
} from "@/lib/sales-tracker/calculations";
import type {
  SalesDayEntry,
  SalesRepRow,
} from "@/lib/sales-tracker/types";
import { SalesDayTile } from "@/components/sales-tracker/SalesDayTile";

interface SalesRepCardProps {
  rep: SalesRepRow;
  entries: SalesDayEntry[];
  weekEntries: SalesDayEntry[];
  todayKey: string;
  onNameChange: (value: string) => void;
  onGoalChange: (value: string) => void;
  onRepSave: (rep: SalesRepRow) => void;
  onDelete: () => void;
  onAmountChange: (entry: SalesDayEntry, value: string) => void;
  onNoteChange: (entry: SalesDayEntry, value: string) => void;
  onEntrySave: (entry: SalesDayEntry) => void;
}

export function SalesRepCard({
  rep,
  entries,
  weekEntries,
  todayKey,
  onNameChange,
  onGoalChange,
  onRepSave,
  onDelete,
  onAmountChange,
  onNoteChange,
  onEntrySave,
}: SalesRepCardProps) {
  const stats = calculateRepStats(rep, entries);
  const tileEntries = weekEntries.map(
    (_, index) => entries[index] ?? weekEntries[index],
  );

  return (
    <article className="rounded-2xl border border-app-border bg-app-panel p-4 shadow-2xl shadow-black/10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <label className="block min-w-0 flex-1">
          <span className="sr-only">Sales rep name</span>
          <input
            value={rep.name}
            onChange={(event) => onNameChange(event.target.value)}
            onBlur={() => onRepSave(rep)}
            className="w-full max-w-sm rounded-lg border border-transparent bg-transparent px-0 py-1 font-heading text-2xl uppercase text-white outline-none transition focus:border-app-border focus:px-2"
            aria-label="Sales rep name"
          />
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-app-muted">
            <span className="text-xs font-semibold uppercase tracking-[0.12em]">
              Daily goal
            </span>
            <span className="font-semibold text-white">$</span>
            <input
              type="number"
              min="0"
              value={rep.daily_goal}
              onChange={(event) => onGoalChange(event.target.value)}
              onBlur={() => onRepSave(rep)}
              className="w-24 rounded-lg border border-app-border bg-app-base px-2 py-2 text-right text-sm font-semibold text-white"
              aria-label={`${rep.name} daily sales goal`}
            />
          </label>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-lg border border-[#e72027]/70 px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#ff7c82] transition hover:bg-[#e72027]/10 hover:text-brand"
            aria-label={`Delete ${rep.name} from sales tracker`}
          >
            Delete
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-[repeat(3,minmax(0,1fr))] gap-2 md:grid-cols-[repeat(3,minmax(0,120px))_1fr] md:items-end md:gap-3">
        <div>
          <p className="font-heading text-xl text-white sm:text-2xl md:text-3xl">
            {formatMoney(stats.total)}
          </p>
          <p className="text-[10px] uppercase tracking-[0.1em] text-app-muted sm:text-xs sm:tracking-[0.12em]">
            This week
          </p>
        </div>
        <div>
          <p className="font-heading text-xl text-emerald-400 sm:text-2xl md:text-3xl">
            {stats.daysHit}
          </p>
          <p className="text-[10px] uppercase tracking-[0.1em] text-app-muted sm:text-xs sm:tracking-[0.12em]">
            Days hit
          </p>
        </div>
        <div>
          <p className="font-heading text-xl text-white sm:text-2xl md:text-3xl">
            {stats.daysLogged}
          </p>
          <p className="text-[10px] uppercase tracking-[0.1em] text-app-muted sm:text-xs sm:tracking-[0.12em]">
            Days logged
          </p>
        </div>
        <div className="col-span-3 min-w-0 md:col-span-1">
          <div className="h-2.5 overflow-hidden rounded-full bg-app-border">
            <div
              className="h-full rounded-full bg-emerald-500 transition-[width]"
              style={{ width: `${stats.progressWidth}%` }}
            />
          </div>
          <p className="mt-2 text-xs uppercase tracking-[0.12em] text-app-muted">
            {stats.percentOfGoal}% of goal for days logged
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-7">
        {tileEntries.map((entry) => (
          <SalesDayTile
            key={`${entry.rep_id}-${entry.day_index}`}
            entry={entry}
            goal={rep.daily_goal}
            isToday={entry.entry_date === todayKey}
            onAmountChange={(value) => onAmountChange(entry, value)}
            onNoteChange={(value) => onNoteChange(entry, value)}
            onSave={() => onEntrySave(entry)}
            repName={rep.name}
          />
        ))}
      </div>
    </article>
  );
}
