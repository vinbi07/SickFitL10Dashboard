"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getWeekKey, getMonday, formatYmd } from "@/lib/sales-tracker/date";
import type { MemberKpiRow, MemberKpiDraft, MemberPerson, KpiHistoryRow } from "./types";
import type { TaskSlideItem } from "./presentationTypes";

async function recordKpiHistory(
  client: ReturnType<typeof createSupabaseBrowserClient>,
  kpiId: string,
  recordedValue: number | null,
  status: string,
  source: "manual" | "sync",
): Promise<void> {
  const { error } = await client
    .from("kpi_history")
    .insert([{ kpi_id: kpiId, recorded_value: recordedValue, status, source }]);
  if (error) throw error;
}

export async function fetchAllMemberKpis(): Promise<MemberKpiRow[]> {
  const client = createSupabaseBrowserClient();
  const { data, error } = await client
    .from("member_kpis")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as MemberKpiRow[];
}

export async function createMemberKpi(draft: MemberKpiDraft): Promise<MemberKpiRow> {
  const client = createSupabaseBrowserClient();
  const { data, error } = await client
    .from("member_kpis")
    .insert([draft])
    .select()
    .single();
  if (error) throw error;
  return data as MemberKpiRow;
}

export async function updateMemberKpi(
  id: string,
  updates: Partial<MemberKpiDraft>,
): Promise<MemberKpiRow> {
  const client = createSupabaseBrowserClient();
  const { data, error } = await client
    .from("member_kpis")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as MemberKpiRow;
}

export async function deleteMemberKpi(id: string): Promise<void> {
  const client = createSupabaseBrowserClient();
  const { error } = await client.from("member_kpis").delete().eq("id", id);
  if (error) throw error;
}

export async function updateMemberKpiProgress(
  id: string,
  currentValue: number | null,
  status: string,
): Promise<MemberKpiRow> {
  const client = createSupabaseBrowserClient();
  const { data, error } = await client
    .from("member_kpis")
    .update({
      current_value: currentValue,
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;

  await recordKpiHistory(client, id, currentValue, status, "manual").catch(
    (err) => console.warn("[kpi_history] insert failed:", err),
  );

  return data as MemberKpiRow;
}

export async function fetchRecentKpiHistory(
  kpiId: string,
  limit = 10,
): Promise<KpiHistoryRow[]> {
  const client = createSupabaseBrowserClient();
  const { data, error } = await client
    .from("kpi_history")
    .select("*")
    .eq("kpi_id", kpiId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as KpiHistoryRow[];
}

// ---------------------------------------------------------------------------
// Tasks for presentation slides
// ---------------------------------------------------------------------------

export async function fetchMemberTasks(ownerFullName: string): Promise<TaskSlideItem[]> {
  const client = createSupabaseBrowserClient();
  const [rocksRes, todosRes] = await Promise.all([
    client
      .from("rocks")
      .select("id, title, owner, status, due_date")
      .eq("is_archived", false)
      .eq("owner", ownerFullName),
    client
      .from("todos")
      .select("id, task_description, owner, status, due_date, is_complete")
      .eq("is_archived", false)
      .eq("owner", ownerFullName),
  ]);
  if (rocksRes.error) throw rocksRes.error;
  if (todosRes.error) throw todosRes.error;

  const rocks: TaskSlideItem[] = (rocksRes.data ?? []).map((r) => ({
    id: r.id as string,
    title: r.title as string,
    source: "Rock" as const,
    status: r.status as string,
    due_date: r.due_date as string | null,
    is_complete: false,
  }));

  const todos: TaskSlideItem[] = (todosRes.data ?? []).map((t) => ({
    id: t.id as string,
    title: t.task_description as string,
    source: "To-Do" as const,
    status: (t.is_complete as boolean) ? "Complete" : (t.status as string),
    due_date: t.due_date as string | null,
    is_complete: t.is_complete as boolean,
  }));

  return [...rocks, ...todos];
}

// ---------------------------------------------------------------------------
// Sales Tracker → Member KPI sync
// ---------------------------------------------------------------------------

// Maps sales rep names to the first-name prefix used in the People table.
// Add entries here whenever a sales rep name differs from their People record.
const SALES_REP_NAME_OVERRIDES: Record<string, string> = {
  Jojo: "Jorannie",
  "Jo Jo": "Jorannie",
  JoJo: "Jorannie",
};

function findPersonForRepName(
  repName: string,
  people: MemberPerson[],
): MemberPerson | null {
  const trimmed = repName.trim();
  const overrideName = SALES_REP_NAME_OVERRIDES[trimmed];
  const searchPrefix = (overrideName ?? trimmed.split(" ")[0] ?? trimmed).toLowerCase();
  return (
    people.find((p) =>
      p.full_name.toLowerCase().startsWith(searchPrefix),
    ) ?? null
  );
}

function deriveStatus(percent: number): string {
  if (percent >= 100) return "Complete";
  if (percent >= 75) return "On Track";
  if (percent >= 40) return "At Risk";
  return "Behind";
}

export interface SalesSyncResult {
  created: number;
  updated: number;
  skipped: string[];
  kpis: MemberKpiRow[];
}

export async function syncSalesTrackerToKpis(
  people: MemberPerson[],
): Promise<SalesSyncResult> {
  const client = createSupabaseBrowserClient();
  const weekStartDate = getWeekKey(new Date());

  // Fetch all three sales tracker tables in parallel
  const [repsRes, entriesRes, goalsRes, existingRes] = await Promise.all([
    client
      .from("sales_reps")
      .select("id, name, daily_goal, is_active, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    client
      .from("sales_week_entries")
      .select("rep_id, amount, referral_partners_added, day_index")
      .eq("week_start_date", weekStartDate),
    client
      .from("sales_rep_week_goals")
      .select("rep_id, referral_partners_goal")
      .eq("week_start_date", weekStartDate),
    client
      .from("member_kpis")
      .select("id, member_name, kpi_name"),
  ]);

  if (repsRes.error) throw repsRes.error;
  if (entriesRes.error) throw entriesRes.error;
  if (goalsRes.error) throw goalsRes.error;
  if (existingRes.error) throw existingRes.error;

  type RepRow = { id: string; name: string; daily_goal: number };
  type EntryRow = { rep_id: string; amount: number | null; referral_partners_added: number };
  type GoalRow = { rep_id: string; referral_partners_goal: number };
  type ExistingKpi = { id: string; member_name: string; kpi_name: string };

  const reps = (repsRes.data ?? []) as RepRow[];
  const entries = (entriesRes.data ?? []) as EntryRow[];
  const goals = (goalsRes.data ?? []) as GoalRow[];
  const existing = (existingRes.data ?? []) as ExistingKpi[];

  let created = 0;
  let updated = 0;
  const skipped: string[] = [];
  const resultKpis: MemberKpiRow[] = [];

  for (const rep of reps) {
    const person = findPersonForRepName(rep.name, people);
    if (!person) {
      skipped.push(`"${rep.name}" — no matching team member found`);
      continue;
    }

    const repEntries = entries.filter((e) => e.rep_id === rep.id);
    const repGoal = goals.find((g) => g.rep_id === rep.id);

    const dailyGoal = Number(rep.daily_goal) || 0;
    const weeklyGoal = dailyGoal * 7;

    const loggedEntries = repEntries.filter((e) => e.amount !== null);
    const weeklyTotal = loggedEntries.reduce(
      (sum, e) => sum + Number(e.amount ?? 0),
      0,
    );
    const daysHit = loggedEntries.filter(
      (e) => Number(e.amount ?? 0) >= dailyGoal,
    ).length;
    const moneyPercent = weeklyGoal > 0
      ? Math.round((weeklyTotal / weeklyGoal) * 100)
      : 0;

    const referralAdded = repEntries.reduce(
      (sum, e) => sum + Number(e.referral_partners_added || 0),
      0,
    );
    const referralGoal = repGoal?.referral_partners_goal ?? 0;
    const referralPercent = referralGoal > 0
      ? Math.round((referralAdded / referralGoal) * 100)
      : 0;

    const now = new Date().toISOString();

    // ── Weekly Sales KPI ──────────────────────────────────────────────────
    if (weeklyGoal > 0) {
      const kpiName = "Weekly Sales";
      const draft: MemberKpiDraft = {
        member_name: person.full_name,
        kpi_name: kpiName,
        description: `Sales total for the week of ${weekStartDate}`,
        goal_type: "Currency",
        target_value: weeklyGoal,
        current_value: weeklyTotal,
        unit_label: "$",
        time_period: "Weekly",
        status: deriveStatus(moneyPercent),
        notes: `${daysHit}/${loggedEntries.length} days hit daily goal of $${dailyGoal}`,
      };

      const existingKpi = existing.find(
        (k) => k.member_name === person.full_name && k.kpi_name === kpiName,
      );

      if (existingKpi) {
        const { data, error } = await client
          .from("member_kpis")
          .update({ ...draft, updated_at: now })
          .eq("id", existingKpi.id)
          .select()
          .single();
        if (error) throw error;
        resultKpis.push(data as MemberKpiRow);
        await recordKpiHistory(client, existingKpi.id, draft.current_value ?? null, draft.status, "sync").catch(
          (err) => console.warn("[kpi_history sync]:", err),
        );
        updated++;
      } else {
        const { data, error } = await client
          .from("member_kpis")
          .insert([draft])
          .select()
          .single();
        if (error) throw error;
        resultKpis.push(data as MemberKpiRow);
        await recordKpiHistory(client, (data as MemberKpiRow).id, draft.current_value ?? null, draft.status, "sync").catch(
          (err) => console.warn("[kpi_history sync]:", err),
        );
        created++;
      }
    }

    // ── Referral Partners KPI ─────────────────────────────────────────────
    if (referralGoal > 0) {
      const kpiName = "Referral Partners";
      const draft: MemberKpiDraft = {
        member_name: person.full_name,
        kpi_name: kpiName,
        description: `Referral partners added for the week of ${weekStartDate}`,
        goal_type: "Number",
        target_value: referralGoal,
        current_value: referralAdded,
        unit_label: "partners",
        time_period: "Weekly",
        status: deriveStatus(referralPercent),
      };

      const existingKpi = existing.find(
        (k) => k.member_name === person.full_name && k.kpi_name === kpiName,
      );

      if (existingKpi) {
        const { data, error } = await client
          .from("member_kpis")
          .update({ ...draft, updated_at: now })
          .eq("id", existingKpi.id)
          .select()
          .single();
        if (error) throw error;
        resultKpis.push(data as MemberKpiRow);
        await recordKpiHistory(client, existingKpi.id, draft.current_value ?? null, draft.status, "sync").catch(
          (err) => console.warn("[kpi_history sync]:", err),
        );
        updated++;
      } else {
        const { data, error } = await client
          .from("member_kpis")
          .insert([draft])
          .select()
          .single();
        if (error) throw error;
        resultKpis.push(data as MemberKpiRow);
        await recordKpiHistory(client, (data as MemberKpiRow).id, draft.current_value ?? null, draft.status, "sync").catch(
          (err) => console.warn("[kpi_history sync]:", err),
        );
        created++;
      }
    }
  }

  return { created, updated, skipped, kpis: resultKpis };
}
