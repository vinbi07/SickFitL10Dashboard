"use client";

import { useState } from "react";
import {
  calculateRepStats,
  formatMoney,
} from "@/lib/sales-tracker/calculations";
import { SALES_TRACKER_DAYS } from "@/lib/sales-tracker/date";
import type { SalesDayEntry, SalesRepRow } from "@/lib/sales-tracker/types";
import { SalesDayTile } from "@/components/sales-tracker/SalesDayTile";

interface SalesRepCardProps {
  rep: SalesRepRow;
  entries: SalesDayEntry[];
  weekEntries: SalesDayEntry[];
  referralPartnersGoal: number;
  todayKey: string;
  onNameChange: (value: string) => void;
  onGoalChange: (value: string) => void;
  onRepSave: (rep: SalesRepRow) => void;
  onDelete: () => void;
  onReferralPartnersChange: (entry: SalesDayEntry, value: string) => void;
  onReferralPartnersGoalChange: (value: string) => void;
  onReferralPartnersGoalSave: (value: number) => void;
  onAmountChange: (entry: SalesDayEntry, value: string) => void;
  onNoteChange: (entry: SalesDayEntry, value: string) => void;
  onEntrySave: (entry: SalesDayEntry) => void;
}

export function SalesRepCard({
  rep,
  entries,
  weekEntries,
  referralPartnersGoal,
  todayKey,
  onNameChange,
  onGoalChange,
  onRepSave,
  onDelete,
  onReferralPartnersChange,
  onReferralPartnersGoalChange,
  onReferralPartnersGoalSave,
  onAmountChange,
  onNoteChange,
  onEntrySave,
}: SalesRepCardProps) {
  const stats = calculateRepStats(rep, entries, referralPartnersGoal);
  const tileEntries = weekEntries.map(
    (_, index) => entries[index] ?? weekEntries[index],
  );
  const currentWeekTodayIndex = tileEntries.findIndex(
    (entry) => entry.entry_date === todayKey,
  );
  const visibleWeekKey = tileEntries[0]?.week_start_date ?? "";
  const [selectedDay, setSelectedDay] = useState<{
    weekKey: string;
    dayIndex: number;
  } | null>(null);
  const defaultDayIndex =
    currentWeekTodayIndex === -1 ? 0 : currentWeekTodayIndex;
  const selectedDayIndex =
    selectedDay?.weekKey === visibleWeekKey
      ? selectedDay.dayIndex
      : defaultDayIndex;
  const selectedEntry = tileEntries[selectedDayIndex] ?? tileEntries[0]!;
  function progressCircle(label: string, value: number) {
    const clamped = Math.max(0, Math.min(100, value));

    return (
      <div className="flex flex-col md:flex-row items-center gap-2 rounded-lg border border-app-border bg-app-base p-2 ">
        <div
          className="grid h-12 w-12 place-items-center rounded-full"
          style={{
            background: `conic-gradient(#10b981 ${clamped * 3.6}deg, rgb(var(--foreground-rgb) / 0.12) 0deg)`,
          }}
          aria-label={`${label} progress ${value}%`}
        >
          <div className="grid h-9 w-9 place-items-center rounded-full bg-app-panel">
            <span className="text-[10px] font-bold text-white">{value}%</span>
          </div>
        </div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-app-muted">
          {label}
        </p>
      </div>
    );
  }

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
          <label className="flex items-center gap-2 text-sm text-app-muted">
            <span className="text-xs font-semibold uppercase tracking-[0.12em]">
              RP goal
            </span>
            <input
              type="number"
              min="0"
              value={referralPartnersGoal}
              onChange={(event) =>
                onReferralPartnersGoalChange(event.target.value)
              }
              onBlur={(event) =>
                onReferralPartnersGoalSave(Number(event.target.value) || 0)
              }
              className="w-20 rounded-lg border border-app-border bg-app-base px-2 py-2 text-right text-sm font-semibold text-white"
              aria-label={`${rep.name} daily referral partner goal`}
            />
          </label>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2 md:grid-cols-[repeat(4,minmax(0,112px))_1fr] md:items-end md:gap-3">
        <div>
          <p className="font-heading text-lg text-white sm:text-2xl md:text-3xl">
            {formatMoney(stats.total)}
          </p>
          <p className="text-[10px] uppercase tracking-[0.1em] text-app-muted sm:text-xs sm:tracking-[0.12em]">
            This week
          </p>
        </div>
        <div>
          <p className="font-heading text-lg text-emerald-400 sm:text-2xl md:text-3xl">
            {stats.daysHit}
          </p>
          <p className="text-[10px] uppercase tracking-[0.1em] text-app-muted sm:text-xs sm:tracking-[0.12em]">
            Days hit
          </p>
        </div>
        <div>
          <p className="font-heading text-lg text-white sm:text-2xl md:text-3xl">
            {stats.daysLogged}
          </p>
          <p className="text-[10px] uppercase tracking-[0.1em] text-app-muted sm:text-xs sm:tracking-[0.12em]">
            Days logged
          </p>
        </div>
        <div>
          <p
            className="font-heading text-lg text-white sm:text-2xl md:text-3xl"
            aria-label={`${rep.name} referral partners added to network this week`}
          >
            {stats.referralPartnersAdded} / {stats.referralPartnersGoal}
          </p>
          <p className="text-[10px] uppercase tracking-[0.1em] text-app-muted sm:text-xs sm:tracking-[0.12em]">
            Partners
          </p>
        </div>
        <div className="col-span-4 grid min-w-0 grid-cols-3 gap-2 md:col-span-1">
          {progressCircle("Overall", stats.overallPercent)}
          {progressCircle("Money", stats.moneyGoalPercent)}
          {progressCircle("RP", stats.referralGoalPercent)}
        </div>
      </div>

      <div className="mt-4 md:hidden">
        <div className="mb-2 grid grid-cols-7 gap-1">
          {tileEntries.map((entry) => (
            <button
              key={`${entry.rep_id}-${entry.day_index}-switch`}
              type="button"
              onClick={() =>
                setSelectedDay({
                  weekKey: visibleWeekKey,
                  dayIndex: entry.day_index,
                })
              }
              className={`rounded-lg border px-1 py-1 text-[9px] font-semibold uppercase tracking-[0.04em] transition ${
                selectedDayIndex === entry.day_index
                  ? "border-brand bg-[#e72027]/10 text-brand"
                  : "border-app-border bg-app-base text-app-muted"
              }`}
              aria-label={`Show ${SALES_TRACKER_DAYS[entry.day_index]} for ${rep.name}`}
            >
              {SALES_TRACKER_DAYS[entry.day_index]}
            </button>
          ))}
        </div>
        <SalesDayTile
          entry={selectedEntry}
          featured
          goal={rep.daily_goal}
          isToday={selectedEntry.entry_date === todayKey}
          onAmountChange={(value) => onAmountChange(selectedEntry, value)}
          onReferralPartnersChange={(value) =>
            onReferralPartnersChange(selectedEntry, value)
          }
          onNoteChange={(value) => onNoteChange(selectedEntry, value)}
          onSave={() => onEntrySave(selectedEntry)}
          repName={rep.name}
        />
      </div>

      <div className="mt-4 hidden grid-cols-7 gap-1 md:grid md:gap-2">
        {tileEntries.map((entry) => (
          <SalesDayTile
            key={`${entry.rep_id}-${entry.day_index}`}
            entry={entry}
            goal={rep.daily_goal}
            isToday={entry.entry_date === todayKey}
            onAmountChange={(value) => onAmountChange(entry, value)}
            onReferralPartnersChange={(value) =>
              onReferralPartnersChange(entry, value)
            }
            onNoteChange={(value) => onNoteChange(entry, value)}
            onSave={() => onEntrySave(entry)}
            repName={rep.name}
          />
        ))}
      </div>
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={onDelete}
          className="rounded-lg border border-[#e72027]/70 px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#ff7c82] transition hover:bg-[#e72027]/10 hover:text-brand"
          aria-label={`Delete ${rep.name} from sales tracker`}
        >
          Delete User
        </button>
      </div>
    </article>
  );
}
