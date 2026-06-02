"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  clearSalesWeekWithClient,
  createSalesRepWithClient,
  deleteSalesRepWithClient,
  fetchSalesWeekEntries,
  updateSalesRepWithClient,
  upsertSalesDayEntryWithClient,
} from "@/lib/sales-tracker/service";
import type { SalesDayEntry, SalesRepRow } from "@/lib/sales-tracker/types";

export async function loadSalesTrackerWeek(weekStartDate: string) {
  const client = createSupabaseBrowserClient();
  return await fetchSalesWeekEntries(client, weekStartDate);
}

export async function updateSalesRep(rep: SalesRepRow) {
  const client = createSupabaseBrowserClient();
  return await updateSalesRepWithClient(client, rep);
}

export async function createSalesRep(payload: {
  name: string;
  dailyGoal: number;
  sortOrder: number;
}) {
  const client = createSupabaseBrowserClient();
  return await createSalesRepWithClient(client, payload);
}

export async function deleteSalesRep(repId: string) {
  const client = createSupabaseBrowserClient();
  return await deleteSalesRepWithClient(client, repId);
}

export async function upsertSalesDayEntry(entry: SalesDayEntry) {
  const client = createSupabaseBrowserClient();
  return await upsertSalesDayEntryWithClient(client, entry);
}

export async function clearSalesWeek(weekStartDate: string) {
  const client = createSupabaseBrowserClient();
  await clearSalesWeekWithClient(client, weekStartDate);
}
