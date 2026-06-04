import type { MemberKpiRow, KpiStatus } from "./types";

export interface SlideKpi {
  name: string;
  description: string | null;
  target: number | null;
  current: number | null;
  unit: string | null;
  progress: number;
  status: KpiStatus;
  goalType: string;
  timePeriod: string;
  notes: string | null;
  wins: string | null;
  blockers: string | null;
}

export interface MemberKpiSlideData {
  memberName: string;
  displayName: string;
  overallProgress: number;
  totalKpis: number;
  onTrack: number;
  atRisk: number;
  behind: number;
  complete: number;
  paused: number;
  topKpi: string | null;
  needsAttention: string | null;
  wins: string[];
  blockers: string[];
  kpis: SlideKpi[];
}

export function computeKpiProgress(kpi: MemberKpiRow): number {
  if (kpi.goal_type === "Yes / No") {
    return kpi.status === "Complete" ? 100 : 0;
  }
  if (kpi.target_value == null || kpi.target_value === 0) return 0;
  if (kpi.current_value == null) return 0;
  return Math.round((kpi.current_value / kpi.target_value) * 1000) / 10;
}

export function buildMemberKpiSlideData(
  memberFullName: string,
  kpis: MemberKpiRow[],
): MemberKpiSlideData {
  const displayName = memberFullName.split(" ")[0] ?? memberFullName;

  const onTrack = kpis.filter((k) => k.status === "On Track").length;
  const atRisk = kpis.filter((k) => k.status === "At Risk").length;
  const behind = kpis.filter((k) => k.status === "Behind").length;
  const complete = kpis.filter((k) => k.status === "Complete").length;
  const paused = kpis.filter((k) => k.status === "Paused").length;

  const progressValues = kpis.map(computeKpiProgress);
  const overallProgress =
    kpis.length === 0
      ? 0
      : Math.round(
          progressValues.reduce((sum, v) => sum + v, 0) / kpis.length,
        );

  const topKpi = kpis.find((k) => k.status === "On Track")?.kpi_name ?? null;
  const needsAttention =
    kpis.find((k) => k.status === "Behind" || k.status === "At Risk")
      ?.kpi_name ?? null;

  const allWins = kpis.flatMap((k) => (k.wins ? [k.wins] : []));
  const allBlockers = kpis.flatMap((k) => (k.blockers ? [k.blockers] : []));

  return {
    memberName: memberFullName,
    displayName,
    overallProgress,
    totalKpis: kpis.length,
    onTrack,
    atRisk,
    behind,
    complete,
    paused,
    topKpi,
    needsAttention,
    wins: allWins,
    blockers: allBlockers,
    kpis: kpis.map((k) => ({
      name: k.kpi_name,
      description: k.description,
      target: k.target_value,
      current: k.current_value,
      unit: k.unit_label,
      progress: computeKpiProgress(k),
      status: k.status as KpiStatus,
      goalType: k.goal_type,
      timePeriod: k.time_period,
      notes: k.notes,
      wins: k.wins,
      blockers: k.blockers,
    })),
  };
}
