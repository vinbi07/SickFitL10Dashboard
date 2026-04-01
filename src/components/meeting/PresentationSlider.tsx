"use client";

import { AnimatePresence, motion } from "framer-motion";

interface FormatSegment {
  id: string;
  label: string;
}

interface PresentationSliderProps {
  currentIndex: number;
  onIndexChange: (next: number) => void;
  segments: FormatSegment[];
  children: React.ReactNode;
}

export function PresentationSlider({
  currentIndex,
  onIndexChange,
  segments,
  children,
}: PresentationSliderProps) {
  return (
    <section className="rounded-2xl border border-app-border bg-app-panel p-6">
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {segments.map((segment, index) => (
          <button
            key={segment.id}
            type="button"
            onClick={() => onIndexChange(index)}
            className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.12em] transition ${
              index === currentIndex
                ? "border-brand bg-brand text-white"
                : "border-app-border text-app-muted hover:border-white/40"
            }`}
          >
            {segment.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
        >
          {children}
        </motion.div>
      </AnimatePresence>

      <div className="mt-6 flex justify-between">
        <button
          type="button"
          disabled={currentIndex === 0}
          onClick={() => onIndexChange(Math.max(0, currentIndex - 1))}
          className="rounded-lg border border-app-border px-3 py-2 text-sm text-white disabled:opacity-40"
        >
          Previous
        </button>
        <button
          type="button"
          disabled={currentIndex === segments.length - 1}
          onClick={() =>
            onIndexChange(Math.min(segments.length - 1, currentIndex + 1))
          }
          className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </section>
  );
}
