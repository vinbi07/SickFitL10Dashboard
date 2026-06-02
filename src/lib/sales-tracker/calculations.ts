import { getEntryDate } from "@/lib/sales-tracker/date";
import type {
  SalesDayEntry,
  SalesDayStatus,
  SalesRepWeekGoalRow,
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

export function calculateRepStats(
  rep: SalesRepRow,
  entries: SalesDayEntry[],
  referralPartnersGoal = 0,
) {
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
  const weeklyMoneyGoal = goal * 7;
  const moneyGoalPercent =
    weeklyMoneyGoal > 0 ? Math.round((total / weeklyMoneyGoal) * 100) : 0;
  const referralPartnersAdded = entries.reduce(
    (sum, entry) => sum + Number(entry.referral_partners_added || 0),
    0,
  );
  const referralGoalPercent =
    referralPartnersGoal > 0
      ? Math.round((referralPartnersAdded / referralPartnersGoal) * 100)
      : 0;
  const activeGoalCount =
    (weeklyMoneyGoal > 0 ? 1 : 0) + (referralPartnersGoal > 0 ? 1 : 0);
  const overallPercent =
    activeGoalCount > 0
      ? Math.round(
          ((weeklyMoneyGoal > 0 ? moneyGoalPercent : 0) +
            (referralPartnersGoal > 0 ? referralGoalPercent : 0)) /
            activeGoalCount,
        )
      : 0;

  return {
    total,
    daysHit,
    daysLogged,
    percentOfGoal,
    progressWidth: Math.min(100, percentOfGoal),
    weeklyMoneyGoal,
    moneyGoalPercent,
    referralPartnersAdded,
    referralPartnersGoal,
    referralGoalPercent,
    overallPercent,
  };
}

export function calculateTeamStats(
  reps: SalesRepWithEntries[],
  goals: SalesRepWeekGoalRow[] = [],
) {
  return reps.reduce(
    (team, item) => {
      const stats = calculateRepStats(item.rep, item.entries);
      const referralGoal =
        goals.find((goal) => goal.rep_id === item.rep.id)
          ?.referral_partners_goal ?? 0;
      return {
        total: team.total + stats.total,
        weeklyGoal: team.weeklyGoal + (Number(item.rep.daily_goal) || 0) * 7,
        daysHit: team.daysHit + stats.daysHit,
        daysLogged: team.daysLogged + stats.daysLogged,
        referralPartnersAdded:
          team.referralPartnersAdded +
          item.entries.reduce(
            (sum, entry) => sum + Number(entry.referral_partners_added || 0),
            0,
          ),
        referralPartnersGoal: team.referralPartnersGoal + referralGoal,
      };
    },
    {
      total: 0,
      weeklyGoal: 0,
      daysHit: 0,
      daysLogged: 0,
      referralPartnersAdded: 0,
      referralPartnersGoal: 0,
    },
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
    referral_partners_added: 0,
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
          referral_partners_added: entry.referral_partners_added,
        };
      });

    return { rep, entries: weekEntries };
  });
}
