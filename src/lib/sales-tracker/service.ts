import { getEntryDate } from "@/lib/sales-tracker/date";
import type {
  SalesDayEntry,
  SalesRepRow,
  SalesWeekEntryRow,
} from "@/lib/sales-tracker/types";

type SalesTrackerSupabaseClient = {
  from: (table: string) => {
    select: (columns: string) => unknown;
    insert: (values: Record<string, unknown>) => unknown;
    update: (values: Record<string, unknown>) => unknown;
    upsert: (
      values: Record<string, unknown>,
      options?: Record<string, unknown>,
    ) => unknown;
    delete: () => unknown;
  };
};

type SupabaseSelectBuilder<T> = PromiseLike<{
  data: T[] | null;
  error: { message: string } | null;
}> & {
  eq: (column: string, value: unknown) => SupabaseSelectBuilder<T>;
  order: (
    column: string,
    options?: { ascending?: boolean },
  ) => SupabaseSelectBuilder<T>;
};

type SupabaseWriteBuilder<T> = {
  eq: (column: string, value: unknown) => SupabaseWriteBuilder<T>;
  select: (columns: string) => SupabaseSingleBuilder<T>;
};

type SupabaseInsertBuilder<T> = {
  select: (columns: string) => SupabaseSingleBuilder<T>;
};

type SupabaseUpsertBuilder<T> = {
  select: (columns: string) => SupabaseSingleBuilder<T>;
};

type SupabaseDeleteBuilder = PromiseLike<{
  error: { message: string } | null;
}> & {
  eq: (column: string, value: unknown) => SupabaseDeleteBuilder;
};

type SupabaseSingleBuilder<T> = {
  single: () => PromiseLike<{
    data: T | null;
    error: { message: string } | null;
  }>;
};

function toNumber(value: unknown) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function normalizeRep(row: Record<string, unknown>): SalesRepRow {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    daily_goal: toNumber(row.daily_goal),
    is_active: Boolean(row.is_active),
    sort_order: toNumber(row.sort_order),
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

function normalizeEntry(row: Record<string, unknown>): SalesWeekEntryRow {
  return {
    id: String(row.id),
    rep_id: String(row.rep_id),
    week_start_date: String(row.week_start_date),
    entry_date: String(row.entry_date),
    day_index: toNumber(row.day_index),
    amount: row.amount === null ? null : toNumber(row.amount),
    note: String(row.note ?? ""),
    referral_partners_added: toNumber(row.referral_partners_added),
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}

export async function fetchSalesReps(client: SalesTrackerSupabaseClient) {
  const { data, error } = await (client
    .from("sales_reps")
    .select("*") as SupabaseSelectBuilder<Record<string, unknown>>)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => normalizeRep(row));
}

export async function fetchSalesWeekEntries(
  client: SalesTrackerSupabaseClient,
  weekStartDate: string,
) {
  const { data, error } = await (client
    .from("sales_week_entries")
    .select("*") as SupabaseSelectBuilder<Record<string, unknown>>)
    .eq("week_start_date", weekStartDate)
    .order("day_index", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => normalizeEntry(row));
}

export async function updateSalesRepWithClient(
  client: SalesTrackerSupabaseClient,
  rep: SalesRepRow,
) {
  const builder = client.from("sales_reps").update({
    name: rep.name.trim() || "Sales Rep",
    daily_goal: Math.max(0, Number(rep.daily_goal) || 0),
    updated_at: new Date().toISOString(),
  }) as SupabaseWriteBuilder<Record<string, unknown>>;

  const { data, error } = await builder
    .eq("id", rep.id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("No sales rep was returned after update.");
  }

  return normalizeRep(data);
}

export async function createSalesRepWithClient(
  client: SalesTrackerSupabaseClient,
  payload: { name: string; dailyGoal: number; sortOrder: number },
) {
  const builder = client.from("sales_reps").insert({
    name: payload.name.trim() || "New Rep",
    daily_goal: Math.max(0, Number(payload.dailyGoal) || 0),
    is_active: true,
    sort_order: payload.sortOrder,
  }) as SupabaseInsertBuilder<Record<string, unknown>>;

  const { data, error } = await builder.select("*").single();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("No sales rep was returned after create.");
  }

  return normalizeRep(data);
}

export async function deleteSalesRepWithClient(
  client: SalesTrackerSupabaseClient,
  repId: string,
) {
  const builder = client.from("sales_reps").update({
    is_active: false,
    updated_at: new Date().toISOString(),
  }) as SupabaseWriteBuilder<Record<string, unknown>>;

  const { data, error } = await builder
    .eq("id", repId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("No sales rep was returned after delete.");
  }

  return normalizeRep(data);
}

export async function upsertSalesDayEntryWithClient(
  client: SalesTrackerSupabaseClient,
  entry: SalesDayEntry,
) {
  const payload = {
    rep_id: entry.rep_id,
    week_start_date: entry.week_start_date,
    entry_date: getEntryDate(entry.week_start_date, entry.day_index),
    day_index: entry.day_index,
    amount: entry.amount,
    note: entry.note,
    referral_partners_added: Math.max(
      0,
      Math.round(Number(entry.referral_partners_added) || 0),
    ),
    updated_at: new Date().toISOString(),
  };

  const builder = client.from("sales_week_entries").upsert(payload, {
    onConflict: "rep_id,week_start_date,day_index",
  }) as SupabaseUpsertBuilder<Record<string, unknown>>;

  const { data, error } = await builder
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("No sales entry was returned after save.");
  }

  return normalizeEntry(data);
}

export async function clearSalesWeekWithClient(
  client: SalesTrackerSupabaseClient,
  weekStartDate: string,
) {
  const { error } = await (client
    .from("sales_week_entries")
    .delete() as SupabaseDeleteBuilder)
    .eq("week_start_date", weekStartDate);

  if (error) {
    throw error;
  }
}
