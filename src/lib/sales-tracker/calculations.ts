import { getEntryDate } from "@/lib/sales-tracker/date";
import type {
  SalesDayEntry,
  SalesDayStatus,
  SalesRepRow,
  SalesRepWithEntries,
  SalesWeekEntryRow,
} from "@/lib/sales-tracker/types";

export function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function getDayStatus(amount: number | null, goal: number): SalesDayStatus {
  if (amount === null) {
    return "empty";
  }

  return amount >= goal ? "hit" : "miss";
}

export function getStatusLabel(status: SalesDayStatus) {
  if (status === "hit") return "Hit";
  if (status === "miss") return "Miss";
  return "Log it";
}

export function calculateRepStats(rep: SalesRepRow, entries: SalesDayEntry[]) {
  const goal = Number(rep.daily_goal) || 0;
  const loggedEntries = entries.filter((entry) => entry.amount !== null);
  const total = loggedEntries.reduce(
    (sum, entry) => sum + Number(entry.amount ?? 0),
    0,
  );
  const daysLogged = loggedEntries.length;
  const daysHit = loggedEntries.filter(
    (entry) => Number(entry.amount ?? 0) >= goal,
  ).length;
  const target = goal * daysLogged;
  const percentOfGoal = target > 0 ? Math.round((total / target) * 100) : 0;

  return {
    total,
    daysHit,
    daysLogged,
    percentOfGoal,
    progressWidth: Math.min(100, percentOfGoal),
  };
}

export function calculateTeamStats(reps: SalesRepWithEntries[]) {
  return reps.reduce(
    (team, item) => {
      const stats = calculateRepStats(item.rep, item.entries);
      return {
        total: team.total + stats.total,
        daysHit: team.daysHit + stats.daysHit,
        daysLogged: team.daysLogged + stats.daysLogged,
      };
    },
    { total: 0, daysHit: 0, daysLogged: 0 },
  );
}

export function createEmptyWeekEntries(
  rep: SalesRepRow,
  weekStartDate: string,
): SalesDayEntry[] {
  return Array.from({ length: 7 }, (_, dayIndex) => ({
    rep_id: rep.id,
    week_start_date: weekStartDate,
    entry_date: getEntryDate(weekStartDate, dayIndex),
    day_index: dayIndex,
    amount: null,
    note: "",
  }));
}

export function composeRepsWithEntries(
  reps: SalesRepRow[],
  entries: SalesWeekEntryRow[],
  weekStartDate: string,
): SalesRepWithEntries[] {
  return reps.map((rep) => {
    const weekEntries = createEmptyWeekEntries(rep, weekStartDate);

    entries
      .filter((entry) => entry.rep_id === rep.id)
      .forEach((entry) => {
        weekEntries[entry.day_index] = {
          id: entry.id,
          rep_id: entry.rep_id,
          week_start_date: entry.week_start_date,
          entry_date: entry.entry_date,
          day_index: entry.day_index,
          amount: entry.amount,
          note: entry.note,
        };
      });

    return { rep, entries: weekEntries };
  });
}
