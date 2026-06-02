import Image from "next/image";
import Link from "next/link";
import { getWeekRangeLabel } from "@/lib/sales-tracker/date";
import { WeekNavigator } from "@/components/sales-tracker/WeekNavigator";

interface SalesTrackerHeaderProps {
  weekStartDate: string;
  saveState: "idle" | "saving" | "saved" | "error";
  isLoading: boolean;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  onThisWeek: () => void;
}

export function SalesTrackerHeader({
  weekStartDate,
  saveState,
  isLoading,
  onPreviousWeek,
  onNextWeek,
  onThisWeek,
}: SalesTrackerHeaderProps) {
  const statusLabel =
    saveState === "saving"
      ? "Saving"
      : saveState === "saved"
        ? "Saved"
        : saveState === "error"
          ? "Save issue"
          : "Ready";

  return (
    <header className="mb-4 overflow-hidden rounded-2xl border border-app-border bg-app-panel">
      <div className="border-b border-app-border bg-black px-4 py-4 md:px-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/SickFit_-_RED.png"
              alt="SickFit logo"
              width={46}
              height={46}
              className="h-11 w-11 rounded-lg object-contain"
            />
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-app-muted">
                SickFit
              </p>
              <h1 className="font-heading text-2xl text-white">
                Sales Floor / Weekly Ticker
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/dashboard"
              className="rounded-lg border border-app-border px-3 py-2 text-sm font-semibold text-app-muted transition hover:border-[#e72027] hover:bg-[#e72027]/10 hover:text-brand"
            >
              Main Dashboard
            </Link>
            <span
              className={`rounded-lg border px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] ${
                saveState === "error"
                  ? "border-[#e72027] text-[#e72027]"
                  : "border-app-border text-app-muted"
              }`}
              role={saveState === "error" ? "alert" : "status"}
            >
              {statusLabel}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-5">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-app-muted">
            Selected Week
          </p>
          <p className="mt-1 font-heading text-xl text-white">
            {getWeekRangeLabel(weekStartDate)}
          </p>
        </div>
        <WeekNavigator
          disabled={isLoading}
          onNextWeek={onNextWeek}
          onPreviousWeek={onPreviousWeek}
          onThisWeek={onThisWeek}
        />
      </div>
    </header>
  );
}
