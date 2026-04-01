"use client";

import { useEffect, useMemo, useState } from "react";

interface MeetingTimerProps {
  segmentLabel: string;
  durationMinutes: number;
  canAdvanceSegment?: boolean;
  onAdvanceSegment?: () => void;
  onSaveMeeting?: (elapsedSeconds: number) => Promise<void> | void;
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

function toElapsedClock(totalSeconds: number) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600)
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor((safe % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor(safe % 60)
    .toString()
    .padStart(2, "0");

  return `${hours}:${minutes}:${seconds}`;
}

export function MeetingTimer({
  segmentLabel,
  durationMinutes,
  canAdvanceSegment = false,
  onAdvanceSegment,
  onSaveMeeting,
}: MeetingTimerProps) {
  const initialSeconds = useMemo(
    () => Math.max(1, durationMinutes) * 60,
    [durationMinutes],
  );

  const [remainingSeconds, setRemainingSeconds] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [meetingStarted, setMeetingStarted] = useState(false);
  const [totalElapsedSeconds, setTotalElapsedSeconds] = useState(0);
  const [isSavingMeeting, setIsSavingMeeting] = useState(false);

  useEffect(() => {
    setRemainingSeconds(initialSeconds);
    setIsRunning(meetingStarted);
  }, [initialSeconds, meetingStarted, segmentLabel]);

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const interval = window.setInterval(() => {
      setRemainingSeconds((current) => {
        if (current <= 1) {
          return 0;
        }
        return current - 1;
      });
      setTotalElapsedSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isRunning]);

  function toggleRunState() {
    if (isRunning) {
      setIsRunning(false);
      return;
    }

    if (!meetingStarted) {
      const shouldStart = window.confirm(
        "Would you like to start this meeting timer?",
      );
      if (!shouldStart) {
        return;
      }
      setMeetingStarted(true);
    }

    setIsRunning(true);
  }

  function advanceToNextSection() {
    onAdvanceSegment?.();
  }

  async function endAndSaveMeeting() {
    if (!meetingStarted) {
      return;
    }

    const shouldEnd = window.confirm("End timer and save this meeting?");
    if (!shouldEnd) {
      return;
    }

    if (totalElapsedSeconds < 5 * 60) {
      const saveShortMeeting = window.confirm(
        "Total meeting time is less than 5 minutes. Would you like to save it anyway?",
      );
      if (!saveShortMeeting) {
        return;
      }
    }

    try {
      setIsSavingMeeting(true);
      await onSaveMeeting?.(totalElapsedSeconds);
      setIsRunning(false);
      setMeetingStarted(false);
      setTotalElapsedSeconds(0);
      setRemainingSeconds(initialSeconds);
    } finally {
      setIsSavingMeeting(false);
    }
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-app-border bg-black px-3 py-2">
      <span className="text-xs uppercase tracking-[0.12em] text-app-muted">
        {segmentLabel}
      </span>
      <span className="font-heading text-lg text-white" title="Section timer">
        {toClock(remainingSeconds)}
      </span>
      <span
        className="rounded border border-app-border px-2 py-0.5 font-heading text-sm text-emerald-300"
        title="Total meeting time"
      >
        Total {toElapsedClock(totalElapsedSeconds)}
      </span>
      <button
        type="button"
        onClick={toggleRunState}
        className="rounded bg-brand px-2 py-1 text-xs font-semibold text-white"
      >
        {isRunning ? "Pause" : "Start"}
      </button>
      <button
        type="button"
        disabled={!canAdvanceSegment}
        onClick={advanceToNextSection}
        className="rounded border border-app-border px-2 py-1 text-xs text-white disabled:opacity-40"
      >
        Skip / Finish Section
      </button>
      <button
        type="button"
        disabled={isSavingMeeting || !meetingStarted}
        onClick={() => void endAndSaveMeeting()}
        className="rounded border border-[#e72027] px-2 py-1 text-xs text-[#e72027] disabled:opacity-40"
      >
        {isSavingMeeting ? "Saving..." : "End & Save"}
      </button>
      <button
        type="button"
        onClick={() => {
          setRemainingSeconds(initialSeconds);
          setIsRunning(false);
          setMeetingStarted(false);
          setTotalElapsedSeconds(0);
        }}
        className="rounded border border-app-border px-2 py-1 text-xs text-app-muted"
      >
        Reset
      </button>
    </div>
  );
}
