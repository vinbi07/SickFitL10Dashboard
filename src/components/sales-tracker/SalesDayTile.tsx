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
  onReferralPartnersChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  onSave: () => void;
}

export function SalesDayTile({
  entry,
  goal,
  repName,
  isToday,
  onAmountChange,
  onReferralPartnersChange,
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
      className={`min-w-0 rounded-lg border p-1.5 transition md:rounded-xl md:p-3 ${statusClass} ${
        isToday ? "ring-2 ring-brand ring-offset-2 ring-offset-app-panel" : ""
      }`}
    >
      <div className="flex flex-col gap-0.5 md:flex-row md:items-baseline md:justify-between md:gap-2">
        <p className="font-heading text-[10px] uppercase tracking-[0.04em] text-white md:text-sm md:tracking-[0.08em]">
          {SALES_TRACKER_DAYS[entry.day_index]}
        </p>
        <p className="text-[9px] leading-none text-app-muted md:text-xs">
          {formatShortDate(entry.entry_date)}
        </p>
      </div>

      <label className="mt-2 flex items-center overflow-hidden rounded border border-app-border bg-app-panel md:mt-3 md:rounded-lg">
        <span className="pl-1 text-[10px] font-semibold text-app-muted md:pl-2 md:text-sm">
          $
        </span>
        <input
          type="number"
          min="0"
          inputMode="decimal"
          value={entry.amount ?? ""}
          onChange={(event) => onAmountChange(event.target.value)}
          onBlur={onSave}
          placeholder="0"
          className="min-w-0 flex-1 border-0 bg-transparent px-0.5 py-1 text-[11px] font-semibold text-white outline-none md:px-1 md:py-2 md:text-sm"
          aria-label={`${repName} sales amount for ${SALES_TRACKER_DAYS[entry.day_index]}`}
        />
      </label>

      <label className="mt-1 flex items-center overflow-hidden rounded border border-app-border bg-app-panel md:mt-2 md:rounded-lg">
        <span className="pl-1 text-[9px] font-semibold uppercase text-app-muted md:pl-2 md:text-[10px]">
          RP
        </span>
        <input
          type="number"
          min="0"
          inputMode="numeric"
          value={entry.referral_partners_added}
          onChange={(event) => onReferralPartnersChange(event.target.value)}
          onBlur={onSave}
          placeholder="0"
          className="min-w-0 flex-1 border-0 bg-transparent px-0.5 py-1 text-[11px] font-semibold text-white outline-none md:px-1 md:py-2 md:text-sm"
          aria-label={`${repName} referral partners added on ${SALES_TRACKER_DAYS[entry.day_index]}`}
        />
      </label>

      <label className="mt-1 block md:mt-2">
        <span className="sr-only">
          {repName} note for {SALES_TRACKER_DAYS[entry.day_index]}
        </span>
        <input
          type="text"
          maxLength={42}
          value={entry.note}
          onChange={(event) => onNoteChange(event.target.value)}
          onBlur={onSave}
          placeholder="note"
          className="w-full border-0 border-b border-app-border bg-transparent px-0 py-0.5 text-[9px] text-white outline-none placeholder:text-app-muted focus:border-brand md:py-1 md:text-xs"
          aria-label={`${repName} note for ${SALES_TRACKER_DAYS[entry.day_index]}`}
        />
      </label>

      <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.08em] md:mt-3 md:text-xs md:tracking-[0.16em]">
        {statusLabel}
      </p>
    </div>
  );
}
