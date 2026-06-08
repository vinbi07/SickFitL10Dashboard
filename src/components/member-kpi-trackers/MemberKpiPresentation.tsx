"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PresentationSlider } from "@/components/meeting/PresentationSlider";
import { fetchMemberTasks, savePresentationNote } from "@/lib/member-kpi/client";
import { buildMemberKpiSlides } from "@/lib/member-kpi/buildMemberKpiSlides";
import { MemberKpiSlideRenderer } from "./MemberKpiSlideRenderer";
import type { MemberPerson, MemberKpiRow } from "@/lib/member-kpi/types";
import type { TaskSlideItem } from "@/lib/member-kpi/presentationTypes";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return (parts[0]?.[0] ?? "?").toUpperCase();
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
}

interface Props {
  person: MemberPerson;
  kpis: MemberKpiRow[];
  onExit: () => void;
}

export function MemberKpiPresentation({ person, kpis, onExit }: Props) {
  const [slideIndex, setSlideIndex] = useState(0);
  const [tasks, setTasks] = useState<TaskSlideItem[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [presentationNote, setPresentationNote] = useState(person.presentation_note ?? "");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch tasks for this member on mount / member change
  useEffect(() => {
    setLoadingTasks(true);
    setTasks([]);
    fetchMemberTasks(person.full_name)
      .then(setTasks)
      .catch(() => {
        // Non-fatal: tasks slide will show empty state
      })
      .finally(() => setLoadingTasks(false));
  }, [person.full_name]);

  // Rebuild slides whenever data changes
  const slides = useMemo(
    () => buildMemberKpiSlides(person, kpis, tasks, presentationNote),
    [person, kpis, tasks, presentationNote],
  );

  const segments = useMemo(
    () => slides.map((s) => ({ id: s.id, label: s.label })),
    [slides],
  );

  // Clamp index if slides array ever shrinks
  const clampedIndex = Math.min(slideIndex, slides.length - 1);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "ArrowRight")
        setSlideIndex((i) => Math.min(slides.length - 1, i + 1));
      if (e.key === "ArrowLeft")
        setSlideIndex((i) => Math.max(0, i - 1));
      if (e.key === "Escape") onExit();
    },
    [slides.length, onExit],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const currentSlide = slides[clampedIndex];
  const accent = person.accent_color ?? "#e72027";

  function handlePresentationNoteChange(note: string) {
    setPresentationNote(note);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      savePresentationNote(person.id, note).catch((err) =>
        console.warn("[presentation_note] save failed:", err),
      );
    }, 800);
  }

  return (
    <div className="flex flex-col">
      {/* Presentation header */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-slate-100"
            style={{ backgroundColor: accent }}
          >
            {getInitials(person.full_name)}
          </div>
          <div>
            <p className="font-heading text-base text-white leading-tight">
              {person.full_name}
            </p>
            <p className="text-[11px] text-app-muted">KPI Presentation</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden text-xs text-app-muted sm:inline">
            ← → to navigate · Esc to exit
          </span>
          <button
            type="button"
            onClick={onExit}
            className="rounded-lg border border-app-border px-3 py-2 text-sm text-app-muted transition hover:border-brand hover:text-brand"
          >
            ✕ Exit Presentation
          </button>
        </div>
      </div>

      {/* Slide deck */}
      <PresentationSlider
        currentIndex={clampedIndex}
        onIndexChange={setSlideIndex}
        segments={segments}
      >
        {currentSlide ? (
          <MemberKpiSlideRenderer
            slide={currentSlide}
            onPresentationNoteChange={handlePresentationNoteChange}
            loadingTasks={loadingTasks}
          />
        ) : null}
      </PresentationSlider>
    </div>
  );
}
