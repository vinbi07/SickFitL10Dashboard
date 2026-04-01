"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function computeMeetingHealth(payload: {
  scorecard: Array<{ goal: number; actual: number; status: "On Track" | "Off Track" }>;
  rocks: Array<{ status: "On Track" | "Off Track" }>;
  issues: Array<{ status: "IDS" | "Solved" | "Tabled" }>;
  todos: Array<{ is_complete: boolean }>;
}) {
  const totalMetrics = payload.scorecard.length;
  const onTrackMetrics = payload.scorecard.filter(
    (metric) => metric.status === "On Track" && metric.actual >= metric.goal,
  ).length;

  const totalRocks = payload.rocks.length;
  const onTrackRocks = payload.rocks.filter(
    (rock) => rock.status === "On Track",
  ).length;

  const totalIssues = payload.issues.length;
  const solvedIssues = payload.issues.filter(
    (issue) => issue.status === "Solved",
  ).length;

  const totalTodos = payload.todos.length;
  const completeTodos = payload.todos.filter((todo) => todo.is_complete).length;

  const metricScore = totalMetrics === 0 ? 1 : onTrackMetrics / totalMetrics;
  const rockScore = totalRocks === 0 ? 1 : onTrackRocks / totalRocks;
  const issueScore = totalIssues === 0 ? 1 : solvedIssues / totalIssues;
  const todoScore = totalTodos === 0 ? 1 : completeTodos / totalTodos;

  return Math.round(
    (metricScore * 0.3 + rockScore * 0.25 + issueScore * 0.3 + todoScore * 0.15) *
      100,
  );
}

export async function createMeetingAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const rawLabel = formData.get("label");
  const label =
    typeof rawLabel === "string" && rawLabel.trim()
      ? rawLabel.trim()
      : "Weekly L10";

  const { data: activeMeeting } = await supabase
    .from("meetings")
    .select("id")
    .eq("is_closed", false)
    .order("meeting_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (activeMeeting) {
    return { ok: false, error: "An active meeting already exists." };
  }

  const { data, error } = await supabase
    .from("meetings")
    .insert({ label, meeting_date: new Date().toISOString().slice(0, 10) })
    .select("id")
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard");
  return { ok: true, meetingId: data.id };
}

export async function closeMeetingAndSnapshotAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const meetingId = formData.get("meetingId");

  if (typeof meetingId !== "string" || !meetingId) {
    return { ok: false, error: "Meeting id is required." };
  }

  const [scorecard, rocks, issues, todos, agendaItems, meetingLinks, concludeItems, decisions, parkingLot] =
    await Promise.all([
      supabase.from("scorecard").select("*").eq("meeting_id", meetingId),
      supabase.from("rocks").select("*").eq("meeting_id", meetingId),
      supabase.from("issues").select("*").eq("meeting_id", meetingId),
      supabase.from("todos").select("*").eq("meeting_id", meetingId),
      supabase.from("agenda_items").select("*").eq("meeting_id", meetingId),
      supabase.from("meeting_links").select("*").eq("meeting_id", meetingId),
      supabase.from("conclude_items").select("*").eq("meeting_id", meetingId),
      supabase.from("decisions").select("*").eq("meeting_id", meetingId),
      supabase.from("parking_lot").select("*").eq("meeting_id", meetingId),
    ]);

  if (scorecard.error) return { ok: false, error: scorecard.error.message };
  if (rocks.error) return { ok: false, error: rocks.error.message };
  if (issues.error) return { ok: false, error: issues.error.message };
  if (todos.error) return { ok: false, error: todos.error.message };
  if (agendaItems.error) return { ok: false, error: agendaItems.error.message };
  if (meetingLinks.error) return { ok: false, error: meetingLinks.error.message };
  if (concludeItems.error) return { ok: false, error: concludeItems.error.message };
  if (decisions.error) return { ok: false, error: decisions.error.message };
  if (parkingLot.error) return { ok: false, error: parkingLot.error.message };

  const healthScore = computeMeetingHealth({
    scorecard: scorecard.data,
    rocks: rocks.data,
    issues: issues.data,
    todos: todos.data,
  });

  const snapshotPayload = {
    scorecard: scorecard.data,
    rocks: rocks.data,
    issues: issues.data,
    todos: todos.data,
    agenda_items: agendaItems.data,
    meeting_links: meetingLinks.data,
    conclude_items: concludeItems.data,
    decisions: decisions.data,
    parking_lot: parkingLot.data,
    closed_at: new Date().toISOString(),
  };

  const { error: snapshotError } = await supabase.from("meeting_snapshots").insert({
    meeting_id: meetingId,
    snapshot_type: "final",
    payload: snapshotPayload,
    health_score: healthScore,
  });

  if (snapshotError) {
    return { ok: false, error: snapshotError.message };
  }

  const { error: closeError } = await supabase
    .from("meetings")
    .update({
      is_closed: true,
      ended_at: new Date().toISOString(),
      health_score: healthScore,
      updated_at: new Date().toISOString(),
    })
    .eq("id", meetingId);

  if (closeError) {
    return { ok: false, error: closeError.message };
  }

  revalidatePath("/dashboard");
  return { ok: true, healthScore };
}

export async function carryoverItemsToMeetingAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const sourceMeetingId = formData.get("sourceMeetingId");
  const targetMeetingId = formData.get("targetMeetingId");

  if (
    typeof sourceMeetingId !== "string" ||
    !sourceMeetingId ||
    typeof targetMeetingId !== "string" ||
    !targetMeetingId
  ) {
    return { ok: false, error: "Source and target meeting IDs are required." };
  }

  const [issues, rocks, todos] = await Promise.all([
    supabase
      .from("issues")
      .select("title, priority, notes, owner, carryover_count")
      .eq("meeting_id", sourceMeetingId)
      .neq("status", "Solved"),
    supabase
      .from("rocks")
      .select("title, owner, status, due_date, carryover_count")
      .eq("meeting_id", sourceMeetingId)
      .neq("status", "On Track"),
    supabase
      .from("todos")
      .select("task_description, owner, due_date, carryover_count")
      .eq("meeting_id", sourceMeetingId)
      .eq("is_complete", false),
  ]);

  if (issues.error) return { ok: false, error: issues.error.message };
  if (rocks.error) return { ok: false, error: rocks.error.message };
  if (todos.error) return { ok: false, error: todos.error.message };

  if (issues.data.length > 0) {
    const { error } = await supabase.from("issues").insert(
      issues.data.map((issue) => ({
        title: issue.title,
        priority: issue.priority,
        status: "IDS",
        notes: issue.notes,
        owner: issue.owner,
        meeting_id: targetMeetingId,
        carryover_count: issue.carryover_count + 1,
      })),
    );

    if (error) {
      return { ok: false, error: error.message };
    }
  }

  if (rocks.data.length > 0) {
    const { error } = await supabase.from("rocks").insert(
      rocks.data.map((rock) => ({
        title: rock.title,
        owner: rock.owner,
        status: "Off Track",
        due_date: rock.due_date,
        meeting_id: targetMeetingId,
        carryover_count: rock.carryover_count + 1,
      })),
    );

    if (error) {
      return { ok: false, error: error.message };
    }
  }

  if (todos.data.length > 0) {
    const { error } = await supabase.from("todos").insert(
      todos.data.map((todo) => ({
        task_description: todo.task_description,
        owner: todo.owner,
        is_complete: false,
        due_date: todo.due_date,
        meeting_id: targetMeetingId,
        carryover_count: todo.carryover_count + 1,
      })),
    );

    if (error) {
      return { ok: false, error: error.message };
    }
  }

  revalidatePath("/dashboard");
  return {
    ok: true,
    counts: {
      issues: issues.data.length,
      rocks: rocks.data.length,
      todos: todos.data.length,
    },
  };
}

export async function updateShopifyTargetAction(
  metricName: string,
  targetPeriod: string,
  targetValue: number,
) {
  const supabase = await createSupabaseServerClient();

  const { data: existing } = await supabase
    .from("shopify_targets")
    .select("id")
    .eq("metric_name", metricName)
    .eq("target_period", targetPeriod)
    .single();

  if (existing) {
    // Update existing target
    await supabase
      .from("shopify_targets")
      .update({
        target_value: targetValue,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
  } else {
    // Create new target
    await supabase.from("shopify_targets").insert({
      metric_name: metricName,
      target_period: targetPeriod,
      target_value: targetValue,
      currency_code: "USD",
      updated_at: new Date().toISOString(),
    });
  }

  revalidatePath("/dashboard");
  return { ok: true };
}
