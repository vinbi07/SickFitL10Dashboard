interface WeekNavigatorProps {
  disabled: boolean;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  onThisWeek: () => void;
}

export function WeekNavigator({
  disabled,
  onPreviousWeek,
  onNextWeek,
  onThisWeek,
}: WeekNavigatorProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={onPreviousWeek}
        disabled={disabled}
        className="h-10 w-10 rounded-lg border border-app-border bg-app-base text-lg font-bold text-white transition hover:border-[#e72027] disabled:cursor-wait disabled:opacity-60"
        aria-label="Previous week"
      >
        &lsaquo;
      </button>
      <button
        type="button"
        onClick={onNextWeek}
        disabled={disabled}
        className="h-10 w-10 rounded-lg border border-app-border bg-app-base text-lg font-bold text-white transition hover:border-[#e72027] disabled:cursor-wait disabled:opacity-60"
        aria-label="Next week"
      >
        &rsaquo;
      </button>
      <button
        type="button"
        onClick={onThisWeek}
        disabled={disabled}
        className="rounded-lg border border-app-border px-3 py-2 text-sm font-semibold uppercase tracking-[0.08em] text-app-muted transition hover:border-[#e72027] hover:bg-[#e72027]/10 hover:text-brand disabled:cursor-wait disabled:opacity-60"
        aria-label="This week"
      >
        This week
      </button>
    </div>
  );
}
