export type ScorecardStatus = "On Track" | "Off Track";
export type RockStatus = "On Track" | "Off Track";
export type IssuePriority = "High" | "Med" | "Low";
export type IssueStatus = "IDS" | "Solved" | "Tabled";
export type DecisionStatus = "Pending" | "Approved" | "Implemented";
export type SnapshotType = "interim" | "final";
export type ParkingLotStatus = "Open" | "Carried" | "Resolved";
export type CalendarSyncStatus = "scheduled" | "cancelled";

export interface ScorecardRow {
  id: string;
  metric_name: string;
  goal: number;
  actual: number;
  owner: string;
  status: ScorecardStatus;
  meeting_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface RockRow {
  id: string;
  title: string;
  owner: string;
  status: RockStatus;
  due_date: string | null;
  is_archived: boolean;
  meeting_id: string | null;
  carryover_count: number;
  created_at: string;
  updated_at: string;
}

export interface IssueRow {
  id: string;
  title: string;
  priority: IssuePriority;
  status: IssueStatus;
  notes: string;
  owner: string;
  meeting_id: string | null;
  carryover_count: number;
  created_at: string;
  updated_at: string;
}

export interface TodoRow {
  id: string;
  task_description: string;
  owner: string;
  is_complete: boolean;
  due_date: string | null;
  is_archived: boolean;
  meeting_id: string | null;
  carryover_count: number;
  created_at: string;
  updated_at: string;
}

export interface IssueCommentRow {
  id: string;
  issue_id: string;
  comment: string;
  owner: string;
  created_at: string;
}

export interface AgendaItemRow {
  id: string;
  segment: "Segue" | "Headlines";
  text: string;
  owner: string;
  meeting_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface MeetingLinkRow {
  id: string;
  url: string;
  owner: string;
  meeting_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConcludeItemRow {
  id: string;
  content: string;
  meeting_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface MeetingRow {
  id: string;
  label: string;
  meeting_date: string;
  started_at: string;
  ended_at: string | null;
  total_duration_seconds?: number | null;
  is_closed: boolean;
  health_score: number | null;
  created_at: string;
  updated_at: string;
}

export interface MeetingSnapshotRow {
  id: string;
  meeting_id: string;
  snapshot_type: SnapshotType;
  payload: Record<string, unknown>;
  health_score: number | null;
  created_at: string;
}

export interface DecisionRow {
  id: string;
  meeting_id: string;
  issue_id: string | null;
  rock_id: string | null;
  title: string;
  context: string;
  owner: string;
  status: DecisionStatus;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface ParkingLotRow {
  id: string;
  meeting_id: string;
  content: string;
  owner: string;
  status: ParkingLotStatus;
  related_issue_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface SavedViewRow {
  id: string;
  name: string;
  owner: string;
  filter_config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface NotificationEventRow {
  id: string;
  owner: string;
  event_type: string;
  payload: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
}

export interface CalendarSyncEventRow {
  id: string;
  provider: string;
  external_event_id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  status: CalendarSyncStatus;
  meeting_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface MeetingFormatSegmentRow {
  id: string;
  segment_key: string;
  label: string;
  duration_minutes: number;
  sort_order: number;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface PersonRow {
  id: string;
  full_name: string;
  username: string;
  email: string;
  role: string;
  accent_color: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DashboardData {
  scorecard: ScorecardRow[];
  rocks: RockRow[];
  issues: IssueRow[];
  todos: TodoRow[];
  issue_comments: IssueCommentRow[];
  agenda_items: AgendaItemRow[];
  meeting_links: MeetingLinkRow[];
  conclude_items: ConcludeItemRow[];
  meetings: MeetingRow[];
  meeting_snapshots: MeetingSnapshotRow[];
  decisions: DecisionRow[];
  parking_lot: ParkingLotRow[];
  saved_views: SavedViewRow[];
  notification_events: NotificationEventRow[];
  calendar_sync_events: CalendarSyncEventRow[];
  people: PersonRow[];
  meeting_format_segments: MeetingFormatSegmentRow[];
}
