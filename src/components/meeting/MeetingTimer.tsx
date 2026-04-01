"use client";

import { useEffect, useMemo, useState } from "react";
import type { AgendaSegment } from "@/lib/constants/agenda";
import { SEGMENT_DURATIONS_MINUTES } from "@/lib/constants/agenda";

interface MeetingTimerProps {
  segment: AgendaSegment;
}

function toClock(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, "0");

  return `${minutes}:${seconds}`;
}

export function MeetingTimer({ segment }: MeetingTimerProps) {
  const initialSeconds = useMemo(
    () => SEGMENT_DURATIONS_MINUTES[segment] * 60,
    [segment],
  );
  const segmentLabel =
    segment === "Rocks"
      ? "What's This Week"
      : segment === "To-Dos"
        ? "Backlog / What to Expect"
        : segment;

  const [remainingSeconds, setRemainingSeconds] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const interval = window.setInterval(() => {
      setRemainingSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(interval);
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isRunning]);

  return (
    <div className="flex items-center gap-2 rounded-lg border border-app-border bg-black px-3 py-2">
      <span className="text-xs uppercase tracking-[0.12em] text-app-muted">
        {segmentLabel}
      </span>
      <span className="font-heading text-lg text-white">
        {toClock(remainingSeconds)}
      </span>
      <button
        type="button"
        onClick={() => setIsRunning((value) => !value)}
        className="rounded bg-brand px-2 py-1 text-xs font-semibold text-white"
      >
        {isRunning ? "Pause" : "Start"}
      </button>
      <button
        type="button"
        onClick={() => {
          setRemainingSeconds(initialSeconds);
          setIsRunning(false);
        }}
        className="rounded border border-app-border px-2 py-1 text-xs text-app-muted"
      >
        Reset
      </button>
    </div>
  );
}
