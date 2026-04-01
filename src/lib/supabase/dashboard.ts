import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { DashboardData } from "@/lib/types";

type SupabaseSelectResult<T> = {
  data: T[] | null;
  error: { code?: string; message: string } | null;
};

function missingRelationOrColumn(error: { code?: string } | null) {
  return error?.code === "42P01" || error?.code === "42703";
}

function dataOrEmpty<T>(result: SupabaseSelectResult<T>, optional = false) {
  if (result.error) {
    if (optional && missingRelationOrColumn(result.error)) {
      return [] as T[];
    }
    throw result.error;
  }

  return result.data ?? [];
}

export async function getDashboardData(): Promise<DashboardData> {
  const supabase = await createSupabaseServerClient();

  const [
    scorecard,
    rocks,
    issues,
    todos,
    issueComments,
    agendaItems,
    meetingLinks,
    concludeItems,
    meetings,
    meetingSnapshots,
    decisions,
    parkingLot,
    savedViews,
    notificationEvents,
    calendarSyncEvents,
    people,
    meetingFormatSegments,
  ] = await Promise.all([
    supabase.from("scorecard").select("*").order("created_at", { ascending: true }),
    supabase.from("rocks").select("*").eq("is_archived", false).order("created_at", { ascending: true }),
    supabase.from("issues").select("*").order("created_at", { ascending: true }),
    supabase.from("todos").select("*").eq("is_archived", false).order("created_at", { ascending: true }),
    supabase
      .from("issue_comments")
      .select("*")
      .order("created_at", { ascending: true }),
    supabase
      .from("agenda_items")
      .select("*")
      .order("created_at", { ascending: true }),
    supabase
      .from("meeting_links")
      .select("*")
      .order("created_at", { ascending: true }),
    supabase
      .from("conclude_items")
      .select("*")
      .order("created_at", { ascending: true }),
    supabase.from("meetings").select("*").order("meeting_date", { ascending: false }),
    supabase
      .from("meeting_snapshots")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase.from("decisions").select("*").order("created_at", { ascending: true }),
    supabase
      .from("parking_lot")
      .select("*")
      .order("created_at", { ascending: true }),
    supabase.from("saved_views").select("*").order("created_at", { ascending: true }),
    supabase
      .from("notification_events")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("calendar_sync_events")
      .select("*")
      .order("starts_at", { ascending: true }),
    supabase.from("people").select("*").order("created_at", { ascending: true }),
    supabase
      .from("meeting_format_segments")
      .select("*")
      .order("sort_order", { ascending: true }),
  ]);

  return {
    scorecard: dataOrEmpty(scorecard),
    rocks: dataOrEmpty(rocks),
    issues: dataOrEmpty(issues),
    todos: dataOrEmpty(todos),
    issue_comments: dataOrEmpty(issueComments),
    agenda_items: dataOrEmpty(agendaItems),
    meeting_links: dataOrEmpty(meetingLinks),
    conclude_items: dataOrEmpty(concludeItems),
    meetings: dataOrEmpty(meetings, true),
    meeting_snapshots: dataOrEmpty(meetingSnapshots, true),
    decisions: dataOrEmpty(decisions, true),
    parking_lot: dataOrEmpty(parkingLot, true),
    saved_views: dataOrEmpty(savedViews, true),
    notification_events: dataOrEmpty(notificationEvents, true),
    calendar_sync_events: dataOrEmpty(calendarSyncEvents, true),
    people: dataOrEmpty(people, true),
    meeting_format_segments: dataOrEmpty(meetingFormatSegments, true),
  };
}
