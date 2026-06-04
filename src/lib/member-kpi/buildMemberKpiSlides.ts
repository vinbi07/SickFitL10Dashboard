import type { MemberKpiRow, MemberPerson } from "./types";
import { buildMemberKpiSlideData } from "./slideHelper";
import type { KpiSlide, TaskSlideItem } from "./presentationTypes";

const KPI_PER_DETAILS_SLIDE = 5;

export function buildMemberKpiSlides(
  person: MemberPerson,
  kpis: MemberKpiRow[],
  tasks: TaskSlideItem[],
  presentationNote = "",
): KpiSlide[] {
  const sd = buildMemberKpiSlideData(person.full_name, kpis);
  const slides: KpiSlide[] = [];

  // 1. Overview
  slides.push({
    id: "overview",
    label: "Overview",
    type: "overview",
    data: {
      memberName: person.full_name,
      displayName: sd.displayName,
      role: person.role,
      accentColor: person.accent_color ?? null,
      overallProgress: sd.overallProgress,
      totalKpis: sd.totalKpis,
      onTrack: sd.onTrack,
      atRisk: sd.atRisk,
      behind: sd.behind,
      complete: sd.complete,
      paused: sd.paused,
      reportingPeriod: "Current Period",
    },
  });

  // 2. KPI Progress snapshot (top 5)
  slides.push({
    id: "kpi-progress",
    label: "KPI Progress",
    type: "kpi-progress",
    data: {
      kpis: sd.kpis.slice(0, 5),
      topKpi: sd.topKpi,
      needsAttention: sd.needsAttention,
    },
  });

  // 3+. KPI Details — auto-split every KPI_PER_DETAILS_SLIDE items
  const totalPages = Math.max(1, Math.ceil(sd.kpis.length / KPI_PER_DETAILS_SLIDE));
  for (let i = 0; i < totalPages; i++) {
    slides.push({
      id: `kpi-details-${i}`,
      label: totalPages === 1 ? "KPI Details" : `Details ${i + 1}/${totalPages}`,
      type: "kpi-details",
      data: {
        kpis: sd.kpis.slice(i * KPI_PER_DETAILS_SLIDE, (i + 1) * KPI_PER_DETAILS_SLIDE),
        pageIndex: i,
        totalPages,
      },
    });
  }

  // Tasks
  slides.push({
    id: "tasks",
    label: "Tasks",
    type: "tasks",
    data: { tasks },
  });

  // Notes / Wins / Blockers
  const notes = kpis.flatMap((k) => (k.notes ? [k.notes] : []));
  slides.push({
    id: "notes",
    label: "Notes",
    type: "notes",
    data: {
      wins: sd.wins,
      blockers: sd.blockers,
      notes,
      presentationNote,
    },
  });

  // Next Steps
  const atRiskKpis = sd.kpis.filter((k) => k.status === "At Risk");
  const behindKpis = sd.kpis.filter((k) => k.status === "Behind");
  const openTasks = tasks.filter((t) => !t.is_complete);
  slides.push({
    id: "next-steps",
    label: "Next Steps",
    type: "next-steps",
    data: {
      atRiskKpis,
      behindKpis,
      openTasks,
      allOnTrack: atRiskKpis.length === 0 && behindKpis.length === 0,
    },
  });

  return slides;
}
