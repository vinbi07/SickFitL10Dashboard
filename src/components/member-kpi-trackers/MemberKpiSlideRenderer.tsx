import type { KpiSlide } from "@/lib/member-kpi/presentationTypes";
import { MemberOverviewSlide } from "./slides/MemberOverviewSlide";
import { MemberKpiProgressSlide } from "./slides/MemberKpiProgressSlide";
import { MemberKpiDetailsSlide } from "./slides/MemberKpiDetailsSlide";
import { MemberTasksSlide } from "./slides/MemberTasksSlide";
import { MemberNotesSlide } from "./slides/MemberNotesSlide";
import { MemberNextStepsSlide } from "./slides/MemberNextStepsSlide";

interface Props {
  slide: KpiSlide;
  onPresentationNoteChange: (note: string) => void;
  loadingTasks: boolean;
}

export function MemberKpiSlideRenderer({ slide, onPresentationNoteChange, loadingTasks }: Props) {
  switch (slide.type) {
    case "overview":
      return <MemberOverviewSlide data={slide.data} />;
    case "kpi-progress":
      return <MemberKpiProgressSlide data={slide.data} />;
    case "kpi-details":
      return <MemberKpiDetailsSlide data={slide.data} />;
    case "tasks":
      if (loadingTasks) {
        return (
          <div className="flex min-h-[420px] items-center justify-center">
            <p className="text-app-muted text-sm">Loading tasks…</p>
          </div>
        );
      }
      return <MemberTasksSlide data={slide.data} />;
    case "notes":
      return (
        <MemberNotesSlide
          data={slide.data}
          onPresentationNoteChange={onPresentationNoteChange}
        />
      );
    case "next-steps":
      return <MemberNextStepsSlide data={slide.data} />;
    default:
      return null;
  }
}
