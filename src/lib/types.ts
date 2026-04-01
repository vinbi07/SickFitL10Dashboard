export type ScorecardStatus = "On Track" | "Off Track";
export type RockStatus = "On Track" | "Off Track";
export type IssuePriority = "High" | "Med" | "Low";
export type IssueStatus = "IDS" | "Solved" | "Tabled";

export interface ScorecardRow {
  id: string;
  metric_name: string;
  goal: number;
  actual: number;
  owner: string;
  status: ScorecardStatus;
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
  created_at: string;
  updated_at: string;
}

export interface MeetingLinkRow {
  id: string;
  url: string;
  owner: string;
  created_at: string;
  updated_at: string;
}

export interface ConcludeItemRow {
  id: string;
  content: string;
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
}
