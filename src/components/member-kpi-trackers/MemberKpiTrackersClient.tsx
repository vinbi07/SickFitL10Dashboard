"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  createMemberKpi,
  deleteMemberKpi,
  fetchAllMemberKpis,
  fetchRecentKpiHistory,
  syncSalesTrackerToKpis,
  updateMemberKpi,
  updateMemberKpiProgress,
  type SalesSyncResult,
} from "@/lib/member-kpi/client";
import { computeKpiProgress, computeKpiTrend } from "@/lib/member-kpi/slideHelper";
import {
  GOAL_TYPES,
  STATUS_OPTIONS,
  TARGET_DIRECTIONS,
  TIME_PERIODS,
  type KpiHistoryRow,
  type MemberKpiDraft,
  type MemberKpiInitialData,
  type MemberKpiRow,
  type MemberPerson,
} from "@/lib/member-kpi/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getFirstName(fullName: string): string {
  return fullName.split(" ")[0] ?? fullName;
}

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return (parts[0]?.[0] ?? "?").toUpperCase();
  return (
    (parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")
  ).toUpperCase();
}

function clampProgress(p: number): number {
  return Math.min(100, Math.max(0, p));
}

function formatValue(value: number | null, unitLabel: string | null): string {
  if (value == null) return "—";
  const num = Number.isInteger(value) ? value.toString() : value.toFixed(2);
  return unitLabel ? `${num} ${unitLabel}` : num;
}

// ---------------------------------------------------------------------------
// Small display components
// ---------------------------------------------------------------------------

const STATUS_STYLES: Record<string, string> = {
  "On Track": "bg-emerald-700 text-slate-100",
  "At Risk": "bg-amber-600 text-slate-100",
  Behind: "bg-red-700 text-slate-100",
  Complete: "bg-blue-700 text-slate-100",
  Paused: "bg-stone-500 text-slate-100",
};

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_STYLES[status] ?? "bg-stone-500 text-slate-100";
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-[11px] font-semibold leading-tight ${cls}`}
    >
      {status}
    </span>
  );
}

function ProgressBar({ percent }: { percent: number }) {
  const w = clampProgress(percent);
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-app-border">
      <div
        className="h-full rounded-full bg-brand transition-all duration-300"
        style={{ width: `${w}%` }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// KPI Form state
// ---------------------------------------------------------------------------

interface KpiFormState {
  kpi_name: string;
  description: string;
  goal_type: string;
  target_direction: string;
  target_value: string;
  current_value: string;
  unit_label: string;
  time_period: string;
  status: string;
  notes: string;
  wins: string;
  blockers: string;
}

const EMPTY_FORM: KpiFormState = {
  kpi_name: "",
  description: "",
  goal_type: "Number",
  target_direction: "higher",
  target_value: "",
  current_value: "",
  unit_label: "",
  time_period: "Monthly",
  status: "On Track",
  notes: "",
  wins: "",
  blockers: "",
};

function kpiRowToForm(kpi: MemberKpiRow): KpiFormState {
  return {
    kpi_name: kpi.kpi_name,
    description: kpi.description ?? "",
    goal_type: kpi.goal_type,
    target_direction: kpi.target_direction ?? "higher",
    target_value: kpi.target_value != null ? String(kpi.target_value) : "",
    current_value: kpi.current_value != null ? String(kpi.current_value) : "",
    unit_label: kpi.unit_label ?? "",
    time_period: kpi.time_period,
    status: kpi.status,
    notes: kpi.notes ?? "",
    wins: kpi.wins ?? "",
    blockers: kpi.blockers ?? "",
  };
}

function formToDraft(form: KpiFormState, memberName: string): MemberKpiDraft {
  const isYesNo = form.goal_type === "Yes / No";
  return {
    member_name: memberName,
    kpi_name: form.kpi_name.trim(),
    description: form.description.trim() || null,
    goal_type: form.goal_type,
    target_direction: isYesNo ? "higher" : form.target_direction,
    target_value: isYesNo
      ? null
      : form.target_value === ""
        ? null
        : Number(form.target_value),
    current_value: isYesNo
      ? null
      : form.current_value === ""
        ? null
        : Number(form.current_value),
    unit_label: form.unit_label.trim() || null,
    time_period: form.time_period,
    status: form.status,
    notes: form.notes.trim() || null,
    wins: form.wins.trim() || null,
    blockers: form.blockers.trim() || null,
  };
}

function validateForm(form: KpiFormState): string | null {
  if (!form.kpi_name.trim()) return "KPI Name is required.";
  if (!GOAL_TYPES.includes(form.goal_type as never))
    return "Goal Type is invalid.";
  if (!STATUS_OPTIONS.includes(form.status as never))
    return "Status is invalid.";
  if (!TIME_PERIODS.includes(form.time_period as never))
    return "Time Period is invalid.";
  if (form.goal_type !== "Yes / No") {
    if (form.target_value !== "" && isNaN(Number(form.target_value)))
      return "Target Value must be a number.";
    if (form.current_value !== "" && isNaN(Number(form.current_value)))
      return "Current Value must be a number.";
  }
  return null;
}

// ---------------------------------------------------------------------------
// Modal wrapper
// ---------------------------------------------------------------------------

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="absolute inset-0 backdrop-blur-sm"
        style={{ backgroundColor: "rgba(0,0,0,0.65)" }}
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-app-border bg-app-panel shadow-2xl">
        <div className="flex items-center justify-between border-b border-app-border px-5 py-4">
          <h2 className="font-heading text-lg text-white">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-app-muted transition hover:text-foreground"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// KPI form modal (Add / Edit)
// ---------------------------------------------------------------------------

function KpiFormModal({
  title,
  initialForm,
  memberName,
  onSave,
  onClose,
}: {
  title: string;
  initialForm: KpiFormState;
  memberName: string;
  onSave: (draft: MemberKpiDraft) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<KpiFormState>(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(field: keyof KpiFormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationError = validateForm(form);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(formToDraft(form, memberName));
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save KPI.");
    } finally {
      setSaving(false);
    }
  }

  const isYesNo = form.goal_type === "Yes / No";

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="rounded-lg border border-red-700/50 bg-red-700/10 px-3 py-2 text-xs text-red-400">
            {error}
          </p>
        )}

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-app-muted">
            KPI Name <span className="text-brand">*</span>
          </label>
          <input
            required
            value={form.kpi_name}
            onChange={(e) => set("kpi_name", e.target.value)}
            placeholder="e.g. Website Sections Completed"
            className="w-full rounded-lg border border-app-border bg-app-base px-3 py-2 text-sm text-white placeholder:text-app-muted focus:border-brand focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-app-muted">
            Description
          </label>
          <textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            rows={2}
            placeholder="Brief description of this KPI"
            className="w-full rounded-lg border border-app-border bg-app-base px-3 py-2 text-sm text-white placeholder:text-app-muted focus:border-brand focus:outline-none resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-app-muted">
              Goal Type <span className="text-brand">*</span>
            </label>
            <select
              value={form.goal_type}
              onChange={(e) => set("goal_type", e.target.value)}
              className="w-full rounded-lg border border-app-border bg-app-base px-3 py-2 text-sm text-white focus:border-brand focus:outline-none"
            >
              {GOAL_TYPES.map((g) => (
                <option
                  key={g}
                  value={g}
                  style={{ backgroundColor: "#fff", color: "#111827" }}
                >
                  {g}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-app-muted">
              Time Period
            </label>
            <select
              value={form.time_period}
              onChange={(e) => set("time_period", e.target.value)}
              className="w-full rounded-lg border border-app-border bg-app-base px-3 py-2 text-sm text-white focus:border-brand focus:outline-none"
            >
              {TIME_PERIODS.map((t) => (
                <option
                  key={t}
                  value={t}
                  style={{ backgroundColor: "#fff", color: "#111827" }}
                >
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        {!isYesNo && (
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-app-muted">
              Target Direction
            </label>
            <div className="flex gap-2">
              {TARGET_DIRECTIONS.map((dir) => (
                <button
                  key={dir}
                  type="button"
                  onClick={() => set("target_direction", dir)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                    form.target_direction === dir
                      ? "border-brand bg-brand/10 text-brand"
                      : "border-app-border text-app-muted hover:border-app-muted"
                  }`}
                >
                  {dir === "higher" ? "↑ Higher is better" : "↓ Lower is better"}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-app-muted">
              {form.target_direction === "lower"
                ? "Progress = target ÷ current. Use for metrics like load time or LCP where a lower value wins."
                : "Progress = current ÷ target. Use for revenue, completions, or any metric where more is better."}
            </p>
          </div>
        )}

        {!isYesNo && (
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-app-muted">
                Target
              </label>
              <input
                type="number"
                step="any"
                value={form.target_value}
                onChange={(e) => set("target_value", e.target.value)}
                placeholder="e.g. 10"
                className="w-full rounded-lg border border-app-border bg-app-base px-3 py-2 text-sm text-white placeholder:text-app-muted focus:border-brand focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-app-muted">
                Current
              </label>
              <input
                type="number"
                step="any"
                value={form.current_value}
                onChange={(e) => set("current_value", e.target.value)}
                placeholder="e.g. 5"
                className="w-full rounded-lg border border-app-border bg-app-base px-3 py-2 text-sm text-white placeholder:text-app-muted focus:border-brand focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-app-muted">
                Unit
              </label>
              <input
                value={form.unit_label}
                onChange={(e) => set("unit_label", e.target.value)}
                placeholder="sections"
                className="w-full rounded-lg border border-app-border bg-app-base px-3 py-2 text-sm text-white placeholder:text-app-muted focus:border-brand focus:outline-none"
              />
            </div>
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-app-muted">
            Status
          </label>
          <select
            value={form.status}
            onChange={(e) => set("status", e.target.value)}
            className="w-full rounded-lg border border-app-border bg-app-base px-3 py-2 text-sm text-white focus:border-brand focus:outline-none"
          >
            {STATUS_OPTIONS.map((s) => (
              <option
                key={s}
                value={s}
                style={{ backgroundColor: "#fff", color: "#111827" }}
              >
                {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-app-muted">
            Notes
          </label>
          <textarea
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            rows={2}
            placeholder="Any notes about this KPI"
            className="w-full rounded-lg border border-app-border bg-app-base px-3 py-2 text-sm text-white placeholder:text-app-muted focus:border-brand focus:outline-none resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-app-muted">
              Wins
            </label>
            <textarea
              value={form.wins}
              onChange={(e) => set("wins", e.target.value)}
              rows={2}
              placeholder="Recent wins"
              className="w-full rounded-lg border border-app-border bg-app-base px-3 py-2 text-sm text-white placeholder:text-app-muted focus:border-brand focus:outline-none resize-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-app-muted">
              Blockers
            </label>
            <textarea
              value={form.blockers}
              onChange={(e) => set("blockers", e.target.value)}
              rows={2}
              placeholder="Current blockers"
              className="w-full rounded-lg border border-app-border bg-app-base px-3 py-2 text-sm text-white placeholder:text-app-muted focus:border-brand focus:outline-none resize-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-app-border px-4 py-2 text-sm text-app-muted transition hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-slate-100 transition hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save KPI"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Delete confirmation modal
// ---------------------------------------------------------------------------

function DeleteConfirmModal({
  kpiName,
  onConfirm,
  onClose,
}: {
  kpiName: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete KPI.");
      setDeleting(false);
    }
  }

  return (
    <Modal title="Delete KPI" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-white">
          Are you sure you want to delete{" "}
          <span className="font-semibold text-brand">"{kpiName}"</span>? This
          action cannot be undone.
        </p>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-app-border px-4 py-2 text-sm text-app-muted transition hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-red-600 disabled:opacity-50"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Update progress modal
// ---------------------------------------------------------------------------

function UpdateProgressModal({
  kpi,
  recentHistory,
  onSave,
  onClose,
}: {
  kpi: MemberKpiRow;
  recentHistory: KpiHistoryRow[];
  onSave: (currentValue: number | null, status: string) => Promise<void>;
  onClose: () => void;
}) {
  const [currentValue, setCurrentValue] = useState(
    kpi.current_value != null ? String(kpi.current_value) : "",
  );
  const [status, setStatus] = useState(kpi.status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isYesNo = kpi.goal_type === "Yes / No";

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!isYesNo && currentValue !== "" && isNaN(Number(currentValue))) {
      setError("Current value must be a number.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const val = isYesNo || currentValue === "" ? null : Number(currentValue);
      await onSave(val, status);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update progress.",
      );
      setSaving(false);
    }
  }

  const previewProgress = isYesNo
    ? status === "Complete"
      ? 100
      : 0
    : kpi.target_value != null && currentValue !== ""
      ? (() => {
          const cur = Number(currentValue);
          const tgt = kpi.target_value!;
          if (kpi.target_direction === "lower") {
            return clampProgress(cur === 0 ? 100 : Math.round((tgt / cur) * 100));
          }
          return clampProgress(tgt === 0 ? 0 : Math.round((cur / tgt) * 100));
        })()
      : 0;

  return (
    <Modal title={`Update Progress — ${kpi.kpi_name}`} onClose={onClose}>
      <form onSubmit={handleSave} className="space-y-4">
        {error && <p className="text-xs text-red-400">{error}</p>}

        {!isYesNo && recentHistory.length >= 1 && (() => {
          const last = recentHistory[0]!;
          const when = new Date(last.created_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          });
          return (
            <div className="rounded-lg border border-app-border bg-app-panel/50 px-3 py-2 text-xs text-app-muted">
              Last recorded:{" "}
              <span className="font-semibold text-white">
                {formatValue(last.recorded_value, kpi.unit_label)}
              </span>
              <span className="ml-2">on {when}</span>
            </div>
          );
        })()}

        {!isYesNo && (
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-app-muted">
              Current Value
              {kpi.unit_label ? ` (${kpi.unit_label})` : ""}
            </label>
            <input
              type="number"
              step="any"
              value={currentValue}
              onChange={(e) => setCurrentValue(e.target.value)}
              placeholder={
                kpi.target_value != null
                  ? `Goal: ${kpi.target_value}${kpi.unit_label ? ` ${kpi.unit_label}` : ""}`
                  : "Enter current value"
              }
              className="w-full rounded-lg border border-app-border bg-app-base px-3 py-2 text-sm text-white placeholder:text-app-muted focus:border-brand focus:outline-none"
            />
            {kpi.target_value && currentValue !== "" && (
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between text-xs text-app-muted">
                  <span>Progress</span>
                  <span>{previewProgress}%</span>
                </div>
                <ProgressBar percent={previewProgress} />
              </div>
            )}
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-app-muted">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded-lg border border-app-border bg-app-base px-3 py-2 text-sm text-white focus:border-brand focus:outline-none"
          >
            {STATUS_OPTIONS.map((s) => (
              <option
                key={s}
                value={s}
                style={{ backgroundColor: "#fff", color: "#111827" }}
              >
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-app-border px-4 py-2 text-sm text-app-muted transition hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-slate-100 transition hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Update"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Staleness helpers
// ---------------------------------------------------------------------------

const PERIOD_DAYS: Record<string, number> = {
  Weekly: 7,
  Monthly: 30,
  Quarterly: 90,
  Yearly: 365,
  Custom: 30,
};

function getKpiStaleness(
  kpi: MemberKpiRow,
  recentHistory: KpiHistoryRow[],
): { overdue: boolean; daysSince: number; dueDays: number } {
  const dueDays = PERIOD_DAYS[kpi.time_period] ?? 30;
  // Use most recent history entry if loaded, fall back to updated_at
  const lastUpdateStr = recentHistory.length > 0
    ? recentHistory[0]!.created_at
    : kpi.updated_at;
  const daysSince = Math.floor(
    (Date.now() - new Date(lastUpdateStr).getTime()) / (1000 * 60 * 60 * 24),
  );
  return { overdue: daysSince >= dueDays, daysSince, dueDays };
}

// ---------------------------------------------------------------------------
// KPI Card
// ---------------------------------------------------------------------------

function KpiCard({
  kpi,
  recentHistory,
  onEdit,
  onDelete,
  onUpdateProgress,
}: {
  kpi: MemberKpiRow;
  recentHistory: KpiHistoryRow[];
  onEdit: (kpi: MemberKpiRow) => void;
  onDelete: (kpi: MemberKpiRow) => void;
  onUpdateProgress: (kpi: MemberKpiRow) => void;
}) {
  const progress = computeKpiProgress(kpi);
  const displayProgress = Math.round(progress * 10) / 10;
  const isYesNo = kpi.goal_type === "Yes / No";
  const { overdue, daysSince, dueDays } = getKpiStaleness(kpi, recentHistory);

  return (
    <div
      className="flex flex-col gap-3 rounded-xl border bg-black p-4 transition"
      style={{
        borderColor: overdue ? "rgba(217,119,6,0.6)" : undefined,
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-white leading-tight">
            {kpi.kpi_name}
          </h3>
          {kpi.description && (
            <p className="mt-0.5 text-xs text-app-muted line-clamp-2 leading-snug">
              {kpi.description}
            </p>
          )}
        </div>
        <StatusBadge status={kpi.status} />
      </div>

      {/* Goal vs Current */}
      {!isYesNo && (
        <div className="flex items-center gap-2 text-xs text-app-muted">
          <span>
            <span className="font-semibold text-white">
              {formatValue(kpi.current_value, kpi.unit_label)}
            </span>
            {" / "}
            {formatValue(kpi.target_value, kpi.unit_label)}
          </span>
          <span
            className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
            title={kpi.target_direction === "lower" ? "Lower is better" : "Higher is better"}
            style={{
              backgroundColor: kpi.target_direction === "lower" ? "rgba(59,130,246,0.15)" : "rgba(16,185,129,0.15)",
              color: kpi.target_direction === "lower" ? "#60a5fa" : "#34d399",
            }}
          >
            {kpi.target_direction === "lower" ? "↓ lower" : "↑ higher"}
          </span>
          <span className="rounded bg-app-border/50 px-1.5 py-0.5 text-[10px]">
            {kpi.time_period}
          </span>
        </div>
      )}
      {isYesNo && (
        <div className="flex items-center gap-2 text-xs text-app-muted">
          <span className="rounded bg-app-border/50 px-1.5 py-0.5 text-[10px]">
            Yes / No
          </span>
          <span className="rounded bg-app-border/50 px-1.5 py-0.5 text-[10px]">
            {kpi.time_period}
          </span>
        </div>
      )}

      {/* Trend indicator — shown after ≥2 history entries exist */}
      {!isYesNo && recentHistory.length >= 2 && (() => {
        const trend = computeKpiTrend(kpi.target_direction, kpi.goal_type, recentHistory);
        if (trend === "none") return null;
        const prevValue = recentHistory[1]?.recorded_value;
        const prevFormatted = formatValue(prevValue ?? null, kpi.unit_label);
        const cfg = {
          improving: { icon: "↑", label: "Improving", bg: "rgba(16,185,129,0.12)", color: "#34d399" },
          declining: { icon: "↓", label: "Declining", bg: "rgba(239,68,68,0.12)", color: "#f87171" },
          flat:      { icon: "→", label: "No change", bg: "rgba(100,116,139,0.15)", color: "#94a3b8" },
        }[trend];
        return (
          <div className="flex items-center gap-2 text-[11px]">
            <span
              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-semibold"
              style={{ backgroundColor: cfg.bg, color: cfg.color }}
            >
              {cfg.icon} {cfg.label}
            </span>
            <span className="text-app-muted">
              prev: <span className="text-white">{prevFormatted}</span>
            </span>
          </div>
        );
      })()}

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[11px] text-app-muted">
          <span>Progress</span>
          <span className="font-semibold text-white">{displayProgress}%</span>
        </div>
        <ProgressBar percent={progress} />
      </div>

      {/* Notes / Wins / Blockers */}
      {(kpi.notes || kpi.wins || kpi.blockers) && (
        <div className="space-y-1 border-t border-app-border pt-2">
          {kpi.notes && (
            <p className="text-[11px] text-app-muted line-clamp-2">
              <span className="font-semibold text-white">Notes: </span>
              {kpi.notes}
            </p>
          )}
          {kpi.wins && (
            <p className="text-[11px] text-app-muted line-clamp-1">
              <span className="font-semibold text-emerald-500">Wins: </span>
              {kpi.wins}
            </p>
          )}
          {kpi.blockers && (
            <p className="text-[11px] text-app-muted line-clamp-1">
              <span className="font-semibold text-amber-500">Blockers: </span>
              {kpi.blockers}
            </p>
          )}
        </div>
      )}

      {/* Overdue warning */}
      {overdue && (
        <button
          type="button"
          onClick={() => onUpdateProgress(kpi)}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs transition hover:opacity-80"
          style={{ backgroundColor: "rgba(217,119,6,0.12)", color: "#fbbf24" }}
        >
          <span className="text-sm leading-none">⚠</span>
          <span className="font-semibold">Update needed</span>
          <span className="text-amber-500/70">
            — {daysSince}d since last update ({dueDays}d period)
          </span>
        </button>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 border-t border-app-border pt-2">
        <button
          type="button"
          onClick={() => onUpdateProgress(kpi)}
          className="flex-1 rounded-lg border border-brand/40 bg-brand/10 px-2 py-1.5 text-xs font-semibold text-brand transition hover:bg-brand/20"
        >
          Update
        </button>
        <button
          type="button"
          onClick={() => onEdit(kpi)}
          className="rounded-lg border border-app-border px-2 py-1.5 text-xs text-app-muted transition hover:border-app-muted hover:text-foreground"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => onDelete(kpi)}
          className="rounded-lg border border-app-border px-2 py-1.5 text-xs text-app-muted transition hover:border-red-700/50 hover:text-red-400"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Member summary panel
// ---------------------------------------------------------------------------

function MemberSummaryPanel({
  person,
  kpis,
}: {
  person: MemberPerson;
  kpis: MemberKpiRow[];
}) {
  const onTrack = kpis.filter((k) => k.status === "On Track").length;
  const atRisk = kpis.filter((k) => k.status === "At Risk").length;
  const behind = kpis.filter((k) => k.status === "Behind").length;
  const complete = kpis.filter((k) => k.status === "Complete").length;
  const paused = kpis.filter((k) => k.status === "Paused").length;

  const overallProgress =
    kpis.length === 0
      ? 0
      : Math.round(
          kpis.map((k) => Math.min(100, computeKpiProgress(k))).reduce((a, b) => a + b, 0) / kpis.length,
        );

  const initials = getInitials(person.full_name);
  const accentColor = person.accent_color ?? "#e72027";

  return (
    <div className="rounded-xl border border-app-border bg-black p-4 md:sticky md:top-4">
      {/* Avatar */}
      <div className="mb-4 flex items-center gap-3">
        <div
          className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl text-base font-bold text-slate-100 shadow"
          style={{ backgroundColor: accentColor }}
        >
          {initials}
        </div>
        <div className="min-w-0">
          <p className="truncate font-heading text-base text-white">
            {person.full_name}
          </p>
          {person.role && (
            <p className="truncate text-xs text-app-muted">{person.role}</p>
          )}
        </div>
      </div>

      {/* Overall progress */}
      <div className="mb-4 space-y-1.5">
        <div className="flex items-center justify-between text-xs text-app-muted">
          <span>Overall Progress</span>
          <span className="font-semibold text-white">{overallProgress}%</span>
        </div>
        <ProgressBar percent={overallProgress} />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: "Total KPIs", value: kpis.length, color: "text-white" },
          { label: "On Track", value: onTrack, color: "text-emerald-500" },
          { label: "At Risk", value: atRisk, color: "text-amber-500" },
          { label: "Behind", value: behind, color: "text-red-400" },
          { label: "Complete", value: complete, color: "text-blue-400" },
          { label: "Paused", value: paused, color: "text-stone-400" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-app-border bg-app-panel/60 px-3 py-2"
          >
            <p className={`text-lg font-bold leading-tight ${stat.color}`}>
              {stat.value}
            </p>
            <p className="mt-0.5 text-[10px] uppercase tracking-wide text-app-muted">
              {stat.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState({
  memberName,
  onAdd,
}: {
  memberName: string;
  onAdd: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-app-border bg-app-panel px-6 py-14 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand/10">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-brand"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </div>
      <p className="mb-1 text-sm font-semibold text-white">
        No KPIs yet for {getFirstName(memberName)}
      </p>
      <p className="mb-5 text-xs text-app-muted">
        Create the first KPI to start tracking progress.
      </p>
      <button
        type="button"
        onClick={onAdd}
        className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-slate-100 transition hover:opacity-90"
      >
        Add First KPI
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main client component
// ---------------------------------------------------------------------------

interface MemberKpiTrackersClientProps {
  initialData: MemberKpiInitialData;
}

export function MemberKpiTrackersClient({
  initialData,
}: MemberKpiTrackersClientProps) {
  const [people] = useState<MemberPerson[]>(initialData.people);
  const [kpis, setKpis] = useState<MemberKpiRow[]>(initialData.kpis);
  const [selectedMemberName, setSelectedMemberName] = useState<string>(
    initialData.people[0]?.full_name ?? "",
  );

  // Modal state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingKpi, setEditingKpi] = useState<MemberKpiRow | null>(null);
  const [deletingKpi, setDeletingKpi] = useState<MemberKpiRow | null>(null);
  const [progressKpi, setProgressKpi] = useState<MemberKpiRow | null>(null);

  const selectedPerson = useMemo(
    () => people.find((p) => p.full_name === selectedMemberName) ?? null,
    [people, selectedMemberName],
  );

  const memberKpis = useMemo(
    () => kpis.filter((k) => k.member_name === selectedMemberName),
    [kpis, selectedMemberName],
  );

  const [kpiHistory, setKpiHistory] = useState<Record<string, KpiHistoryRow[]>>({});

  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SalesSyncResult | null>(null);

  // ── CRUD handlers ──────────────────────────────────────────────────────────

  async function handleSyncSalesTracker() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const result = await syncSalesTrackerToKpis(people);
      // Merge returned KPIs into local state (update existing, append new)
      setKpis((prev) => {
        const updated = [...prev];
        for (const incoming of result.kpis) {
          const idx = updated.findIndex((k) => k.id === incoming.id);
          if (idx >= 0) {
            updated[idx] = incoming;
          } else {
            updated.push(incoming);
          }
        }
        return updated;
      });
      setSyncResult(result);
    } catch (err) {
      setSyncResult({
        created: 0,
        updated: 0,
        skipped: [err instanceof Error ? err.message : "Unknown error"],
        kpis: [],
      });
    } finally {
      setSyncing(false);
    }
  }

  async function handleAddKpi(draft: MemberKpiDraft) {
    const created = await createMemberKpi(draft);
    setKpis((prev) => [...prev, created]);
  }

  async function handleEditKpi(draft: MemberKpiDraft) {
    if (!editingKpi) return;
    const updated = await updateMemberKpi(editingKpi.id, draft);
    setKpis((prev) => prev.map((k) => (k.id === updated.id ? updated : k)));
  }

  async function handleDeleteKpi() {
    if (!deletingKpi) return;
    await deleteMemberKpi(deletingKpi.id);
    setKpis((prev) => prev.filter((k) => k.id !== deletingKpi.id));
  }

  async function handleOpenUpdateProgress(kpi: MemberKpiRow) {
    setProgressKpi(kpi);
    if (!kpiHistory[kpi.id]) {
      try {
        const history = await fetchRecentKpiHistory(kpi.id, 10);
        setKpiHistory((prev) => ({ ...prev, [kpi.id]: history }));
      } catch {
        // non-fatal — modal still works without history
      }
    }
  }

  async function handleUpdateProgress(
    currentValue: number | null,
    status: string,
  ) {
    if (!progressKpi) return;
    const id = progressKpi.id;
    const updated = await updateMemberKpiProgress(id, currentValue, status);
    setKpis((prev) => prev.map((k) => (k.id === updated.id ? updated : k)));
    // Refresh history so the trend pill updates immediately
    try {
      const fresh = await fetchRecentKpiHistory(id, 10);
      setKpiHistory((prev) => ({ ...prev, [id]: fresh }));
    } catch {
      // non-fatal
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-app-base">
      {/* Page header */}
      <header className="mb-4 overflow-hidden rounded-b-2xl border-b border-app-border bg-app-panel">
        <div className="border-b border-app-border bg-black px-4 py-4 md:px-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="flex items-center gap-3">
              <Image
                src="/SickFit_-_RED.png"
                alt="SickFit logo"
                width={46}
                height={46}
                className="h-11 w-11 rounded-lg object-contain"
              />
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-app-muted">
                  SickFit
                </p>
                <h1 className="font-heading text-2xl text-white">
                  Member KPI Trackers
                </h1>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/dashboard"
                className="rounded-lg border border-app-border px-3 py-2 text-sm font-semibold text-app-muted transition hover:border-brand hover:bg-brand/10 hover:text-brand"
              >
                Main Dashboard
              </Link>
              <Link
                href="/sales-tracker"
                className="rounded-lg border border-app-border px-3 py-2 text-sm font-semibold text-app-muted transition hover:border-brand hover:bg-brand/10 hover:text-brand"
              >
                Sales Tracker
              </Link>
              <button
                type="button"
                onClick={handleSyncSalesTracker}
                disabled={syncing}
                className="rounded-lg border border-brand/50 bg-brand/10 px-3 py-2 text-sm font-semibold text-brand transition hover:bg-brand/20 disabled:opacity-50"
              >
                {syncing ? "Syncing…" : "↺ Sync Sales Data"}
              </button>
            </div>
          </div>
        </div>
        <div className="px-4 py-3 md:px-6">
          <p className="text-sm text-app-muted">
            Create, track, and review custom KPIs for each SickFit team member.
          </p>
          {syncResult && (
            <div
              className={`mt-2 flex flex-wrap items-start justify-between gap-2 rounded-lg border px-3 py-2 text-xs ${
                syncResult.skipped.length > 0 &&
                syncResult.created === 0 &&
                syncResult.updated === 0
                  ? "border-amber-600/40 bg-amber-600/10 text-amber-600"
                  : "border-emerald-700/40 bg-emerald-700/10 text-emerald-600"
              }`}
            >
              <span>
                Sync complete — {syncResult.created} created,{" "}
                {syncResult.updated} updated
                {syncResult.skipped.length > 0 && (
                  <span className="ml-2 text-amber-600">
                    · Skipped: {syncResult.skipped.join("; ")}
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={() => setSyncResult(null)}
                className="text-app-muted hover:text-foreground"
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="px-4 pb-10 md:px-6">
        {/* No people state */}
        {people.length === 0 && (
          <div className="rounded-xl border border-app-border bg-app-panel p-8 text-center">
            <p className="text-sm text-app-muted">
              No active team members found. Add people in the Main Dashboard
              first.
            </p>
          </div>
        )}

        {people.length > 0 && (
          <>
            {/* Member tab row */}
            <div className="mb-5 overflow-x-auto">
              <div className="flex min-w-max gap-1 rounded-2xl border border-app-border bg-app-panel p-2">
                {people.map((person) => {
                  const isSelected = person.full_name === selectedMemberName;
                  return (
                    <button
                      key={person.id}
                      type="button"
                      onClick={() => setSelectedMemberName(person.full_name)}
                      className={`rounded-xl px-4 py-2 text-sm font-semibold transition whitespace-nowrap ${
                        isSelected
                          ? "bg-brand text-slate-100 shadow"
                          : "text-app-muted hover:bg-app-border/30 hover:text-foreground"
                      }`}
                    >
                      {getFirstName(person.full_name)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Two-column layout */}
            {selectedPerson && (
              <div className="flex flex-col gap-4 md:flex-row md:items-start">
                {/* Left: summary panel */}
                <div className="w-full md:w-56 lg:w-64 flex-shrink-0">
                  <MemberSummaryPanel
                    person={selectedPerson}
                    kpis={memberKpis}
                  />
                </div>

                {/* Right: KPI cards area */}
                <div className="flex-1 min-w-0">
                  {/* Section header */}
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div>
                      <h2 className="font-heading text-lg text-white">
                        {getFirstName(selectedPerson.full_name)}&apos;s KPI
                        Cards
                      </h2>
                      <p className="text-xs text-app-muted">
                        {memberKpis.length} KPI
                        {memberKpis.length !== 1 ? "s" : ""} tracked
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAddModalOpen(true)}
                      className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-slate-100 transition hover:opacity-90"
                    >
                      <span className="text-base leading-none">+</span>
                      Add KPI
                    </button>
                  </div>

                  {/* Cards or empty state */}
                  {memberKpis.length === 0 ? (
                    <EmptyState
                      memberName={selectedMemberName}
                      onAdd={() => setAddModalOpen(true)}
                    />
                  ) : (
                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                      {memberKpis.map((kpi) => (
                        <KpiCard
                          key={kpi.id}
                          kpi={kpi}
                          recentHistory={kpiHistory[kpi.id] ?? []}
                          onEdit={(k) => setEditingKpi(k)}
                          onDelete={(k) => setDeletingKpi(k)}
                          onUpdateProgress={handleOpenUpdateProgress}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add KPI modal */}
      {addModalOpen && (
        <KpiFormModal
          title={`Add KPI — ${getFirstName(selectedMemberName)}`}
          initialForm={{ ...EMPTY_FORM }}
          memberName={selectedMemberName}
          onSave={handleAddKpi}
          onClose={() => setAddModalOpen(false)}
        />
      )}

      {/* Edit KPI modal */}
      {editingKpi && (
        <KpiFormModal
          title={`Edit KPI — ${editingKpi.kpi_name}`}
          initialForm={kpiRowToForm(editingKpi)}
          memberName={selectedMemberName}
          onSave={handleEditKpi}
          onClose={() => setEditingKpi(null)}
        />
      )}

      {/* Delete confirm modal */}
      {deletingKpi && (
        <DeleteConfirmModal
          kpiName={deletingKpi.kpi_name}
          onConfirm={handleDeleteKpi}
          onClose={() => setDeletingKpi(null)}
        />
      )}

      {/* Update progress modal */}
      {progressKpi && (
        <UpdateProgressModal
          kpi={progressKpi}
          recentHistory={kpiHistory[progressKpi.id] ?? []}
          onSave={handleUpdateProgress}
          onClose={() => setProgressKpi(null)}
        />
      )}
    </main>
  );
}
