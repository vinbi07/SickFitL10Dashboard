import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getWeekKey } from "@/lib/sales-tracker/date";
import {
  fetchSalesRepWeekGoals,
  fetchSalesReps,
  fetchSalesWeekEntries,
} from "@/lib/sales-tracker/service";
import type { SalesTrackerInitialData } from "@/lib/sales-tracker/types";

export async function getInitialSalesTrackerData(): Promise<SalesTrackerInitialData> {
  const client = await createSupabaseServerClient();
  const weekStartDate = getWeekKey(new Date());
  const reps = await fetchSalesReps(client);
  const entries = await fetchSalesWeekEntries(client, weekStartDate);
  const goals = await fetchSalesRepWeekGoals(client, weekStartDate);

  return { weekStartDate, reps, entries, goals };
}
