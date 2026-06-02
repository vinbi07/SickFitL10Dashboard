import {
  getDayStatus,
  getStatusLabel,
} from "@/lib/sales-tracker/calculations";
import {
  formatShortDate,
  SALES_TRACKER_DAYS,
} from "@/lib/sales-tracker/date";
import type { SalesDayEntry } from "@/lib/sales-tracker/types";

interface SalesDayTileProps {
  entry: SalesDayEntry;
  goal: number;
  repName: string;
  isToday: boolean;
  onAmountChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  onSave: () => void;
}

export function SalesDayTile({
  entry,
  goal,
  repName,
  isToday,
  onAmountChange,
  onNoteChange,
  onSave,
}: SalesDayTileProps) {
  const status = getDayStatus(entry.amount, goal);
  const statusLabel = getStatusLabel(status);
  const statusClass =
    status === "hit"
      ? "border-emerald-700 bg-emerald-500/12 text-emerald-400"
      : status === "miss"
        ? "border-[#e72027] bg-[#e72027]/12 text-[#ff7c82]"
        : "border-dashed border-app-border bg-app-base text-app-muted";

  return (
    <div
      className={`min-w-0 rounded-xl border p-3 transition ${statusClass} ${
        isToday ? "ring-2 ring-brand ring-offset-2 ring-offset-app-panel" : ""
      }`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-heading text-sm uppercase tracking-[0.08em] text-white">
          {SALES_TRACKER_DAYS[entry.day_index]}
        </p>
        <p className="text-xs text-app-muted">{formatShortDate(entry.entry_date)}</p>
      </div>

      <label className="mt-3 flex items-center overflow-hidden rounded-lg border border-app-border bg-app-panel">
        <span className="pl-2 text-sm font-semibold text-app-muted">$</span>
        <input
          type="number"
          min="0"
          inputMode="decimal"
          value={entry.amount ?? ""}
          onChange={(event) => onAmountChange(event.target.value)}
          onBlur={onSave}
          placeholder="0"
          className="min-w-0 flex-1 border-0 bg-transparent px-1 py-2 text-sm font-semibold text-white outline-none"
          aria-label={`${repName} sales amount for ${SALES_TRACKER_DAYS[entry.day_index]}`}
        />
      </label>

      <label className="mt-2 block">
        <span className="sr-only">
          {repName} note for {SALES_TRACKER_DAYS[entry.day_index]}
        </span>
        <input
          type="text"
          maxLength={42}
          value={entry.note}
          onChange={(event) => onNoteChange(event.target.value)}
          onBlur={onSave}
          placeholder="note (who / source)"
          className="w-full border-0 border-b border-app-border bg-transparent px-0 py-1 text-xs text-white outline-none placeholder:text-app-muted focus:border-brand"
          aria-label={`${repName} note for ${SALES_TRACKER_DAYS[entry.day_index]}`}
        />
      </label>

      <p className="mt-3 text-xs font-bold uppercase tracking-[0.16em]">
        {statusLabel}
      </p>
    </div>
  );
}
