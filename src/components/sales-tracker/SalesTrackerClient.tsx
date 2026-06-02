"use client";

import { useMemo, useState } from "react";
import {
  clearSalesWeek,
  createSalesRep,
  deleteSalesRep,
  loadSalesTrackerWeek,
  updateSalesRep,
  upsertSalesDayEntry,
} from "@/lib/sales-tracker/client";
import {
  addDays,
  formatYmd,
  getTodayKey,
  getWeekKey,
  parseYmd,
} from "@/lib/sales-tracker/date";
import {
  composeRepsWithEntries,
  createEmptyWeekEntries,
} from "@/lib/sales-tracker/calculations";
import type {
  SalesDayEntry,
  SalesRepRow,
  SalesTrackerInitialData,
  SalesWeekEntryRow,
} from "@/lib/sales-tracker/types";
import { AddSalesRepForm } from "@/components/sales-tracker/AddSalesRepForm";
import { ClearWeekButton } from "@/components/sales-tracker/ClearWeekButton";
import { SalesTrackerHeader } from "@/components/sales-tracker/SalesTrackerHeader";
import { SalesTrackerLegend } from "@/components/sales-tracker/SalesTrackerLegend";
import { SalesRepCard } from "@/components/sales-tracker/SalesRepCard";
import { TeamSalesSummary } from "@/components/sales-tracker/TeamSalesSummary";

interface SalesTrackerClientProps {
  initialData: SalesTrackerInitialData;
}

type SaveState = "idle" | "saving" | "saved" | "error";

function normalizeAmount(value: string) {
  const trimmed = value.trim();
  if (trimmed === "") return null;

  const amount = Number(trimmed);
  return Number.isFinite(amount) ? Math.max(0, amount) : null;
}

export function SalesTrackerClient({ initialData }: SalesTrackerClientProps) {
  const [weekStartDate, setWeekStartDate] = useState(initialData.weekStartDate);
  const [reps, setReps] = useState(initialData.reps);
  const [entries, setEntries] = useState<SalesWeekEntryRow[]>(
    initialData.entries,
  );
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [isLoadingWeek, setIsLoadingWeek] = useState(false);

  const todayKey = getTodayKey();
  const repsWithEntries = useMemo(
    () => composeRepsWithEntries(reps, entries, weekStartDate),
    [entries, reps, weekStartDate],
  );

  function setLocalEntry(nextEntry: SalesDayEntry) {
    setEntries((current) => {
      const index = current.findIndex(
        (entry) =>
          entry.rep_id === nextEntry.rep_id &&
          entry.week_start_date === nextEntry.week_start_date &&
          entry.day_index === nextEntry.day_index,
      );
      const normalized: SalesWeekEntryRow = {
        id: nextEntry.id ?? `local-${nextEntry.rep_id}-${nextEntry.day_index}`,
        rep_id: nextEntry.rep_id,
        week_start_date: nextEntry.week_start_date,
        entry_date: nextEntry.entry_date,
        day_index: nextEntry.day_index,
        amount: nextEntry.amount,
        note: nextEntry.note,
        created_at: "",
        updated_at: "",
      };

      if (index === -1) {
        return [...current, normalized];
      }

      return current.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, ...normalized } : entry,
      );
    });
  }

  async function loadWeek(nextWeekStartDate: string) {
    setIsLoadingWeek(true);
    setWeekStartDate(nextWeekStartDate);

    try {
      const nextEntries = await loadSalesTrackerWeek(nextWeekStartDate);
      setEntries(nextEntries);
    } catch (error) {
      window.alert(
        `Could not load sales week: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    } finally {
      setIsLoadingWeek(false);
    }
  }

  async function moveWeek(dayDelta: number) {
    const nextDate = formatYmd(addDays(parseYmd(weekStartDate), dayDelta));
    await loadWeek(nextDate);
  }

  async function saveRep(nextRep: SalesRepRow) {
    setSaveState("saving");
    setReps((current) =>
      current.map((rep) => (rep.id === nextRep.id ? nextRep : rep)),
    );

    try {
      const savedRep = await updateSalesRep(nextRep);
      setReps((current) =>
        current.map((rep) => (rep.id === savedRep.id ? savedRep : rep)),
      );
      setSaveState("saved");
    } catch (error) {
      setSaveState("error");
      window.alert(
        `Could not save sales rep: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }

  async function addRep(payload: { name: string; dailyGoal: number }) {
    setSaveState("saving");

    try {
      const sortOrder =
        reps.reduce((max, rep) => Math.max(max, rep.sort_order), -1) + 1;
      const savedRep = await createSalesRep({
        ...payload,
        sortOrder,
      });
      setReps((current) => [...current, savedRep]);
      setSaveState("saved");
    } catch (error) {
      setSaveState("error");
      window.alert(
        `Could not add sales rep: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }

  async function deleteRep(rep: SalesRepRow) {
    const confirmation = window.prompt(
      `Type the Persons name to confirm deleting ${rep.name}.`,
    );

    if (confirmation === null) {
      return;
    }

    if (confirmation.trim() !== rep.name.trim()) {
      window.alert("Name did not match. The person was not deleted.");
      return;
    }

    setSaveState("saving");

    try {
      await deleteSalesRep(rep.id);
      setReps((current) => current.filter((item) => item.id !== rep.id));
      setEntries((current) => current.filter((entry) => entry.rep_id !== rep.id));
      setSaveState("saved");
    } catch (error) {
      setSaveState("error");
      window.alert(
        `Could not delete sales rep: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }

  async function saveEntry(nextEntry: SalesDayEntry) {
    setSaveState("saving");
    setLocalEntry(nextEntry);

    try {
      const savedEntry = await upsertSalesDayEntry(nextEntry);
      setLocalEntry(savedEntry);
      setSaveState("saved");
    } catch (error) {
      setSaveState("error");
      window.alert(
        `Could not save day entry: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }

  async function clearSelectedWeek() {
    const confirmed = window.confirm(
      "Clear all sales entries for this selected week? Reps and other weeks will stay intact.",
    );

    if (!confirmed) {
      return;
    }

    setSaveState("saving");

    try {
      await clearSalesWeek(weekStartDate);
      setEntries([]);
      setSaveState("saved");
    } catch (error) {
      setSaveState("error");
      window.alert(
        `Could not clear this week: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }

  return (
    <main className="min-h-screen bg-app-base p-4 text-white md:p-6">
      <div className="mx-auto max-w-6xl">
        <SalesTrackerHeader
          isLoading={isLoadingWeek}
          onNextWeek={() => void moveWeek(7)}
          onPreviousWeek={() => void moveWeek(-7)}
          onThisWeek={() => void loadWeek(getWeekKey(new Date()))}
          saveState={saveState}
          weekStartDate={weekStartDate}
        />

        <TeamSalesSummary repsWithEntries={repsWithEntries} />

        <AddSalesRepForm
          disabled={isLoadingWeek}
          onAdd={(payload) => addRep(payload)}
        />

        <section className="space-y-4" aria-label="Sales reps">
          {repsWithEntries.map(({ rep, entries: repEntries }) => (
            <SalesRepCard
              key={rep.id}
              entries={repEntries}
              onAmountChange={(entry, value) =>
                setLocalEntry({ ...entry, amount: normalizeAmount(value) })
              }
              onEntrySave={(entry) => void saveEntry(entry)}
              onDelete={() => void deleteRep(rep)}
              onGoalChange={(nextGoal) => {
                const nextRep = {
                  ...rep,
                  daily_goal: Math.max(0, Number(nextGoal) || 0),
                };
                setReps((current) =>
                  current.map((item) =>
                    item.id === nextRep.id ? nextRep : item,
                  ),
                );
              }}
              onNameChange={(nextName) => {
                const nextRep = { ...rep, name: nextName };
                setReps((current) =>
                  current.map((item) =>
                    item.id === nextRep.id ? nextRep : item,
                  ),
                );
              }}
              onRepSave={(nextRep) => void saveRep(nextRep)}
              onNoteChange={(entry, note) => setLocalEntry({ ...entry, note })}
              rep={rep}
              todayKey={todayKey}
              weekEntries={createEmptyWeekEntries(rep, weekStartDate)}
            />
          ))}
        </section>

        <footer className="mt-5 flex flex-col gap-3 rounded-2xl border border-app-border bg-app-panel p-4 sm:flex-row sm:items-center sm:justify-between">
          <SalesTrackerLegend />
          <ClearWeekButton
            disabled={isLoadingWeek}
            onClear={() => void clearSelectedWeek()}
          />
        </footer>

        <p className="mt-4 text-center text-xs text-app-muted">
          Type each rep&apos;s daily sales. Tiles show Hit, Miss, or Log it and
          save automatically when you leave a field.
        </p>
      </div>
    </main>
  );
}
