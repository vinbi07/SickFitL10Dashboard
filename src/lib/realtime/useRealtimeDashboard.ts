"use client";

import { useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type {
  AgendaItemRow,
  CalendarSyncEventRow,
  ConcludeItemRow,
  DecisionRow,
  DashboardData,
  IssueCommentRow,
  IssueRow,
  MeetingFormatSegmentRow,
  MeetingRow,
  MeetingSnapshotRow,
  MeetingLinkRow,
  NotificationEventRow,
  ParkingLotRow,
  PersonRow,
  RockRow,
  SavedViewRow,
  ScorecardRow,
  TodoRow,
} from "@/lib/types";

type TableRecordMap = {
  scorecard: ScorecardRow;
  rocks: RockRow;
  issues: IssueRow;
  todos: TodoRow;
  issue_comments: IssueCommentRow;
  agenda_items: AgendaItemRow;
  meeting_links: MeetingLinkRow;
  conclude_items: ConcludeItemRow;
  meetings: MeetingRow;
  meeting_snapshots: MeetingSnapshotRow;
  decisions: DecisionRow;
  parking_lot: ParkingLotRow;
  saved_views: SavedViewRow;
  notification_events: NotificationEventRow;
  calendar_sync_events: CalendarSyncEventRow;
  people: PersonRow;
  meeting_format_segments: MeetingFormatSegmentRow;
};

type RealtimeTableName = keyof TableRecordMap;

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

function createHandler<K extends RealtimeTableName>(setData: SetData, table: K) {
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

    const meetingsChannel = supabase
      .channel("meetings-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "meetings" },
        createHandler(setData, "meetings"),
      )
      .subscribe();

    const meetingSnapshotsChannel = supabase
      .channel("meeting-snapshots-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "meeting_snapshots" },
        createHandler(setData, "meeting_snapshots"),
      )
      .subscribe();

    const decisionsChannel = supabase
      .channel("decisions-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "decisions" },
        createHandler(setData, "decisions"),
      )
      .subscribe();

    const parkingLotChannel = supabase
      .channel("parking-lot-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "parking_lot" },
        createHandler(setData, "parking_lot"),
      )
      .subscribe();

    const savedViewsChannel = supabase
      .channel("saved-views-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "saved_views" },
        createHandler(setData, "saved_views"),
      )
      .subscribe();

    const notificationEventsChannel = supabase
      .channel("notification-events-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notification_events" },
        createHandler(setData, "notification_events"),
      )
      .subscribe();

    const calendarSyncEventsChannel = supabase
      .channel("calendar-sync-events-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "calendar_sync_events" },
        createHandler(setData, "calendar_sync_events"),
      )
      .subscribe();

    const peopleChannel = supabase
      .channel("people-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "people" },
        createHandler(setData, "people"),
      )
      .subscribe();

    const meetingFormatSegmentsChannel = supabase
      .channel("meeting-format-segments-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "meeting_format_segments" },
        createHandler(setData, "meeting_format_segments"),
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
      meetingsChannel.unsubscribe();
      meetingSnapshotsChannel.unsubscribe();
      decisionsChannel.unsubscribe();
      parkingLotChannel.unsubscribe();
      savedViewsChannel.unsubscribe();
      notificationEventsChannel.unsubscribe();
      calendarSyncEventsChannel.unsubscribe();
      peopleChannel.unsubscribe();
      meetingFormatSegmentsChannel.unsubscribe();
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
  meetings: RealtimePostgresChangesPayload<MeetingRow>;
  meeting_snapshots: RealtimePostgresChangesPayload<MeetingSnapshotRow>;
  decisions: RealtimePostgresChangesPayload<DecisionRow>;
  parking_lot: RealtimePostgresChangesPayload<ParkingLotRow>;
  saved_views: RealtimePostgresChangesPayload<SavedViewRow>;
  notification_events: RealtimePostgresChangesPayload<NotificationEventRow>;
  calendar_sync_events: RealtimePostgresChangesPayload<CalendarSyncEventRow>;
  people: RealtimePostgresChangesPayload<PersonRow>;
  meeting_format_segments: RealtimePostgresChangesPayload<MeetingFormatSegmentRow>;
};
