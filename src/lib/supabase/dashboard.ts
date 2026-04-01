import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { DashboardData } from "@/lib/types";

export async function getDashboardData(): Promise<DashboardData> {
  const supabase = await createSupabaseServerClient();

  const [scorecard, rocks, issues, todos, issueComments, agendaItems, meetingLinks, concludeItems] = await Promise.all([
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
  ]);

  if (scorecard.error) throw scorecard.error;
  if (rocks.error) throw rocks.error;
  if (issues.error) throw issues.error;
  if (todos.error) throw todos.error;
  if (issueComments.error) throw issueComments.error;
  if (agendaItems.error) throw agendaItems.error;
  if (meetingLinks.error) throw meetingLinks.error;
  if (concludeItems.error) throw concludeItems.error;

  return {
    scorecard: scorecard.data,
    rocks: rocks.data,
    issues: issues.data,
    todos: todos.data,
    issue_comments: issueComments.data,
    agenda_items: agendaItems.data,
    meeting_links: meetingLinks.data,
    conclude_items: concludeItems.data,
  };
}
