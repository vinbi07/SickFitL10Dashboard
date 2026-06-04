export const GOAL_TYPES = [
  "Number",
  "Percentage",
  "Currency",
  "Yes / No",
  "Task Completion",
  "Custom",
] as const;

export const STATUS_OPTIONS = [
  "On Track",
  "At Risk",
  "Behind",
  "Complete",
  "Paused",
] as const;

export const TIME_PERIODS = [
  "Weekly",
  "Monthly",
  "Quarterly",
  "Yearly",
  "Custom",
] as const;

export type GoalType = (typeof GOAL_TYPES)[number];
export type KpiStatus = (typeof STATUS_OPTIONS)[number];
export type TimePeriod = (typeof TIME_PERIODS)[number];

export interface MemberKpiRow {
  id: string;
  member_name: string;
  kpi_name: string;
  description: string | null;
  goal_type: string;
  target_value: number | null;
  current_value: number | null;
  unit_label: string | null;
  time_period: string;
  status: string;
  notes: string | null;
  wins: string | null;
  blockers: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface MemberKpiDraft {
  member_name: string;
  kpi_name: string;
  description?: string | null;
  goal_type: string;
  target_value?: number | null;
  current_value?: number | null;
  unit_label?: string | null;
  time_period: string;
  status: string;
  notes?: string | null;
  wins?: string | null;
  blockers?: string | null;
  sort_order?: number;
}

export interface MemberPerson {
  id: string;
  full_name: string;
  role: string;
  accent_color?: string | null;
  is_active: boolean;
}

export interface MemberKpiInitialData {
  people: MemberPerson[];
  kpis: MemberKpiRow[];
}
