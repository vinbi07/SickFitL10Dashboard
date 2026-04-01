"use client";

import { useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type {
  AgendaItemRow,
  ConcludeItemRow,
  DashboardData,
  IssueCommentRow,
  IssueRow,
  MeetingLinkRow,
  RockRow,
  ScorecardRow,
  TodoRow,
} from "@/lib/types";

type TableName = keyof DashboardData;
type TableRecordMap = {
  scorecard: ScorecardRow;
  rocks: RockRow;
  issues: IssueRow;
  todos: TodoRow;
  issue_comments: IssueCommentRow;
  agenda_items: AgendaItemRow;
  meeting_links: MeetingLinkRow;
  conclude_items: ConcludeItemRow;
};

type SetData = Dispatch<SetStateAction<DashboardData>>;

function applyTableChange<T extends { id: string }>(
  current: T[],
  payload: RealtimePostgresChangesPayload<T>,
) {
  if (payload.eventType === "INSERT") {
    return [...current, payload.new];
  }

  if (payload.eventType === "UPDATE") {
    return current.map((item) => (item.id === payload.new.id ? payload.new : item));
  }

  if (payload.eventType === "DELETE") {
    return current.filter((item) => item.id !== payload.old.id);
  }

  return current;
}

function createHandler<K extends TableName>(setData: SetData, table: K) {
  return (payload: RealtimePostgresChangesPayload<TableRecordMap[K]>) => {
    setData((previous) => ({
      ...previous,
      [table]: applyTableChange(
        previous[table] as TableRecordMap[K][],
        payload,
      ) as DashboardData[K],
    }));
  };
}

export function useRealtimeDashboard(setData: SetData) {
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const scorecardChannel = supabase
      .channel("scorecard-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "scorecard" }, createHandler(setData, "scorecard"))
      .subscribe();

    const rocksChannel = supabase
      .channel("rocks-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "rocks" }, createHandler(setData, "rocks"))
      .subscribe();

    const issuesChannel = supabase
      .channel("issues-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "issues" }, createHandler(setData, "issues"))
      .subscribe();

    const todosChannel = supabase
      .channel("todos-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "todos" }, createHandler(setData, "todos"))
      .subscribe();

    const commentsChannel = supabase
      .channel("issue-comments-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "issue_comments" },
        createHandler(setData, "issue_comments"),
      )
      .subscribe();

    const agendaItemsChannel = supabase
      .channel("agenda-items-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "agenda_items" },
        createHandler(setData, "agenda_items"),
      )
      .subscribe();

    const meetingLinksChannel = supabase
      .channel("meeting-links-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "meeting_links" },
        createHandler(setData, "meeting_links"),
      )
      .subscribe();

    const concludeItemsChannel = supabase
      .channel("conclude-items-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conclude_items" },
        createHandler(setData, "conclude_items"),
      )
      .subscribe();

    return () => {
      scorecardChannel.unsubscribe();
      rocksChannel.unsubscribe();
      issuesChannel.unsubscribe();
      todosChannel.unsubscribe();
      commentsChannel.unsubscribe();
      agendaItemsChannel.unsubscribe();
      meetingLinksChannel.unsubscribe();
      concludeItemsChannel.unsubscribe();
    };
  }, [setData]);
}

export type DashboardUpdatePayloads = {
  scorecard: RealtimePostgresChangesPayload<ScorecardRow>;
  rocks: RealtimePostgresChangesPayload<RockRow>;
  issues: RealtimePostgresChangesPayload<IssueRow>;
  todos: RealtimePostgresChangesPayload<TodoRow>;
  issue_comments: RealtimePostgresChangesPayload<IssueCommentRow>;
  agenda_items: RealtimePostgresChangesPayload<AgendaItemRow>;
  meeting_links: RealtimePostgresChangesPayload<MeetingLinkRow>;
  conclude_items: RealtimePostgresChangesPayload<ConcludeItemRow>;
};
