interface ClearWeekButtonProps {
  disabled: boolean;
  onClear: () => void;
}

export function ClearWeekButton({ disabled, onClear }: ClearWeekButtonProps) {
  return (
    <button
      type="button"
      onClick={onClear}
      disabled={disabled}
      className="rounded-lg border border-app-border px-3 py-2 text-sm font-semibold text-app-muted transition hover:border-[#e72027] hover:bg-[#e72027]/10 hover:text-brand disabled:cursor-wait disabled:opacity-60"
      aria-label="Clear entries for the selected week"
    >
      Clear this week
    </button>
  );
}
