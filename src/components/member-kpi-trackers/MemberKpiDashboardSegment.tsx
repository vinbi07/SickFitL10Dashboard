"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { fetchAllMemberKpis, fetchMemberTasks, savePresentationNote } from "@/lib/member-kpi/client";
import { buildMemberKpiSlides } from "@/lib/member-kpi/buildMemberKpiSlides";
import { MemberKpiSlideRenderer } from "./MemberKpiSlideRenderer";
import type { MemberKpiRow } from "@/lib/member-kpi/types";
import type { TaskSlideItem } from "@/lib/member-kpi/presentationTypes";

// Accepts the broader PersonRow shape from the dashboard (structural compatibility).
interface PersonLike {
  id: string;
  full_name: string;
  role: string;
  accent_color: string | null;
  is_active: boolean;
}

interface Props {
  people: PersonLike[];
}

function getFirstName(name: string): string {
  return name.split(" ")[0] ?? name;
}

export function MemberKpiDashboardSegment({ people }: Props) {
  const activePeople = useMemo(
    () => people.filter((p) => p.is_active),
    [people],
  );

  const [selectedName, setSelectedName] = useState(
    () => activePeople[0]?.full_name ?? "",
  );
  const [slideIndex, setSlideIndex] = useState(0);
  const [allKpis, setAllKpis] = useState<MemberKpiRow[]>([]);
  const [tasks, setTasks] = useState<TaskSlideItem[]>([]);
  const [presentationNote, setPresentationNote] = useState("");
  const [loadingKpis, setLoadingKpis] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch all KPIs once
  useEffect(() => {
    fetchAllMemberKpis()
      .then(setAllKpis)
      .catch(() => {})
      .finally(() => setLoadingKpis(false));
  }, []);

  // Fetch tasks when member changes
  useEffect(() => {
    if (!selectedName) return;
    setLoadingTasks(true);
    setTasks([]);
    fetchMemberTasks(selectedName)
      .then(setTasks)
      .catch(() => {})
      .finally(() => setLoadingTasks(false));
  }, [selectedName]);

  // Reset slide and seed note when member changes
  useEffect(() => {
    setSlideIndex(0);
    const person = activePeople.find((p) => p.full_name === selectedName);
    setPresentationNote(person?.presentation_note ?? "");
  }, [selectedName, activePeople]);

  const selectedPerson = useMemo(
    () => activePeople.find((p) => p.full_name === selectedName) ?? null,
    [activePeople, selectedName],
  );

  const memberKpis = useMemo(
    () => allKpis.filter((k) => k.member_name === selectedName),
    [allKpis, selectedName],
  );

  const slides = useMemo(
    () =>
      selectedPerson
        ? buildMemberKpiSlides(selectedPerson, memberKpis, tasks, presentationNote)
        : [],
    [selectedPerson, memberKpis, tasks, presentationNote],
  );

  const clampedIndex = Math.min(slideIndex, Math.max(0, slides.length - 1));
  const currentSlide = slides[clampedIndex];

  function handlePresentationNoteChange(note: string) {
    setPresentationNote(note);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    const person = activePeople.find((p) => p.full_name === selectedName);
    if (!person) return;
    saveTimerRef.current = setTimeout(() => {
      savePresentationNote(person.id, note).catch((err) =>
        console.warn("[presentation_note] save failed:", err),
      );
    }, 800);
  }

  if (activePeople.length === 0) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-app-muted">No active team members found.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-4">
        <h2 className="font-heading text-xl text-white">Member KPI Slides</h2>
        <p className="mt-0.5 text-xs text-app-muted">
          Individual KPI review for each team member
        </p>
      </div>

      {/* Member tabs — styled like the presenter segment pills */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {activePeople.map((person) => {
          const isSelected = person.full_name === selectedName;
          return (
            <button
              key={person.id}
              type="button"
              onClick={() => setSelectedName(person.full_name)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                isSelected
                  ? "border-transparent text-slate-100"
                  : "border-app-border text-app-muted hover:border-white/40 hover:text-foreground"
              }`}
              style={
                isSelected
                  ? { backgroundColor: person.accent_color ?? "#e72027" }
                  : undefined
              }
            >
              {getFirstName(person.full_name)}
            </button>
          );
        })}
      </div>

      {/* Slide navigation pills */}
      {slides.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-1.5">
          {slides.map((slide, idx) => (
            <button
              key={slide.id}
              type="button"
              onClick={() => setSlideIndex(idx)}
              className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.12em] transition ${
                idx === clampedIndex
                  ? "border-brand bg-brand text-white"
                  : "border-app-border text-app-muted hover:border-white/40"
              }`}
            >
              {slide.label}
            </button>
          ))}
        </div>
      )}

      {/* Slide content */}
      {loadingKpis ? (
        <div className="flex min-h-[360px] items-center justify-center">
          <p className="text-sm text-app-muted">Loading KPI data…</p>
        </div>
      ) : currentSlide ? (
        <AnimatePresence mode="wait">
          <motion.div
            key={`${selectedName}-${clampedIndex}`}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            <MemberKpiSlideRenderer
              slide={currentSlide}
              onPresentationNoteChange={handlePresentationNoteChange}
              loadingTasks={loadingTasks}
            />
          </motion.div>
        </AnimatePresence>
      ) : (
        <div className="flex min-h-[360px] items-center justify-center rounded-xl border border-app-border bg-app-base">
          <div className="text-center">
            <p className="font-semibold text-white">
              No KPIs yet for {getFirstName(selectedName)}
            </p>
            <p className="mt-1 text-sm text-app-muted">
              Add KPIs in the Member KPI Trackers page.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
