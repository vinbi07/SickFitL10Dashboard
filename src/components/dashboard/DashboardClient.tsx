"use client";

import { useMemo, useState } from "react";
import { logoutAction } from "@/app/login/actions";
import { MeetingTimer } from "@/components/meeting/MeetingTimer";
import { PresentationSlider } from "@/components/meeting/PresentationSlider";
import {
  AGENDA_SEGMENTS,
  OWNERS,
  OWNER_INITIALS,
  OWNER_ROLES,
  type Owner,
} from "@/lib/constants/agenda";
import { useRealtimeDashboard } from "@/lib/realtime/useRealtimeDashboard";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { DashboardData, IssuePriority, IssueStatus } from "@/lib/types";

interface DashboardClientProps {
  initialData: DashboardData;
}

const ISSUE_STATUS_CYCLE: Record<IssueStatus, IssueStatus> = {
  IDS: "Solved",
  Solved: "Tabled",
  Tabled: "IDS",
};

export function DashboardClient({ initialData }: DashboardClientProps) {
  const [data, setData] = useState(initialData);
  const [presentMode, setPresentMode] = useState(false);
  const [segmentIndex, setSegmentIndex] = useState(0);
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [issueDraft, setIssueDraft] = useState({
    title: "",
    priority: "Med" as IssuePriority,
    owner: OWNERS[0] as Owner,
  });
  const [rockDraft, setRockDraft] = useState<{ title: string; owner: Owner }>({
    title: "",
    owner: OWNERS[0],
  });
  const [todoDraft, setTodoDraft] = useState<{ task: string; owner: Owner }>({
    task: "",
    owner: OWNERS[0],
  });
  const [agendaDrafts, setAgendaDrafts] = useState<
    Record<"Segue" | "Headlines", { text: string; owner: Owner }>
  >({
    Segue: { text: "", owner: OWNERS[0] },
    Headlines: { text: "", owner: OWNERS[0] },
  });
  const [scoreDrafts, setScoreDrafts] = useState<
    Record<Owner, { metric: string; goal: string }>
  >({
    Joey: { metric: "", goal: "" },
    Rena: { metric: "", goal: "" },
    Paden: { metric: "", goal: "" },
    Mike: { metric: "", goal: "" },
    Krystle: { metric: "", goal: "" },
  });

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const scorecardByOwner = useMemo(() => {
    return OWNERS.map((owner) => ({
      owner,
      metrics: data.scorecard.filter((metric) => metric.owner === owner),
    }));
  }, [data.scorecard]);
  const segueItems = useMemo(
    () => data.agenda_items.filter((item) => item.segment === "Segue"),
    [data.agenda_items],
  );
  const headlineItems = useMemo(
    () => data.agenda_items.filter((item) => item.segment === "Headlines"),
    [data.agenda_items],
  );

  useRealtimeDashboard(setData);

  async function updateScoreActual(id: string, rawActual: string) {
    const actual = Number(rawActual);
    const current = data.scorecard.find((item) => item.id === id);

    if (!current || Number.isNaN(actual)) {
      return;
    }

    const status = actual < current.goal ? "Off Track" : "On Track";
    await supabase
      .from("scorecard")
      .update({ actual, status, updated_at: new Date().toISOString() })
      .eq("id", id);
  }

  async function updateScoreGoal(id: string, rawGoal: string) {
    const goal = Number(rawGoal);
    const current = data.scorecard.find((item) => item.id === id);

    if (!current || Number.isNaN(goal)) {
      return;
    }

    const status = current.actual < goal ? "Off Track" : "On Track";
    await supabase
      .from("scorecard")
      .update({ goal, status, updated_at: new Date().toISOString() })
      .eq("id", id);
  }

  async function updateScoreMetricName(id: string, metricName: string) {
    const nextName = metricName.trim();

    if (!nextName) {
      return;
    }

    await supabase
      .from("scorecard")
      .update({ metric_name: nextName, updated_at: new Date().toISOString() })
      .eq("id", id);
  }

  async function toggleScoreStatus(
    id: string,
    currentStatus: "On Track" | "Off Track",
  ) {
    const nextStatus = currentStatus === "On Track" ? "Off Track" : "On Track";

    await supabase
      .from("scorecard")
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq("id", id);
  }

  async function deleteScoreField(id: string) {
    await supabase.from("scorecard").delete().eq("id", id);
  }

  async function addScoreField(owner: Owner) {
    const draft = scoreDrafts[owner];
    const metricName = draft.metric.trim();
    const goal = Number(draft.goal);

    if (!metricName || Number.isNaN(goal)) {
      return;
    }

    await supabase.from("scorecard").insert({
      metric_name: metricName,
      goal,
      actual: 0,
      owner,
      status: "Off Track",
    });

    setScoreDrafts((previous) => ({
      ...previous,
      [owner]: { metric: "", goal: "" },
    }));
  }

  async function cycleIssueStatus(id: string, status: IssueStatus) {
    await supabase
      .from("issues")
      .update({
        status: ISSUE_STATUS_CYCLE[status],
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
  }

  async function addIssue() {
    const title = issueDraft.title.trim();

    if (!title) {
      return;
    }

    await supabase.from("issues").insert({
      title,
      priority: issueDraft.priority,
      status: "IDS",
      notes: "",
      owner: issueDraft.owner,
    });

    setIssueDraft({ title: "", priority: "Med", owner: issueDraft.owner });
  }

  async function updateIssueTitle(id: string, title: string) {
    const nextTitle = title.trim();
    if (!nextTitle) return;

    await supabase
      .from("issues")
      .update({ title: nextTitle, updated_at: new Date().toISOString() })
      .eq("id", id);
  }

  async function updateIssueNotes(id: string, notes: string) {
    await supabase
      .from("issues")
      .update({ notes, updated_at: new Date().toISOString() })
      .eq("id", id);
  }

  async function updateIssueOwner(id: string, owner: Owner) {
    await supabase
      .from("issues")
      .update({ owner, updated_at: new Date().toISOString() })
      .eq("id", id);
  }

  async function deleteIssue(id: string) {
    await supabase.from("issues").delete().eq("id", id);
  }

  async function updateIssuePriority(id: string, priority: IssuePriority) {
    await supabase
      .from("issues")
      .update({ priority, updated_at: new Date().toISOString() })
      .eq("id", id);
  }

  async function toggleRockStatus(
    id: string,
    currentStatus: "On Track" | "Off Track",
  ) {
    const nextStatus = currentStatus === "On Track" ? "Off Track" : "On Track";

    await supabase
      .from("rocks")
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq("id", id);
  }

  async function addRock() {
    const title = rockDraft.title.trim();

    if (!title) {
      return;
    }

    await supabase.from("rocks").insert({
      title,
      owner: rockDraft.owner,
      status: "Off Track",
    });

    setRockDraft((previous) => ({ ...previous, title: "" }));
  }

  async function updateRockTitle(id: string, title: string) {
    const nextTitle = title.trim();
    if (!nextTitle) return;

    await supabase
      .from("rocks")
      .update({ title: nextTitle, updated_at: new Date().toISOString() })
      .eq("id", id);
  }

  async function updateRockOwner(id: string, owner: Owner) {
    await supabase
      .from("rocks")
      .update({ owner, updated_at: new Date().toISOString() })
      .eq("id", id);
  }

  async function deleteRock(id: string) {
    await supabase.from("rocks").delete().eq("id", id);
  }

  async function toggleTodoComplete(id: string, current: boolean) {
    await supabase
      .from("todos")
      .update({ is_complete: !current, updated_at: new Date().toISOString() })
      .eq("id", id);
  }

  async function addTodo() {
    const task = todoDraft.task.trim();

    if (!task) {
      return;
    }

    await supabase.from("todos").insert({
      task_description: task,
      owner: todoDraft.owner,
      is_complete: false,
    });

    setTodoDraft((previous) => ({ ...previous, task: "" }));
  }

  async function updateTodoTask(id: string, taskDescription: string) {
    const nextTask = taskDescription.trim();
    if (!nextTask) return;

    await supabase
      .from("todos")
      .update({
        task_description: nextTask,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
  }

  async function updateTodoOwner(id: string, owner: Owner) {
    await supabase
      .from("todos")
      .update({ owner, updated_at: new Date().toISOString() })
      .eq("id", id);
  }

  async function deleteTodo(id: string) {
    await supabase.from("todos").delete().eq("id", id);
  }

  async function addAgendaItem(segment: "Segue" | "Headlines") {
    const draft = agendaDrafts[segment];
    const text = draft.text.trim();

    if (!text) {
      return;
    }

    await supabase.from("agenda_items").insert({
      segment,
      text,
      owner: draft.owner,
    });

    setAgendaDrafts((previous) => ({
      ...previous,
      [segment]: { ...previous[segment], text: "" },
    }));
  }

  async function updateAgendaItemText(id: string, text: string) {
    const nextText = text.trim();
    if (!nextText) return;

    await supabase
      .from("agenda_items")
      .update({ text: nextText, updated_at: new Date().toISOString() })
      .eq("id", id);
  }

  async function updateAgendaItemOwner(id: string, owner: Owner) {
    await supabase
      .from("agenda_items")
      .update({ owner, updated_at: new Date().toISOString() })
      .eq("id", id);
  }

  async function deleteAgendaItem(id: string) {
    await supabase.from("agenda_items").delete().eq("id", id);
  }

  async function addIssueComment(issueId: string) {
    const text = commentText[issueId]?.trim();

    if (!text) {
      return;
    }

    await supabase
      .from("issue_comments")
      .insert({ issue_id: issueId, comment: text, owner: "Joey" });

    setCommentText((previous) => ({ ...previous, [issueId]: "" }));
  }

  function scorecardSection() {
    return (
      <section className="rounded-2xl border border-app-border bg-app-panel p-4">
        <h2 className="font-heading text-xl text-white">Scorecard by Member</h2>
        <div className="mt-3 space-y-4">
          {scorecardByOwner.map(({ owner, metrics }) => {
            const offTrackCount = metrics.filter(
              (metric) =>
                metric.actual < metric.goal || metric.status === "Off Track",
            ).length;

            return (
              <article
                key={owner}
                className="rounded-xl border border-app-border bg-black/70 p-3"
              >
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-app-border text-xs text-white">
                    {OWNER_INITIALS[owner]}
                  </div>
                  <div>
                    <p className="font-heading text-base text-white">{owner}</p>
                    <p className="text-xs text-app-muted">
                      {OWNER_ROLES[owner]}
                    </p>
                  </div>
                </div>

                {offTrackCount > 0 ? (
                  <div className="mb-3 rounded-md border border-red-900/60 bg-red-950/60 px-3 py-2 text-xs text-red-200">
                    {offTrackCount} metric{offTrackCount > 1 ? "s are" : " is"}{" "}
                    currently off track.
                  </div>
                ) : null}

                <div className="space-y-2">
                  {metrics.map((metric) => {
                    const isAlert = metric.actual < metric.goal;
                    return (
                      <div
                        key={metric.id}
                        className="grid grid-cols-1 gap-2 rounded-lg border border-app-border bg-app-base p-3 md:grid-cols-[2fr_72px_72px_84px_26px]"
                      >
                        <input
                          defaultValue={metric.metric_name}
                          onBlur={(event) =>
                            updateScoreMetricName(metric.id, event.target.value)
                          }
                          className="rounded border border-app-border bg-black px-2 py-1 text-sm text-white outline-none"
                        />
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          defaultValue={metric.goal}
                          onBlur={(event) =>
                            updateScoreGoal(metric.id, event.target.value)
                          }
                          className="rounded border border-app-border bg-black px-2 py-1 text-sm text-white outline-none"
                        />
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          defaultValue={metric.actual}
                          onBlur={(event) =>
                            updateScoreActual(metric.id, event.target.value)
                          }
                          className={`rounded border bg-black px-2 py-1 text-sm text-white outline-none ${
                            isAlert ? "border-brand" : "border-app-border"
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            toggleScoreStatus(metric.id, metric.status)
                          }
                          className={`rounded px-2 py-1 text-xs font-semibold ${
                            metric.status === "On Track"
                              ? "bg-emerald-700 text-white"
                              : "bg-brand text-white"
                          }`}
                        >
                          {metric.status}
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteScoreField(metric.id)}
                          className="text-app-muted transition hover:text-brand"
                          aria-label={`Delete ${metric.metric_name}`}
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}

                  {metrics.length === 0 ? (
                    <p className="text-xs text-app-muted">
                      No metrics yet for {owner}.
                    </p>
                  ) : null}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <input
                    value={scoreDrafts[owner].metric}
                    onChange={(event) =>
                      setScoreDrafts((previous) => ({
                        ...previous,
                        [owner]: {
                          ...previous[owner],
                          metric: event.target.value,
                        },
                      }))
                    }
                    placeholder="New metric name"
                    className="min-w-44 flex-1 rounded border border-app-border bg-app-base px-2 py-1 text-xs text-white"
                  />
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={scoreDrafts[owner].goal}
                    onChange={(event) =>
                      setScoreDrafts((previous) => ({
                        ...previous,
                        [owner]: {
                          ...previous[owner],
                          goal: event.target.value,
                        },
                      }))
                    }
                    placeholder="Goal"
                    className="w-24 rounded border border-app-border bg-app-base px-2 py-1 text-xs text-white"
                  />
                  <button
                    type="button"
                    onClick={() => addScoreField(owner)}
                    className="rounded border border-app-border px-3 py-1 text-xs text-white transition hover:border-brand"
                  >
                    Add Metric
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    );
  }

  function rocksSection() {
    return (
      <section className="rounded-2xl border border-app-border bg-app-panel p-4">
        <h2 className="font-heading text-xl text-white">Rocks</h2>
        <div className="mt-3 space-y-2">
          {data.rocks.map((rock) => (
            <div
              key={rock.id}
              className="space-y-2 rounded-lg border border-app-border bg-black p-3"
            >
              <div className="flex gap-2">
                <input
                  defaultValue={rock.title}
                  onBlur={(event) =>
                    updateRockTitle(rock.id, event.target.value)
                  }
                  className="flex-1 rounded border border-app-border bg-app-base px-2 py-1 text-sm text-white"
                />
                <select
                  value={rock.owner}
                  onChange={(event) =>
                    updateRockOwner(rock.id, event.target.value as Owner)
                  }
                  className="rounded border border-app-border bg-app-base px-2 py-1 text-xs text-white"
                >
                  {OWNERS.map((owner) => (
                    <option key={owner}>{owner}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => toggleRockStatus(rock.id, rock.status)}
                  className={`rounded px-3 py-1 text-xs font-semibold ${
                    rock.status === "On Track"
                      ? "bg-emerald-700 text-white"
                      : "bg-brand text-white"
                  }`}
                >
                  {rock.status}
                </button>
                <button
                  type="button"
                  onClick={() => deleteRock(rock.id)}
                  className="text-app-muted transition hover:text-brand"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}

          <div className="mt-2 flex flex-wrap gap-2 rounded-lg border border-app-border bg-black p-3">
            <input
              value={rockDraft.title}
              onChange={(event) =>
                setRockDraft((previous) => ({
                  ...previous,
                  title: event.target.value,
                }))
              }
              placeholder="Add rock"
              className="min-w-48 flex-1 rounded border border-app-border bg-app-base px-2 py-1 text-sm text-white"
            />
            <select
              value={rockDraft.owner}
              onChange={(event) =>
                setRockDraft((previous) => ({
                  ...previous,
                  owner: event.target.value as Owner,
                }))
              }
              className="rounded border border-app-border bg-app-base px-2 py-1 text-xs text-white"
            >
              {OWNERS.map((owner) => (
                <option key={owner}>{owner}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={addRock}
              className="rounded border border-app-border px-3 py-1 text-xs text-white hover:border-brand"
            >
              Add Rock
            </button>
          </div>
        </div>
      </section>
    );
  }

  function todosSection() {
    return (
      <section className="rounded-2xl border border-app-border bg-app-panel p-4">
        <h2 className="font-heading text-xl text-white">To-Dos</h2>
        <div className="mt-3 space-y-2">
          {data.todos.map((todo) => (
            <div
              key={todo.id}
              className="flex items-center justify-between rounded-lg border border-app-border bg-black p-3"
            >
              <div className="flex flex-1 flex-wrap items-center gap-2">
                <input
                  defaultValue={todo.task_description}
                  onBlur={(event) =>
                    updateTodoTask(todo.id, event.target.value)
                  }
                  className={`min-w-52 flex-1 rounded border border-app-border bg-app-base px-2 py-1 text-sm ${
                    todo.is_complete
                      ? "text-app-muted line-through"
                      : "text-white"
                  }`}
                />
                <select
                  value={todo.owner}
                  onChange={(event) =>
                    updateTodoOwner(todo.id, event.target.value as Owner)
                  }
                  className="rounded border border-app-border bg-app-base px-2 py-1 text-xs text-white"
                >
                  {OWNERS.map((owner) => (
                    <option key={owner}>{owner}</option>
                  ))}
                </select>
              </div>

              <div className="ml-3 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={todo.is_complete}
                  onChange={() => toggleTodoComplete(todo.id, todo.is_complete)}
                  className="h-4 w-4 accent-brand"
                />
                <button
                  type="button"
                  onClick={() => deleteTodo(todo.id)}
                  className="text-xs text-app-muted transition hover:text-brand"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}

          <div className="mt-2 flex flex-wrap gap-2 rounded-lg border border-app-border bg-black p-3">
            <input
              value={todoDraft.task}
              onChange={(event) =>
                setTodoDraft((previous) => ({
                  ...previous,
                  task: event.target.value,
                }))
              }
              placeholder="Add to-do"
              className="min-w-52 flex-1 rounded border border-app-border bg-app-base px-2 py-1 text-sm text-white"
            />
            <select
              value={todoDraft.owner}
              onChange={(event) =>
                setTodoDraft((previous) => ({
                  ...previous,
                  owner: event.target.value as Owner,
                }))
              }
              className="rounded border border-app-border bg-app-base px-2 py-1 text-xs text-white"
            >
              {OWNERS.map((owner) => (
                <option key={owner}>{owner}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={addTodo}
              className="rounded border border-app-border px-3 py-1 text-xs text-white hover:border-brand"
            >
              Add To-Do
            </button>
          </div>
        </div>
      </section>
    );
  }

  function issuesSection() {
    return (
      <section className="rounded-2xl border border-app-border bg-app-panel p-4">
        <h2 className="font-heading text-xl text-white">IDS Issues</h2>
        <div className="mt-3 space-y-3">
          {data.issues.map((issue) => (
            <article
              key={issue.id}
              className="rounded-lg border border-app-border bg-black p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <input
                  defaultValue={issue.title}
                  onBlur={(event) =>
                    updateIssueTitle(issue.id, event.target.value)
                  }
                  className="min-w-52 flex-1 rounded border border-app-border bg-app-base px-2 py-1 text-sm text-white"
                />
                <div className="flex gap-2">
                  <select
                    value={issue.owner}
                    onChange={(event) =>
                      updateIssueOwner(issue.id, event.target.value as Owner)
                    }
                    className="rounded border border-app-border bg-app-base px-2 py-1 text-xs text-white"
                  >
                    {OWNERS.map((owner) => (
                      <option key={owner}>{owner}</option>
                    ))}
                  </select>
                  <select
                    value={issue.priority}
                    onChange={(event) =>
                      updateIssuePriority(
                        issue.id,
                        event.target.value as IssuePriority,
                      )
                    }
                    className="rounded border border-app-border bg-app-base px-2 py-1 text-xs text-white"
                  >
                    <option>High</option>
                    <option>Med</option>
                    <option>Low</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => cycleIssueStatus(issue.id, issue.status)}
                    className="rounded bg-brand px-2 py-1 text-xs font-semibold text-white"
                  >
                    {issue.status}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteIssue(issue.id)}
                    className="rounded border border-app-border px-2 py-1 text-xs text-app-muted hover:text-brand"
                  >
                    Remove
                  </button>
                </div>
              </div>
              <textarea
                defaultValue={issue.notes}
                onBlur={(event) =>
                  updateIssueNotes(issue.id, event.target.value)
                }
                placeholder="Notes / resolution"
                className="mt-2 min-h-20 w-full rounded border border-app-border bg-app-base px-2 py-1 text-sm text-app-muted"
              />

              <div className="mt-3 space-y-1">
                {data.issue_comments
                  .filter((comment) => comment.issue_id === issue.id)
                  .map((comment) => (
                    <p key={comment.id} className="text-xs text-app-muted">
                      {comment.owner}: {comment.comment}
                    </p>
                  ))}
              </div>

              <div className="mt-2 flex gap-2">
                <select
                  className="rounded border border-app-border bg-app-base px-2 py-1 text-xs text-white"
                  defaultValue={OWNERS[0]}
                >
                  {OWNERS.map((owner) => (
                    <option key={owner}>{owner}</option>
                  ))}
                </select>
                <input
                  value={commentText[issue.id] ?? ""}
                  onChange={(event) =>
                    setCommentText((previous) => ({
                      ...previous,
                      [issue.id]: event.target.value,
                    }))
                  }
                  placeholder="Add comment"
                  className="flex-1 rounded border border-app-border bg-app-base px-2 py-1 text-xs text-white"
                />
                <button
                  type="button"
                  onClick={() => addIssueComment(issue.id)}
                  className="rounded border border-app-border px-2 py-1 text-xs text-white"
                >
                  Add
                </button>
              </div>
            </article>
          ))}

          <div className="mt-2 flex flex-wrap gap-2 rounded-lg border border-app-border bg-black p-3">
            <input
              value={issueDraft.title}
              onChange={(event) =>
                setIssueDraft((previous) => ({
                  ...previous,
                  title: event.target.value,
                }))
              }
              placeholder="Add issue"
              className="min-w-52 flex-1 rounded border border-app-border bg-app-base px-2 py-1 text-sm text-white"
            />
            <select
              value={issueDraft.priority}
              onChange={(event) =>
                setIssueDraft((previous) => ({
                  ...previous,
                  priority: event.target.value as IssuePriority,
                }))
              }
              className="rounded border border-app-border bg-app-base px-2 py-1 text-xs text-white"
            >
              <option value="High">High</option>
              <option value="Med">Med</option>
              <option value="Low">Low</option>
            </select>
            <select
              value={issueDraft.owner}
              onChange={(event) =>
                setIssueDraft((previous) => ({
                  ...previous,
                  owner: event.target.value as Owner,
                }))
              }
              className="rounded border border-app-border bg-app-base px-2 py-1 text-xs text-white"
            >
              {OWNERS.map((owner) => (
                <option key={owner}>{owner}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={addIssue}
              className="rounded border border-app-border px-3 py-1 text-xs text-white hover:border-brand"
            >
              Add Issue
            </button>
          </div>
        </div>
      </section>
    );
  }

  function agendaSection() {
    const renderSegment = (segment: "Segue" | "Headlines") => {
      const items = segment === "Segue" ? segueItems : headlineItems;

      return (
        <article className="rounded-xl border border-app-border bg-black/70 p-3">
          <h3 className="font-heading text-base text-white">{segment}</h3>
          <div className="mt-2 space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="space-y-2 rounded-lg border border-app-border bg-app-base p-2"
              >
                <textarea
                  defaultValue={item.text}
                  onBlur={(event) =>
                    updateAgendaItemText(item.id, event.target.value)
                  }
                  className="min-h-16 w-full rounded border border-app-border bg-black px-2 py-1 text-sm text-white"
                />
                <div className="flex items-center justify-between gap-2">
                  <select
                    value={item.owner}
                    onChange={(event) =>
                      updateAgendaItemOwner(
                        item.id,
                        event.target.value as Owner,
                      )
                    }
                    className="rounded border border-app-border bg-black px-2 py-1 text-xs text-white"
                  >
                    {OWNERS.map((owner) => (
                      <option key={owner}>{owner}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => deleteAgendaItem(item.id)}
                    className="text-xs text-app-muted transition hover:text-brand"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            <input
              value={agendaDrafts[segment].text}
              onChange={(event) =>
                setAgendaDrafts((previous) => ({
                  ...previous,
                  [segment]: { ...previous[segment], text: event.target.value },
                }))
              }
              placeholder={`Add ${segment} item`}
              className="min-w-48 flex-1 rounded border border-app-border bg-app-base px-2 py-1 text-xs text-white"
            />
            <select
              value={agendaDrafts[segment].owner}
              onChange={(event) =>
                setAgendaDrafts((previous) => ({
                  ...previous,
                  [segment]: {
                    ...previous[segment],
                    owner: event.target.value as Owner,
                  },
                }))
              }
              className="rounded border border-app-border bg-app-base px-2 py-1 text-xs text-white"
            >
              {OWNERS.map((owner) => (
                <option key={owner}>{owner}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => addAgendaItem(segment)}
              className="rounded border border-app-border px-3 py-1 text-xs text-white hover:border-brand"
            >
              Add
            </button>
          </div>
        </article>
      );
    };

    return (
      <section className="rounded-2xl border border-app-border bg-app-panel p-4">
        <h2 className="font-heading text-xl text-white">Segue & Headlines</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          {renderSegment("Segue")}
          {renderSegment("Headlines")}
        </div>
      </section>
    );
  }

  const currentSegment = AGENDA_SEGMENTS[segmentIndex];

  return (
    <div className="min-h-screen bg-app-base p-4 md:p-6">
      <header className="mb-4 flex flex-col gap-3 rounded-2xl border border-app-border bg-app-panel p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-app-muted">
            SickFit
          </p>
          <h1 className="font-heading text-2xl text-white">L10 Dashboard</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <MeetingTimer key={currentSegment} segment={currentSegment} />
          <span className="rounded border border-app-border px-2 py-1 text-xs text-emerald-400">
            Realtime Sync: Live
          </span>
          <button
            type="button"
            onClick={() => setPresentMode((value) => !value)}
            className={`rounded-lg px-3 py-2 text-sm font-semibold ${
              presentMode
                ? "bg-brand text-white"
                : "border border-app-border text-white"
            }`}
          >
            {presentMode ? "Exit Present" : "Present"}
          </button>
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-lg border border-app-border px-3 py-2 text-sm text-app-muted"
            >
              Logout
            </button>
          </form>
        </div>
      </header>

      {!presentMode ? (
        <main className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {agendaSection()}
          {scorecardSection()}
          {issuesSection()}
          {rocksSection()}
          {todosSection()}
        </main>
      ) : (
        <PresentationSlider
          currentIndex={segmentIndex}
          onIndexChange={setSegmentIndex}
        >
          {currentSegment === "Segue" && agendaSection()}
          {currentSegment === "Scorecard" && scorecardSection()}
          {currentSegment === "Rocks" && rocksSection()}
          {currentSegment === "Headlines" && agendaSection()}
          {currentSegment === "To-Dos" && todosSection()}
          {currentSegment === "IDS" && issuesSection()}
          {currentSegment === "Conclude" && (
            <section className="rounded-lg border border-app-border bg-black p-8">
              <h2 className="font-heading text-3xl text-white">Conclude</h2>
              <p className="mt-3 text-app-muted">
                Recap commitments and finalize outcomes.
              </p>
            </section>
          )}
        </PresentationSlider>
      )}
    </div>
  );
}
