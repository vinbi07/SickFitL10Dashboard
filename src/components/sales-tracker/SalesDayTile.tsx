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
  featured?: boolean;
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
  featured = false,
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
  const tileClass = featured
    ? "rounded-xl border p-4"
    : "min-w-0 rounded-lg border p-1.5 md:rounded-xl md:p-3";
  const dayClass = featured
    ? "font-heading text-lg uppercase tracking-[0.08em] text-white"
    : "font-heading text-[10px] uppercase tracking-[0.04em] text-white md:text-sm md:tracking-[0.08em]";
  const dateClass = featured
    ? "text-sm text-app-muted"
    : "text-[9px] leading-none text-app-muted md:text-xs";
  const fieldLabelClass = featured
    ? "pl-2 text-sm font-semibold text-app-muted"
    : "pl-1 text-[10px] font-semibold text-app-muted md:pl-2 md:text-sm";
  const inputClass = featured
    ? "min-w-0 flex-1 border-0 bg-transparent px-1 py-2 text-base font-semibold text-white outline-none"
    : "min-w-0 flex-1 border-0 bg-transparent px-0.5 py-1 text-[11px] font-semibold text-white outline-none md:px-1 md:py-2 md:text-sm";
  const statusTextClass = featured
    ? "mt-3 text-sm font-bold uppercase tracking-[0.14em]"
    : "mt-1 text-[9px] font-bold uppercase tracking-[0.08em] md:mt-3 md:text-xs md:tracking-[0.16em]";

  return (
    <div
      className={`${tileClass} transition ${statusClass} ${
        isToday ? "ring-2 ring-brand ring-offset-2 ring-offset-app-panel" : ""
      }`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className={dayClass}>
          {SALES_TRACKER_DAYS[entry.day_index]}
        </p>
        <p className={dateClass}>
          {formatShortDate(entry.entry_date)}
        </p>
      </div>

      <label className={`${featured ? "mt-4" : "mt-2 md:mt-3"} flex items-center overflow-hidden rounded border border-app-border bg-app-panel md:rounded-lg`}>
        <span className={fieldLabelClass}>
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
          className={inputClass}
          aria-label={`${repName} sales amount for ${SALES_TRACKER_DAYS[entry.day_index]}`}
        />
      </label>

      <div className={featured ? "mt-2" : "mt-1 md:mt-2"}>
        <label className="flex items-center overflow-hidden rounded border border-app-border bg-app-panel md:rounded-lg">
          <span className={featured ? "pl-2 text-xs font-semibold uppercase text-app-muted" : "pl-1 text-[9px] font-semibold uppercase text-app-muted md:pl-2 md:text-[10px]"}>
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
            className={inputClass}
            aria-label={`${repName} referral partners added on ${SALES_TRACKER_DAYS[entry.day_index]}`}
          />
        </label>
      </div>

      <label className={`${featured ? "mt-3" : "mt-1 md:mt-2"} block`}>
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
          className={featured ? "w-full border-0 border-b border-app-border bg-transparent px-0 py-1 text-sm text-white outline-none placeholder:text-app-muted focus:border-brand" : "w-full border-0 border-b border-app-border bg-transparent px-0 py-0.5 text-[9px] text-white outline-none placeholder:text-app-muted focus:border-brand md:py-1 md:text-xs"}
          aria-label={`${repName} note for ${SALES_TRACKER_DAYS[entry.day_index]}`}
        />
      </label>

      <p className={statusTextClass}>
        {statusLabel}
      </p>
    </div>
  );
}
