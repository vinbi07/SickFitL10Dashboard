import { useState } from "react";
import type { FormEvent } from "react";

interface AddSalesRepFormProps {
  disabled: boolean;
  onAdd: (payload: { name: string; dailyGoal: number }) => Promise<void>;
}

export function AddSalesRepForm({ disabled, onAdd }: AddSalesRepFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [dailyGoal, setDailyGoal] = useState("500");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();

    if (!trimmedName) {
      window.alert("Enter a name for the sales rep.");
      return;
    }

    setIsSubmitting(true);

    try {
      await onAdd({
        name: trimmedName,
        dailyGoal: Math.max(0, Number(dailyGoal) || 0),
      });
      setName("");
      setDailyGoal("500");
      setIsOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        disabled={disabled}
        className="rounded-lg border border-app-border bg-app-panel px-3 py-2 text-sm font-semibold text-app-muted transition hover:border-[#e72027] hover:bg-[#e72027]/10 hover:text-brand disabled:cursor-wait disabled:opacity-60"
      >
        Add person
      </button>
    );
  }

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className="w-full rounded-xl border border-app-border bg-app-base p-3"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        <label className="flex-1">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-app-muted">
            Rep name
          </span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-1 w-full rounded-lg border border-app-border bg-app-base px-3 py-2 text-sm font-semibold text-white"
            aria-label="New sales rep name"
            autoFocus
          />
        </label>

        <label className="md:w-40">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-app-muted">
            Daily goal
          </span>
          <div className="mt-1 flex items-center rounded-lg border border-app-border bg-app-base">
            <span className="pl-3 text-sm font-semibold text-app-muted">$</span>
            <input
              type="number"
              min="0"
              value={dailyGoal}
              onChange={(event) => setDailyGoal(event.target.value)}
              className="min-w-0 flex-1 border-0 bg-transparent px-1 py-2 text-right text-sm font-semibold text-white outline-none"
              aria-label="New sales rep daily goal"
            />
          </div>
        </label>

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={disabled || isSubmitting}
            className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#c91b21] disabled:cursor-wait disabled:opacity-60"
          >
            {isSubmitting ? "Adding" : "Add person"}
          </button>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            disabled={isSubmitting}
            className="rounded-lg border border-app-border px-3 py-2 text-sm font-semibold text-app-muted transition hover:border-[#e72027] hover:bg-[#e72027]/10 hover:text-brand disabled:cursor-wait disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}
