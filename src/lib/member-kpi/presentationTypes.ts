import type { SlideKpi } from "./slideHelper";

export type MemberKpiSlideType =
  | "overview"
  | "kpi-progress"
  | "kpi-details"
  | "tasks"
  | "notes"
  | "next-steps";

export interface TaskSlideItem {
  id: string;
  title: string;
  source: "Rock" | "To-Do";
  status: string;
  due_date: string | null;
  is_complete: boolean;
}

export interface OverviewSlideData {
  memberName: string;
  displayName: string;
  role: string;
  accentColor: string | null;
  overallProgress: number;
  totalKpis: number;
  onTrack: number;
  atRisk: number;
  behind: number;
  complete: number;
  paused: number;
  reportingPeriod: string;
}

export interface KpiProgressSlideData {
  kpis: SlideKpi[];
  topKpi: string | null;
  needsAttention: string | null;
}

export interface KpiDetailsSlideData {
  kpis: SlideKpi[];
  pageIndex: number;
  totalPages: number;
}

export interface TasksSlideData {
  tasks: TaskSlideItem[];
}

export interface NotesSlideData {
  wins: string[];
  blockers: string[];
  notes: string[];
  presentationNote: string;
}

export interface NextStepsSlideData {
  atRiskKpis: SlideKpi[];
  behindKpis: SlideKpi[];
  openTasks: TaskSlideItem[];
  allOnTrack: boolean;
}

export type KpiSlide =
  | { id: string; label: string; type: "overview"; data: OverviewSlideData }
  | { id: string; label: string; type: "kpi-progress"; data: KpiProgressSlideData }
  | { id: string; label: string; type: "kpi-details"; data: KpiDetailsSlideData }
  | { id: string; label: string; type: "tasks"; data: TasksSlideData }
  | { id: string; label: string; type: "notes"; data: NotesSlideData }
  | { id: string; label: string; type: "next-steps"; data: NextStepsSlideData };
