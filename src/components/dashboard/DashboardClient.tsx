"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { logoutAction } from "@/app/login/actions";
import { updateShopifyTargetAction } from "@/app/dashboard/actions";
import { MeetingTimer } from "@/components/meeting/MeetingTimer";
import { PresentationSlider } from "@/components/meeting/PresentationSlider";
import { OWNERS, OWNER_ROLES, ROLE_OPTIONS } from "@/lib/constants/agenda";
import { useRealtimeDashboard } from "@/lib/realtime/useRealtimeDashboard";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type {
  DashboardData,
  IssuePriority,
  IssueStatus,
  ShopifyFinancialSummary,
} from "@/lib/types";

interface DashboardClientProps {
  initialData: DashboardData;
}

const ISSUE_STATUS_CYCLE: Record<IssueStatus, IssueStatus> = {
  IDS: "Solved",
  Solved: "Tabled",
  Tabled: "IDS",
};

const DEFAULT_ACCENT_COLOR = "#ef4444";
const CORE_SEGMENT_KEYS = [
  "Segue",
  "Scorecard",
  "Rocks",
  "Headlines",
  "Links",
  "To-Dos",
  "IDS",
  "Conclude",
];

const DASHBOARD_SECTIONS = [
  {
    id: "kpi-insights",
    label: "KPI Insights",
    keywords: ["kpi", "trend", "prediction", "signals"],
  },
  {
    id: "financials",
    label: "Financials",
    keywords: ["financial", "shopify", "grants", "revenue", "profit"],
  },
  {
    id: "meeting-format",
    label: "Meeting Format",
    keywords: ["format", "timer", "segments", "agenda order"],
  },
  {
    id: "agenda",
    label: "Segue and Headlines",
    keywords: ["segue", "headlines", "agenda"],
  },
  {
    id: "scorecard",
    label: "Scorecard",
    keywords: ["scorecard", "metrics", "on track", "off track"],
  },
  {
    id: "people",
    label: "People",
    keywords: ["people", "members", "owners", "roles"],
  },
  {
    id: "issues",
    label: "IDS Issues",
    keywords: ["ids", "issues", "solved", "tabled"],
  },
  {
    id: "todo-list",
    label: "To-Do List",
    keywords: ["todo", "rocks", "priority", "backlog"],
  },
  {
    id: "todo-timeline",
    label: "To-Do Timeline",
    keywords: ["timeline", "due date", "tasks"],
  },
  {
    id: "meeting-links",
    label: "Meeting Links",
    keywords: ["links", "youtube", "loom", "slides"],
  },
  {
    id: "conclude",
    label: "Conclude",
    keywords: ["conclude", "recap", "decisions", "next actions"],
  },
  {
    id: "past-meetings",
    label: "Past Meetings",
    keywords: ["history", "past", "meetings", "duration", "time"],
  },
] as const;

type DashboardSectionId = (typeof DASHBOARD_SECTIONS)[number]["id"];
type SaveState = "idle" | "saving" | "saved" | "error";
type KpiInsightsData = {
  points: Array<{
    label: string;
    goal: number;
    actual: number;
    delta: number;
  }>;
  ownerConsistency: Array<{ owner: string; consistency: number }>;
  offTrackStreaks: Array<{
    owner: string;
    metricName: string;
    current: number;
  }>;
  scorecardMetrics: Array<{
    id: string;
    owner: string;
    metric_name: string;
    goal: number;
    actual: number;
  }>;
  latestDelta: number;
  nextDeltaPrediction: number;
};

type FinancialSnapshot = {
  label: string;
  actual: number;
  target: number;
};

type FinancialSubsection = {
  id: string;
  title: string;
  statusLabel: string;
  description: string;
  accentClass: string;
  snapshots: FinancialSnapshot[];
  summary: Array<{ label: string; value: string }>;
  note: string;
};

function normalizeUrl(rawValue: string) {
  const trimmed = rawValue.trim();
  if (!trimmed) {
    return null;
  }

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const parsed = new URL(withProtocol);
    return parsed.toString();
  } catch {
    return null;
  }
}

function getEmbedUrl(url: string) {
  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const host = parsed.hostname.replace(/^www\./i, "");
  const path = parsed.pathname;

  if (host === "youtube.com" || host === "m.youtube.com") {
    const videoId = parsed.searchParams.get("v");
    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}`;
    }
  }

  if (host === "youtu.be") {
    const videoId = path.split("/").filter(Boolean)[0];
    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}`;
    }
  }

  if (host === "vimeo.com") {
    const videoId = path.split("/").filter(Boolean)[0];
    if (videoId) {
      return `https://player.vimeo.com/video/${videoId}`;
    }
  }

  if (host === "loom.com") {
    const shareId = path.match(/\/share\/([^/?#]+)/i)?.[1];
    if (shareId) {
      return `https://www.loom.com/embed/${shareId}`;
    }
  }

  if (host === "docs.google.com" && path.includes("/presentation/")) {
    const docId = path.match(/\/presentation\/d\/([^/]+)/i)?.[1];
    if (docId) {
      return `https://docs.google.com/presentation/d/${docId}/embed?start=false&loop=false&delayms=3000`;
    }
  }

  return null;
}

function getInitials(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "--";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function normalizeAccentColor(rawValue?: string | null) {
  const value = (rawValue ?? "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : DEFAULT_ACCENT_COLOR;
}

function toDurationLabel(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }

  return `${minutes}m ${seconds}s`;
}

function buildDemoKpiInsights(): KpiInsightsData {
  const owners = Object.entries(OWNER_ROLES);
  const now = new Date();
  const points = [
    { goal: 440, actual: 406 },
    { goal: 448, actual: 420 },
    { goal: 452, actual: 435 },
    { goal: 460, actual: 441 },
    { goal: 468, actual: 456 },
    { goal: 476, actual: 470 },
  ].map((point, index) => {
    const date = new Date(now);
    date.setDate(now.getDate() - (5 - index) * 7);

    return {
      label: date.toLocaleDateString(),
      goal: point.goal,
      actual: point.actual,
      delta: point.actual - point.goal,
    };
  });

  const ownerConsistency = owners.map(([owner, role], index) => {
    const roleBias = role.includes("CEO")
      ? 0.94
      : role.includes("CTO")
        ? 0.9
        : role.includes("Partnership")
          ? 0.86
          : role.includes("Graphic")
            ? 0.84
            : 0.88;
    const consistency = Math.max(0.62, Math.min(0.97, roleBias - index * 0.01));

    return { owner, consistency };
  });

  const offTrackStreaks = [
    { owner: "Paden", metricName: "Company EBITDA Margin", current: 2 },
    { owner: "Joey", metricName: "Platform Uptime", current: 2 },
    { owner: "Rena", metricName: "Partner-Sourced Revenue", current: 3 },
    { owner: "Mike", metricName: "Creative Delivery SLA", current: 2 },
    { owner: "Krystle", metricName: "Qualified Pipeline Coverage", current: 2 },
  ];
  const scorecardMetrics = [
    {
      id: "demo-cto-uptime",
      owner: "Joey",
      metric_name: "Platform Uptime %",
      goal: 99.95,
      actual: 99.97,
    },
    {
      id: "demo-cto-deploy-frequency",
      owner: "Joey",
      metric_name: "Weekly Deploy Frequency",
      goal: 12,
      actual: 13,
    },
    {
      id: "demo-cto-incidents",
      owner: "Joey",
      metric_name: "Resolved Incident Count",
      goal: 8,
      actual: 8,
    },
    {
      id: "demo-cto-coverage",
      owner: "Joey",
      metric_name: "Automated Test Coverage %",
      goal: 85,
      actual: 82,
    },
    {
      id: "demo-brand-revenue",
      owner: "Rena",
      metric_name: "Partner-Sourced Revenue ($k)",
      goal: 180,
      actual: 186,
    },
    {
      id: "demo-brand-engagement",
      owner: "Rena",
      metric_name: "Campaign Engagement %",
      goal: 6.5,
      actual: 7.1,
    },
    {
      id: "demo-brand-mql",
      owner: "Rena",
      metric_name: "Marketing Qualified Leads",
      goal: 220,
      actual: 190,
    },
    {
      id: "demo-ceo-ebitda",
      owner: "Paden",
      metric_name: "EBITDA Margin %",
      goal: 24,
      actual: 21.8,
    },
    {
      id: "demo-ceo-retention",
      owner: "Paden",
      metric_name: "Net Revenue Retention %",
      goal: 108,
      actual: 111,
    },
    {
      id: "demo-design-sla",
      owner: "Mike",
      metric_name: "Creative Delivery SLA %",
      goal: 96,
      actual: 92,
    },
    {
      id: "demo-design-approval",
      owner: "Mike",
      metric_name: "First-Pass Approval %",
      goal: 82,
      actual: 79,
    },
    {
      id: "demo-sales-pipeline",
      owner: "Krystle",
      metric_name: "Pipeline Coverage (x)",
      goal: 3.2,
      actual: 2.6,
    },
    {
      id: "demo-sales-win",
      owner: "Krystle",
      metric_name: "Win Rate %",
      goal: 28,
      actual: 30,
    },
  ];

  const latestDelta = points[points.length - 1]?.delta ?? 0;
  const avgStep =
    points.length > 1
      ? (points[points.length - 1].delta - points[0].delta) /
        (points.length - 1)
      : 0;
  const nextDeltaPrediction = latestDelta + avgStep;

  return {
    points,
    ownerConsistency,
    offTrackStreaks,
    scorecardMetrics,
    latestDelta,
    nextDeltaPrediction,
  };
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function formatFinancialValue(value: number, label: string) {
  const normalizedLabel = label.toLowerCase();

  if (normalizedLabel.includes("%")) {
    return formatPercent(value);
  }

  if (normalizedLabel.includes("x")) {
    return `${value.toFixed(1)}x`;
  }

  if (
    /revenue|profit|margin|gmv|shopify|orders|aov|retention|ebitda|cash|mrr|arr|pipeline/.test(
      normalizedLabel,
    )
  ) {
    if (value >= 1000) {
      return `${Math.round(value / 1000)}k`;
    }

    return value % 1 === 0
      ? value.toLocaleString("en-US", { maximumFractionDigits: 0 })
      : value.toLocaleString("en-US", { maximumFractionDigits: 1 });
  }

  return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function buildFinancialSubsections(
  scorecardMetrics: Array<{
    metric_name: string;
    goal: number;
    actual: number;
    owner: string;
  }>,
  shopifyFinancials: ShopifyFinancialSummary | null,
): FinancialSubsection[] {
  const formatMoney = (
    value: number,
    currencyCode: string,
    maximumFractionDigits = 0,
  ) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits,
    }).format(value);

  const financeMetrics = scorecardMetrics.filter((metric) => {
    const value = metric.metric_name.toLowerCase();
    return /revenue|profit|margin|gmv|shopify|orders|aov|retention|ebitda|cash|mrr|arr/.test(
      value,
    );
  });

  const shopifyMetrics =
    financeMetrics.length > 0
      ? financeMetrics
      : [
          {
            metric_name: "Shopify Revenue",
            goal: 460000,
            actual: 421000,
            owner: "Finance",
          },
          { metric_name: "Orders", goal: 8200, actual: 7680, owner: "Finance" },
          { metric_name: "AOV", goal: 58, actual: 61, owner: "Finance" },
          {
            metric_name: "Gross Margin",
            goal: 54,
            actual: 50,
            owner: "Finance",
          },
        ];

  const completed = shopifyMetrics.filter(
    (metric) => metric.actual >= metric.goal,
  ).length;
  const primaryMetric =
    financeMetrics.find((metric) =>
      /revenue|profit|gmv|mrr|arr|cash|shopify/.test(
        metric.metric_name.toLowerCase(),
      ),
    ) ?? shopifyMetrics[0];
  const averageCompletion =
    shopifyMetrics.length === 0
      ? 0
      : shopifyMetrics.reduce(
          (sum, metric) =>
            sum + Math.min(1, metric.actual / Math.max(metric.goal, 1)),
          0,
        ) / shopifyMetrics.length;

  const liveOrderSnapshots = shopifyFinancials?.recentOrders.length
    ? shopifyFinancials.recentOrders.slice(0, 3).map((order) => ({
        label: order.name,
        actual: order.totalPrice,
        target: shopifyFinancials.aov || order.totalPrice || 1,
      }))
    : null;

  const shopifySummary = shopifyFinancials
    ? [
        {
          label: "Revenue",
          value: formatMoney(
            shopifyFinancials.revenue,
            shopifyFinancials.currencyCode,
          ),
        },
        {
          label: "AOV",
          value: formatMoney(
            shopifyFinancials.aov,
            shopifyFinancials.currencyCode,
          ),
        },
        {
          label: "Orders",
          value: String(shopifyFinancials.orderCount),
        },
      ]
    : [
        {
          label: primaryMetric.metric_name,
          value: formatFinancialValue(
            primaryMetric.actual,
            primaryMetric.metric_name,
          ),
        },
        {
          label: "Goal attainment",
          value: formatPercent(averageCompletion * 100),
        },
        { label: "Tracked metrics", value: String(shopifyMetrics.length) },
      ];

  const shopifySnapshots =
    liveOrderSnapshots ??
    shopifyMetrics.map((metric, index) => {
      const label =
        index === 0
          ? metric.metric_name
          : metric.metric_name.replace(/^Shopify\s+/i, "");

      return {
        label,
        actual: metric.actual,
        target: metric.goal,
      };
    });

  const shopifyDescription = shopifyFinancials
    ? `Live Shopify orders from ${shopifyFinancials.storeDomain} with revenue and AOV computed from transactional data.`
    : "Scorecard-derived commerce metrics for revenue and order health. This lane is structured for Shopify, but it is not wired to the Shopify API yet.";

  const shopifyNote = shopifyFinancials
    ? `Revenue = sum of order total_price. AOV = revenue / order count. Last sync ${new Date(shopifyFinancials.fetchedAt).toLocaleString()}.`
    : "No Shopify API key is needed for this version because the chart uses existing dashboard scorecard values and built-in placeholders only.";

  const grantsSnapshots: FinancialSnapshot[] = [
    { label: "Grant pipeline", actual: 0, target: 1 },
    { label: "Applications", actual: 0, target: 1 },
    { label: "Awards", actual: 0, target: 1 },
  ];

  return [
    {
      id: "shopify",
      title: "Shopify",
      statusLabel: shopifyFinancials
        ? `${shopifyFinancials.orderCount} orders live`
        : `${completed}/${shopifyMetrics.length} metrics on target`,
      description: shopifyDescription,
      accentClass: "border-emerald-700 bg-emerald-500/10 text-emerald-200",
      snapshots: shopifySnapshots,
      summary: shopifySummary,
      note: shopifyNote,
    },
    {
      id: "grants",
      title: "Grants",
      statusLabel: "Coming soon",
      description:
        "Reserved for data that will arrive from another repo or project once the grants pipeline is connected.",
      accentClass: "border-[#e72027]/70 bg-[#e72027]/10 text-white",
      snapshots: grantsSnapshots,
      summary: [
        { label: "Source", value: "External repo" },
        { label: "Status", value: "Planned" },
        { label: "Visibility", value: "Pending" },
      ],
      note: "This panel is intentionally scoped as a placeholder so the section can stay full width without blocking future work.",
    },
    {
      id: "add-another",
      title: "Add another financials subsection",
      statusLabel: "Expandable",
      description:
        "Reserve space for another finance-specific lane such as subscriptions, donations, or unit economics.",
      accentClass: "border-app-border bg-app-base text-app-muted",
      snapshots: [
        { label: "New lane", actual: 1, target: 1 },
        { label: "Layout", actual: 1, target: 1 },
        { label: "Ready", actual: 1, target: 1 },
      ],
      summary: [
        { label: "Template", value: "Ready" },
        { label: "Growth", value: "Open" },
        { label: "Fit", value: "Flexible" },
      ],
      note: "Use this lane to add more financial categories later without changing the full-width section structure.",
    },
  ];
}

export function DashboardClient({ initialData }: DashboardClientProps) {
  const [data, setData] = useState(initialData);
  const [presentMode, setPresentMode] = useState(false);
  const [segmentIndex, setSegmentIndex] = useState(0);
  const [shopifyPeriod, setShopifyPeriod] = useState<"7day" | "30day">("7day");
  const [editingTarget, setEditingTarget] = useState<{
    metricName: string;
    value: string;
  } | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [issueDraft, setIssueDraft] = useState<{
    title: string;
    priority: IssuePriority;
    owner: string;
  }>({
    title: "",
    priority: "Med" as IssuePriority,
    owner: OWNERS[0],
  });
  const [rockDraft, setRockDraft] = useState<{
    title: string;
    owner: string;
    dueDate: string;
  }>({
    title: "",
    owner: OWNERS[0],
    dueDate: "",
  });
  const [todoDraft, setTodoDraft] = useState<{
    task: string;
    owner: string;
    dueDate: string;
  }>({
    task: "",
    owner: OWNERS[0],
    dueDate: "",
  });
  const [agendaDrafts, setAgendaDrafts] = useState<
    Record<"Segue" | "Headlines", { text: string; owner: string }>
  >({
    Segue: { text: "", owner: OWNERS[0] },
    Headlines: { text: "", owner: OWNERS[0] },
  });
  const [concludeDraft, setConcludeDraft] = useState("");
  const [editingConcludeId, setEditingConcludeId] = useState<string | null>(
    null,
  );
  const [editingConcludeText, setEditingConcludeText] = useState("");
  const [draggingTask, setDraggingTask] = useState<{
    type: "rock" | "todo";
    id: string;
  } | null>(null);
  const [meetingLinkDraft, setMeetingLinkDraft] = useState<{
    url: string;
    owner: string;
  }>({
    url: "",
    owner: OWNERS[0],
  });
  const [scoreDrafts, setScoreDrafts] = useState<
    Record<string, { metric: string; goal: string }>
  >({});
  const [personDraft, setPersonDraft] = useState({
    fullName: "",
    username: "",
    email: "",
    role: "Member",
    accentColor: DEFAULT_ACCENT_COLOR,
  });
  const [customSegmentDraft, setCustomSegmentDraft] = useState({
    key: "",
    label: "",
    duration: "5",
  });
  const [draggingFormatSegmentId, setDraggingFormatSegmentId] = useState<
    string | null
  >(null);
  const [formatDropIndicator, setFormatDropIndicator] = useState<{
    targetId: string;
    position: "above" | "below";
  } | null>(null);
  const [sectionQuery, setSectionQuery] = useState("");
  const [highlightedSectionId, setHighlightedSectionId] =
    useState<DashboardSectionId | null>(null);
  const [demoKpiInsights, setDemoKpiInsights] =
    useState<KpiInsightsData | null>(null);
  const [saveStatusByKey, setSaveStatusByKey] = useState<
    Record<string, { state: SaveState; errorMessage?: string }>
  >({});
  const sectionRefs = useRef<
    Partial<Record<DashboardSectionId, HTMLElement | null>>
  >({});
  const highlightTimeoutRef = useRef<number | null>(null);
  const saveStatusTimeoutRef = useRef<Record<string, number>>({});

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const assignableOwners = useMemo(() => {
    const activeNames = data.people
      .filter((person) => person.is_active)
      .map((person) => person.full_name.trim())
      .filter(Boolean);
    const unique = Array.from(new Set(activeNames));

    return unique.length > 0 ? unique : [...OWNERS];
  }, [data.people]);
  const fallbackAssignee = assignableOwners[0] ?? OWNERS[0];
  const ownerOptionsFor = (ownerValue: string) =>
    assignableOwners.includes(ownerValue)
      ? assignableOwners
      : [ownerValue, ...assignableOwners];
  const roleOptions = useMemo(() => {
    const fromPeople = data.people
      .map((person) => person.role.trim())
      .filter(Boolean);
    const merged = Array.from(new Set([...ROLE_OPTIONS, ...fromPeople]));

    return merged.length > 0 ? merged : ["Member"];
  }, [data.people]);
  const ownerRoleByName = useMemo(() => {
    const map = new Map<string, string>();

    for (const person of data.people) {
      map.set(person.full_name, person.role || "Member");
    }

    for (const [owner, role] of Object.entries(OWNER_ROLES)) {
      if (!map.has(owner)) {
        map.set(owner, role);
      }
    }

    return map;
  }, [data.people]);
  const ownerAccentByName = useMemo(() => {
    const map = new Map<string, string>();

    for (const person of data.people) {
      map.set(person.full_name, normalizeAccentColor(person.accent_color));
    }

    return map;
  }, [data.people]);
  const taskAccentStyle = (owner: string) => {
    const color = ownerAccentByName.get(owner);
    if (!color) return undefined;

    return {
      borderColor: color,
      boxShadow: `0 0 0 1px ${color}33 inset`,
    };
  };
  const taskHealthBySource = useMemo(() => {
    const map = new Map<string, (typeof data.task_health_summary)[number]>();

    for (const summary of data.task_health_summary) {
      map.set(`${summary.source_table}:${summary.source_id}`, summary);
    }

    return map;
  }, [data.task_health_summary]);
  const healthPillClassName = (healthColor?: string | null) => {
    if (healthColor === "green") {
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
    }
    if (healthColor === "yellow") {
      return "border-amber-500/40 bg-amber-500/10 text-amber-300";
    }
    if (healthColor === "red") {
      return "border-[#e72027]/50 bg-[#e72027]/12 text-[#ff7c82]";
    }
    return "border-app-border bg-app-base text-app-muted";
  };
  const healthBlockClassName = (healthColor?: string | null) => {
    if (healthColor === "green") {
      return "border-emerald-500/45 bg-emerald-500/12";
    }
    if (healthColor === "yellow") {
      return "border-amber-500/45 bg-amber-500/12";
    }
    if (healthColor === "red") {
      return "border-[#e72027]/55 bg-[#e72027]/16";
    }
    return "border-app-border bg-app-base";
  };
  const healthLabel = (healthColor?: string | null) => {
    if (healthColor === "green") return "Healthy";
    if (healthColor === "yellow") return "Watch";
    if (healthColor === "red") return "Red";
    return "Watch";
  };
  const scorecardOwners = useMemo(() => {
    const fromMetrics = data.scorecard
      .map((metric) => metric.owner)
      .filter(Boolean);

    return Array.from(new Set([...assignableOwners, ...fromMetrics]));
  }, [assignableOwners, data.scorecard]);
  const scorecardByOwner = useMemo(() => {
    return scorecardOwners.map((owner) => ({
      owner,
      metrics: data.scorecard.filter((metric) => metric.owner === owner),
    }));
  }, [data.scorecard, scorecardOwners]);
  const formatSegments = useMemo(() => {
    const sorted = [...data.meeting_format_segments].sort(
      (a, b) => a.sort_order - b.sort_order,
    );
    const active = sorted.filter((segment) => segment.is_enabled);

    if (active.length > 0) {
      return active;
    }

    return CORE_SEGMENT_KEYS.map((key, index) => ({
      id: `fallback-${key}`,
      segment_key: key,
      label:
        key === "Rocks"
          ? "What's This Week"
          : key === "To-Dos"
            ? "Backlog / What to Expect"
            : key,
      duration_minutes: 5,
      sort_order: (index + 1) * 10,
      is_enabled: true,
      created_at: "",
      updated_at: "",
    }));
  }, [data.meeting_format_segments]);
  const segueItems = useMemo(
    () => data.agenda_items.filter((item) => item.segment === "Segue"),
    [data.agenda_items],
  );
  const headlineItems = useMemo(
    () => data.agenda_items.filter((item) => item.segment === "Headlines"),
    [data.agenda_items],
  );
  const taskTimeline = useMemo(() => {
    const healthPriority: Record<string, number> = {
      red: 0,
      yellow: 1,
      green: 2,
      watch: 3,
    };
    const toDateKey = (date: Date) => {
      const year = date.getFullYear();
      const month = `${date.getMonth() + 1}`.padStart(2, "0");
      const day = `${date.getDate()}`.padStart(2, "0");
      return `${year}-${month}-${day}`;
    };
    const compareTasks = (
      a: {
        due_date: string | null;
        healthColor: string;
        priority: "Priority" | "Backlog";
        text: string;
      },
      b: {
        due_date: string | null;
        healthColor: string;
        priority: "Priority" | "Backlog";
        text: string;
      },
    ) => {
      const aHasDate = Boolean(a.due_date);
      const bHasDate = Boolean(b.due_date);
      if (aHasDate && bHasDate && a.due_date !== b.due_date) {
        return (a.due_date ?? "").localeCompare(b.due_date ?? "");
      }
      if (aHasDate !== bHasDate) {
        return aHasDate ? -1 : 1;
      }

      const healthDelta =
        (healthPriority[a.healthColor] ?? 9) -
        (healthPriority[b.healthColor] ?? 9);
      if (healthDelta !== 0) {
        return healthDelta;
      }

      if (a.priority !== b.priority) {
        return a.priority === "Priority" ? -1 : 1;
      }
      return a.text.localeCompare(b.text);
    };

    const allTasks = [
      ...data.rocks.map((rock) => ({
        sourceTable: "rocks" as const,
        sourceId: rock.id,
        id: `rock-${rock.id}`,
        text: rock.title,
        owner: rock.owner,
        due_date: rock.due_date,
        isComplete: false,
        priority: "Priority" as const,
        health: taskHealthBySource.get(`rocks:${rock.id}`) ?? null,
        healthColor:
          taskHealthBySource.get(`rocks:${rock.id}`)?.health_color ?? "watch",
        delayCount: Math.max(
          (taskHealthBySource.get(`rocks:${rock.id}`)?.audit_count ?? 1) - 1,
          0,
        ),
      })),
      ...data.todos.map((todo) => ({
        sourceTable: "todos" as const,
        sourceId: todo.id,
        id: `todo-${todo.id}`,
        text: todo.task_description,
        owner: todo.owner,
        due_date: todo.due_date,
        isComplete: todo.is_complete,
        priority: "Backlog" as const,
        health: taskHealthBySource.get(`todos:${todo.id}`) ?? null,
        healthColor:
          taskHealthBySource.get(`todos:${todo.id}`)?.health_color ?? "watch",
        delayCount: Math.max(
          (taskHealthBySource.get(`todos:${todo.id}`)?.audit_count ?? 1) - 1,
          0,
        ),
      })),
    ];

    const withDate = allTasks
      .filter((task) => Boolean(task.due_date))
      .sort(compareTasks);
    const withoutDate = allTasks.filter((task) => !task.due_date).sort(compareTasks);

    const grouped = withDate.reduce<Record<string, typeof withDate>>(
      (acc, task) => {
        const key = task.due_date as string;
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(task);
        return acc;
      },
      {},
    );

    for (const date of Object.keys(grouped)) {
      grouped[date].sort(compareTasks);
    }

    const pulseSequence = [...withDate, ...withoutDate].sort(compareTasks);
    const today = new Date();
    const calendarDays: Array<{ key: string; label: string; tasks: typeof withDate }> = [];
    for (let offset = 0; offset < 14; offset += 1) {
      const day = new Date(today);
      day.setDate(today.getDate() + offset);
      const key = toDateKey(day);
      calendarDays.push({
        key,
        label: day.toLocaleDateString(undefined, {
          weekday: "short",
          month: "short",
          day: "numeric",
        }),
        tasks: grouped[key] ?? [],
      });
    }

    const healthCounts = allTasks.reduce(
      (acc, task) => {
        if (task.healthColor === "red") acc.red += 1;
        else if (task.healthColor === "yellow") acc.yellow += 1;
        else if (task.healthColor === "green") acc.green += 1;
        else acc.watch += 1;
        return acc;
      },
      { green: 0, yellow: 0, red: 0, watch: 0 },
    );

    return {
      grouped,
      orderedDates: Object.keys(grouped).sort((a, b) => a.localeCompare(b)),
      withoutDate,
      pulseSequence,
      calendarDays,
      healthCounts,
    };
  }, [data.rocks, data.todos, taskHealthBySource]);
  const activeMeeting = useMemo(() => {
    return (
      data.meetings.find((meeting) => !meeting.is_closed) ??
      data.meetings[0] ??
      null
    );
  }, [data.meetings]);
  const meetingHealth = useMemo(() => {
    const totalMetrics = data.scorecard.length;
    const onTrackMetrics = data.scorecard.filter(
      (metric) => metric.status === "On Track" && metric.actual >= metric.goal,
    ).length;
    const totalRocks = data.rocks.length;
    const onTrackRocks = data.rocks.filter(
      (rock) => rock.status === "On Track",
    ).length;
    const totalIssues = data.issues.length;
    const solvedIssues = data.issues.filter(
      (issue) => issue.status === "Solved",
    ).length;
    const totalTodos = data.todos.length;
    const completeTodos = data.todos.filter((todo) => todo.is_complete).length;

    const metricScore = totalMetrics === 0 ? 1 : onTrackMetrics / totalMetrics;
    const rockScore = totalRocks === 0 ? 1 : onTrackRocks / totalRocks;
    const issueScore = totalIssues === 0 ? 1 : solvedIssues / totalIssues;
    const todoScore = totalTodos === 0 ? 1 : completeTodos / totalTodos;

    const score = Math.round(
      (metricScore * 0.3 +
        rockScore * 0.25 +
        issueScore * 0.3 +
        todoScore * 0.15) *
        100,
    );

    const grade =
      score >= 90
        ? "Excellent"
        : score >= 75
          ? "Good"
          : score >= 60
            ? "Fair"
            : "At Risk";

    return { score, grade, solvedIssues, totalIssues };
  }, [data.issues, data.rocks, data.scorecard, data.todos]);
  const kpiInsights = useMemo(() => {
    const snapshots = [...data.meeting_snapshots].sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );

    const points: Array<{
      label: string;
      goal: number;
      actual: number;
      delta: number;
    }> = [];
    const ownerStats = new Map<string, { total: number; onTrack: number }>();
    const metricStreaks = new Map<
      string,
      { owner: string; metricName: string; current: number; lastSeen: number }
    >();

    snapshots.forEach((snapshot, snapshotIndex) => {
      const payload = snapshot.payload as { scorecard?: unknown };
      const scoreRows = Array.isArray(payload?.scorecard)
        ? payload.scorecard
        : [];

      let goal = 0;
      let actual = 0;

      for (const rawRow of scoreRows) {
        if (!rawRow || typeof rawRow !== "object") continue;

        const row = rawRow as {
          goal?: number;
          actual?: number;
          owner?: string;
          metric_name?: string;
          status?: string;
        };

        const metricGoal = Number(row.goal ?? 0);
        const metricActual = Number(row.actual ?? 0);
        if (!Number.isFinite(metricGoal) || !Number.isFinite(metricActual)) {
          continue;
        }

        goal += metricGoal;
        actual += metricActual;

        const owner = (row.owner ?? "Unknown").trim() || "Unknown";
        const metricName = (row.metric_name ?? "Metric").trim() || "Metric";
        const isOffTrack =
          metricActual < metricGoal || (row.status ?? "") === "Off Track";

        const ownerEntry = ownerStats.get(owner) ?? { total: 0, onTrack: 0 };
        ownerEntry.total += 1;
        if (!isOffTrack) ownerEntry.onTrack += 1;
        ownerStats.set(owner, ownerEntry);

        const metricKey = `${owner}::${metricName}`;
        const prev = metricStreaks.get(metricKey) ?? {
          owner,
          metricName,
          current: 0,
          lastSeen: -1,
        };
        prev.current = isOffTrack ? prev.current + 1 : 0;
        prev.lastSeen = snapshotIndex;
        metricStreaks.set(metricKey, prev);
      }

      points.push({
        label: new Date(snapshot.created_at).toLocaleDateString(),
        goal,
        actual,
        delta: actual - goal,
      });
    });

    const ownerConsistency = Array.from(ownerStats.entries())
      .map(([owner, stat]) => ({
        owner,
        consistency: stat.total === 0 ? 0 : stat.onTrack / stat.total,
      }))
      .sort((a, b) => b.consistency - a.consistency);

    const lastSnapshotIndex = points.length - 1;
    const offTrackStreaks = Array.from(metricStreaks.values())
      .filter(
        (entry) => entry.current > 0 && entry.lastSeen === lastSnapshotIndex,
      )
      .sort((a, b) => b.current - a.current)
      .slice(0, 5);

    const deltas = points.map((point) => point.delta);
    const latestDelta = deltas[deltas.length - 1] ?? 0;
    let nextDeltaPrediction = latestDelta;

    if (deltas.length >= 2) {
      const n = deltas.length;
      const xs = deltas.map((_, idx) => idx + 1);
      const xMean = xs.reduce((sum, x) => sum + x, 0) / n;
      const yMean = deltas.reduce((sum, y) => sum + y, 0) / n;
      const numerator = xs.reduce(
        (sum, x, idx) => sum + (x - xMean) * (deltas[idx] - yMean),
        0,
      );
      const denominator = xs.reduce((sum, x) => sum + (x - xMean) ** 2, 0) || 1;
      const slope = numerator / denominator;
      const intercept = yMean - slope * xMean;
      nextDeltaPrediction = intercept + slope * (n + 1);
    }

    return {
      points,
      ownerConsistency,
      offTrackStreaks,
      latestDelta,
      nextDeltaPrediction,
    };
  }, [data.meeting_snapshots]);
  const scorecardByDepartment = useMemo(() => {
    const grouped = new Map<
      string,
      Array<{
        id: string;
        owner: string;
        metric_name: string;
        goal: number;
        actual: number;
      }>
    >();

    for (const metric of data.scorecard) {
      const department = ownerRoleByName.get(metric.owner) ?? "Member";
      const current = grouped.get(department) ?? [];
      current.push({
        id: metric.id,
        owner: metric.owner,
        metric_name: metric.metric_name,
        goal: metric.goal,
        actual: metric.actual,
      });
      grouped.set(department, current);
    }

    return Array.from(grouped.entries()).map(([department, metrics]) => ({
      department,
      metrics: metrics.sort((a, b) =>
        a.metric_name.localeCompare(b.metric_name),
      ),
    }));
  }, [data.scorecard, ownerRoleByName]);
  const financialSubsections = useMemo(
    () => buildFinancialSubsections(data.scorecard, data.shopify_financials),
    [data.scorecard, data.shopify_financials, shopifyPeriod],
  );
  const safeSegmentIndex = Math.min(
    segmentIndex,
    Math.max(formatSegments.length - 1, 0),
  );

  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current !== null) {
        window.clearTimeout(highlightTimeoutRef.current);
      }

      for (const timeoutId of Object.values(saveStatusTimeoutRef.current)) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);

  const filteredSections = useMemo(() => {
    const query = sectionQuery.trim().toLowerCase();

    if (!query) {
      return DASHBOARD_SECTIONS;
    }

    return DASHBOARD_SECTIONS.filter((section) => {
      const inLabel = section.label.toLowerCase().includes(query);
      const inKeywords = section.keywords.some((keyword) =>
        keyword.toLowerCase().includes(query),
      );

      return inLabel || inKeywords;
    });
  }, [sectionQuery]);

  useRealtimeDashboard(setData);

  function registerSectionRef(sectionId: DashboardSectionId) {
    return (node: HTMLElement | null) => {
      sectionRefs.current[sectionId] = node;
    };
  }

  function jumpToSection(sectionId: DashboardSectionId) {
    const node = sectionRefs.current[sectionId];
    if (!node) {
      return;
    }

    node.scrollIntoView({ behavior: "smooth", block: "start" });
    setHighlightedSectionId(sectionId);

    if (highlightTimeoutRef.current !== null) {
      window.clearTimeout(highlightTimeoutRef.current);
    }

    highlightTimeoutRef.current = window.setTimeout(() => {
      setHighlightedSectionId((current) =>
        current === sectionId ? null : current,
      );
    }, 1400);
  }

  const sectionWrapperClass = (sectionId: DashboardSectionId) =>
    `scroll-mt-36 rounded-2xl transition-all duration-500 ${
      highlightedSectionId === sectionId
        ? "ring-2 ring-[#e72027] shadow-[0_0_0_1px_#e72027]"
        : "ring-0"
    }`;

  function getSaveStatus(statusKey: string): SaveState {
    return saveStatusByKey[statusKey]?.state ?? "idle";
  }

  function getSaveErrorMessage(statusKey: string) {
    return saveStatusByKey[statusKey]?.errorMessage ?? null;
  }

  function updateSaveStatus(
    statusKey: string,
    state: SaveState,
    errorMessage?: string,
  ) {
    setSaveStatusByKey((previous) => ({
      ...previous,
      [statusKey]: {
        state,
        errorMessage: errorMessage ?? previous[statusKey]?.errorMessage,
      },
    }));
  }

  function markSaveSuccess(statusKey: string) {
    updateSaveStatus(statusKey, "saved", undefined);

    const existingTimeout = saveStatusTimeoutRef.current[statusKey];
    if (existingTimeout) {
      window.clearTimeout(existingTimeout);
    }

    saveStatusTimeoutRef.current[statusKey] = window.setTimeout(() => {
      setSaveStatusByKey((previous) => {
        if (previous[statusKey]?.state !== "saved") {
          return previous;
        }

        const next = { ...previous };
        delete next[statusKey];
        return next;
      });
    }, 1200);
  }

  async function runMutation(
    statusKey: string,
    mutation: PromiseLike<{ error: { message?: string } | null }>,
  ) {
    updateSaveStatus(statusKey, "saving");
    const { error } = await mutation;

    if (error) {
      updateSaveStatus(
        statusKey,
        "error",
        error.message?.trim() || "Supabase rejected the update.",
      );
      return false;
    }

    markSaveSuccess(statusKey);
    return true;
  }

  function saveStatusBadge(statusKey: string) {
    const status = getSaveStatus(statusKey);
    const errorMessage = getSaveErrorMessage(statusKey);

    if (status === "idle") {
      return null;
    }

    const content =
      status === "saving"
        ? "Saving..."
        : status === "saved"
          ? "Saved"
          : errorMessage ?? "Failed - retry";
    const className =
      status === "saving"
        ? "border-app-border text-app-muted"
        : status === "saved"
          ? "border-emerald-700 text-emerald-300"
          : "border-[#e72027] text-[#e72027]";

    return (
      <span
        className={`rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${className}`}
      >
        {content}
      </span>
    );
  }

  function toStatusKey(value: string) {
    return value.trim().toLowerCase().replace(/\s+/g, "-");
  }

  async function updateScoreActual(id: string, rawActual: string) {
    const actual = Number(rawActual);
    const current = data.scorecard.find((item) => item.id === id);

    if (!current || Number.isNaN(actual)) {
      return;
    }

    const status = actual < current.goal ? "Off Track" : "On Track";
    await runMutation(
      `score-${id}`,
      supabase
        .from("scorecard")
        .update({ actual, status, updated_at: new Date().toISOString() })
        .eq("id", id),
    );
  }

  async function updateScoreGoal(id: string, rawGoal: string) {
    const goal = Number(rawGoal);
    const current = data.scorecard.find((item) => item.id === id);

    if (!current || Number.isNaN(goal)) {
      return;
    }

    const status = current.actual < goal ? "Off Track" : "On Track";
    await runMutation(
      `score-${id}`,
      supabase
        .from("scorecard")
        .update({ goal, status, updated_at: new Date().toISOString() })
        .eq("id", id),
    );
  }

  async function updateScoreMetricName(id: string, metricName: string) {
    const nextName = metricName.trim();

    if (!nextName) {
      return;
    }

    await runMutation(
      `score-${id}`,
      supabase
        .from("scorecard")
        .update({ metric_name: nextName, updated_at: new Date().toISOString() })
        .eq("id", id),
    );
  }

  async function toggleScoreStatus(
    id: string,
    currentStatus: "On Track" | "Off Track",
  ) {
    const nextStatus = currentStatus === "On Track" ? "Off Track" : "On Track";

    await runMutation(
      `score-${id}`,
      supabase
        .from("scorecard")
        .update({ status: nextStatus, updated_at: new Date().toISOString() })
        .eq("id", id),
    );
  }

  async function deleteScoreField(id: string) {
    await runMutation(
      `score-${id}`,
      supabase.from("scorecard").delete().eq("id", id),
    );
  }

  async function addScoreField(owner: string) {
    const draft = scoreDrafts[owner];
    const metricName = draft.metric.trim();
    const goal = Number(draft.goal);

    if (!metricName || Number.isNaN(goal)) {
      return;
    }

    const ownerKey = toStatusKey(owner);
    const success = await runMutation(
      `score-add-${ownerKey}`,
      supabase.from("scorecard").insert({
        metric_name: metricName,
        goal,
        actual: 0,
        owner,
        status: "Off Track",
      }),
    );

    if (!success) {
      return;
    }

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

  async function updateIssueOwner(id: string, owner: string) {
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

    await runMutation(
      `rock-${id}`,
      supabase
        .from("rocks")
        .update({ status: nextStatus, updated_at: new Date().toISOString() })
        .eq("id", id),
    );
  }

  async function addRock() {
    const title = rockDraft.title.trim();

    if (!title) {
      return;
    }

    const success = await runMutation(
      "rock-add",
      supabase.from("rocks").insert({
        title,
        owner: rockDraft.owner,
        status: "Off Track",
        due_date: rockDraft.dueDate || null,
      }),
    );

    if (!success) {
      return;
    }

    setRockDraft((previous) => ({ ...previous, title: "", dueDate: "" }));
  }

  async function updateRockTitle(id: string, title: string) {
    const nextTitle = title.trim();
    if (!nextTitle) return;

    await runMutation(
      `rock-${id}`,
      supabase
        .from("rocks")
        .update({ title: nextTitle, updated_at: new Date().toISOString() })
        .eq("id", id),
    );
  }

  async function updateRockOwner(id: string, owner: string) {
    await runMutation(
      `rock-${id}`,
      supabase
        .from("rocks")
        .update({ owner, updated_at: new Date().toISOString() })
        .eq("id", id),
    );
  }

  async function updateRockDueDate(id: string, dueDate: string) {
    await runMutation(
      `rock-${id}`,
      supabase
        .from("rocks")
        .update({
          due_date: dueDate || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id),
    );
  }

  async function deleteRock(id: string) {
    await runMutation(
      `rock-${id}`,
      supabase.from("rocks").delete().eq("id", id),
    );
  }

  async function archiveRock(id: string) {
    await runMutation(
      `rock-${id}`,
      supabase
        .from("rocks")
        .update({ is_archived: true, updated_at: new Date().toISOString() })
        .eq("id", id),
    );
  }

  async function unarchiveRock(id: string) {
    await runMutation(
      `rock-${id}`,
      supabase
        .from("rocks")
        .update({ is_archived: false, updated_at: new Date().toISOString() })
        .eq("id", id),
    );
  }

  async function toggleTodoComplete(id: string, current: boolean) {
    await runMutation(
      `todo-${id}`,
      supabase
        .from("todos")
        .update({ is_complete: !current, updated_at: new Date().toISOString() })
        .eq("id", id),
    );
  }

  async function addTodo() {
    const task = todoDraft.task.trim();

    if (!task) {
      return;
    }

    const success = await runMutation(
      "todo-add",
      supabase.from("todos").insert({
        task_description: task,
        owner: todoDraft.owner,
        is_complete: false,
        due_date: todoDraft.dueDate || null,
      }),
    );

    if (!success) {
      return;
    }

    setTodoDraft((previous) => ({ ...previous, task: "", dueDate: "" }));
  }

  async function updateTodoTask(id: string, taskDescription: string) {
    const nextTask = taskDescription.trim();
    if (!nextTask) return;

    await runMutation(
      `todo-${id}`,
      supabase
        .from("todos")
        .update({
          task_description: nextTask,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id),
    );
  }

  async function updateTodoOwner(id: string, owner: string) {
    await runMutation(
      `todo-${id}`,
      supabase
        .from("todos")
        .update({ owner, updated_at: new Date().toISOString() })
        .eq("id", id),
    );
  }

  async function updateTodoDueDate(id: string, dueDate: string) {
    await runMutation(
      `todo-${id}`,
      supabase
        .from("todos")
        .update({
          due_date: dueDate || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id),
    );
  }

  async function deleteTodo(id: string) {
    await runMutation(
      `todo-${id}`,
      supabase.from("todos").delete().eq("id", id),
    );
  }

  async function archiveTodo(id: string) {
    await runMutation(
      `todo-${id}`,
      supabase
        .from("todos")
        .update({ is_archived: true, updated_at: new Date().toISOString() })
        .eq("id", id),
    );
  }

  async function unarchiveTodo(id: string) {
    await runMutation(
      `todo-${id}`,
      supabase
        .from("todos")
        .update({ is_archived: false, updated_at: new Date().toISOString() })
        .eq("id", id),
    );
  }

  async function moveRockToTodo(rockId: string) {
    const rock = data.rocks.find((item) => item.id === rockId);

    if (!rock) {
      return;
    }

    const inserted = await runMutation(
      `rock-${rockId}`,
      supabase.from("todos").insert({
        task_description: rock.title,
        owner: rock.owner,
        is_complete: rock.status === "On Track",
        due_date: rock.due_date ?? null,
      }),
    );

    if (!inserted) {
      return;
    }

    await runMutation(
      `rock-${rockId}`,
      supabase.from("rocks").delete().eq("id", rockId),
    );
  }

  async function moveTodoToRock(todoId: string) {
    const todo = data.todos.find((item) => item.id === todoId);

    if (!todo) {
      return;
    }

    const inserted = await runMutation(
      `todo-${todoId}`,
      supabase.from("rocks").insert({
        title: todo.task_description,
        owner: todo.owner,
        status: todo.is_complete ? "On Track" : "Off Track",
        due_date: todo.due_date ?? null,
      }),
    );

    if (!inserted) {
      return;
    }

    await runMutation(
      `todo-${todoId}`,
      supabase.from("todos").delete().eq("id", todoId),
    );
  }

  async function dropIntoPriority() {
    if (!draggingTask || draggingTask.type !== "todo") {
      return;
    }

    await moveTodoToRock(draggingTask.id);
    setDraggingTask(null);
  }

  async function dropIntoBacklog() {
    if (!draggingTask || draggingTask.type !== "rock") {
      return;
    }

    await moveRockToTodo(draggingTask.id);
    setDraggingTask(null);
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

  async function updateAgendaItemOwner(id: string, owner: string) {
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
      .insert({ issue_id: issueId, comment: text, owner: fallbackAssignee });

    setCommentText((previous) => ({ ...previous, [issueId]: "" }));
  }

  async function addMeetingLink() {
    const normalizedUrl = normalizeUrl(meetingLinkDraft.url);

    if (!normalizedUrl) {
      return;
    }

    await supabase.from("meeting_links").insert({
      url: normalizedUrl,
      owner: meetingLinkDraft.owner,
    });

    setMeetingLinkDraft((previous) => ({ ...previous, url: "" }));
  }

  async function updateMeetingLinkUrl(id: string, rawUrl: string) {
    const normalizedUrl = normalizeUrl(rawUrl);
    if (!normalizedUrl) {
      return;
    }

    await supabase
      .from("meeting_links")
      .update({ url: normalizedUrl, updated_at: new Date().toISOString() })
      .eq("id", id);
  }

  async function updateMeetingLinkOwner(id: string, owner: string) {
    await supabase
      .from("meeting_links")
      .update({ owner, updated_at: new Date().toISOString() })
      .eq("id", id);
  }

  async function deleteMeetingLink(id: string) {
    await supabase.from("meeting_links").delete().eq("id", id);
  }

  async function addConcludeItem() {
    const nextContent = concludeDraft.trim();

    if (!nextContent) {
      return;
    }

    await supabase.from("conclude_items").insert({ content: nextContent });
    setConcludeDraft("");
  }

  async function addPerson() {
    const fullName = personDraft.fullName.trim();
    const username = personDraft.username.trim().toLowerCase();
    const email = personDraft.email.trim().toLowerCase();
    const role = personDraft.role.trim() || "Member";
    const accentColor = normalizeAccentColor(personDraft.accentColor);

    if (!fullName || !username || !email) {
      return;
    }

    await supabase.from("people").insert({
      full_name: fullName,
      username,
      email,
      role,
      accent_color: accentColor,
      is_active: true,
    });

    setPersonDraft({
      fullName: "",
      username: "",
      email: "",
      role: "Member",
      accentColor: DEFAULT_ACCENT_COLOR,
    });
  }

  async function updatePersonName(id: string, fullName: string) {
    const nextName = fullName.trim();
    if (!nextName) return;

    await supabase
      .from("people")
      .update({ full_name: nextName, updated_at: new Date().toISOString() })
      .eq("id", id);
  }

  async function updatePersonUsername(id: string, username: string) {
    const nextUsername = username.trim().toLowerCase();
    if (!nextUsername) return;

    await supabase
      .from("people")
      .update({ username: nextUsername, updated_at: new Date().toISOString() })
      .eq("id", id);
  }

  async function updatePersonEmail(id: string, email: string) {
    const nextEmail = email.trim().toLowerCase();
    if (!nextEmail) return;

    await supabase
      .from("people")
      .update({ email: nextEmail, updated_at: new Date().toISOString() })
      .eq("id", id);
  }

  async function updatePersonRole(id: string, role: string) {
    const nextRole = role.trim() || "Member";

    await supabase
      .from("people")
      .update({ role: nextRole, updated_at: new Date().toISOString() })
      .eq("id", id);
  }

  async function updatePersonAccentColor(id: string, accentColor: string) {
    const nextColor = normalizeAccentColor(accentColor);

    await supabase
      .from("people")
      .update({ accent_color: nextColor, updated_at: new Date().toISOString() })
      .eq("id", id);
  }

  async function togglePersonActive(id: string, isActive: boolean) {
    await supabase
      .from("people")
      .update({ is_active: !isActive, updated_at: new Date().toISOString() })
      .eq("id", id);
  }

  async function deletePerson(id: string) {
    await supabase.from("people").delete().eq("id", id);
  }

  async function updateConcludeItem(id: string, content: string) {
    const nextContent = content.trim();
    if (!nextContent) {
      return;
    }

    await supabase
      .from("conclude_items")
      .update({ content: nextContent, updated_at: new Date().toISOString() })
      .eq("id", id);
  }

  async function deleteConcludeItem(id: string) {
    await supabase.from("conclude_items").delete().eq("id", id);

    if (editingConcludeId === id) {
      setEditingConcludeId(null);
      setEditingConcludeText("");
    }
  }

  function startConcludeEdit(id: string, content: string) {
    setEditingConcludeId(id);
    setEditingConcludeText(content);
  }

  function cancelConcludeEdit() {
    setEditingConcludeId(null);
    setEditingConcludeText("");
  }

  async function saveConcludeEdit() {
    if (!editingConcludeId) {
      return;
    }

    await updateConcludeItem(editingConcludeId, editingConcludeText);
    setEditingConcludeId(null);
    setEditingConcludeText("");
  }

  async function updateFormatLabel(id: string, label: string) {
    const nextLabel = label.trim();
    if (!nextLabel) {
      return;
    }

    await supabase
      .from("meeting_format_segments")
      .update({ label: nextLabel, updated_at: new Date().toISOString() })
      .eq("id", id);
  }

  async function updateFormatDuration(id: string, rawDuration: string) {
    const durationMinutes = Number(rawDuration);
    if (Number.isNaN(durationMinutes) || durationMinutes < 1) {
      return;
    }

    await supabase
      .from("meeting_format_segments")
      .update({
        duration_minutes: Math.round(durationMinutes),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
  }

  async function toggleFormatEnabled(id: string, isEnabled: boolean) {
    await supabase
      .from("meeting_format_segments")
      .update({ is_enabled: !isEnabled, updated_at: new Date().toISOString() })
      .eq("id", id);
  }

  async function reorderFormatSegments(
    draggedId: string,
    targetId: string,
    position: "above" | "below",
  ) {
    if (draggedId === targetId) {
      return;
    }

    const sorted = [...data.meeting_format_segments].sort(
      (a, b) => a.sort_order - b.sort_order,
    );
    const draggedIndex = sorted.findIndex(
      (segment) => segment.id === draggedId,
    );
    const targetIndex = sorted.findIndex((segment) => segment.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) {
      return;
    }

    const reordered = [...sorted];
    const [draggedSegment] = reordered.splice(draggedIndex, 1);

    let insertIndex = position === "below" ? targetIndex + 1 : targetIndex;
    if (draggedIndex < insertIndex) {
      insertIndex -= 1;
    }

    reordered.splice(insertIndex, 0, draggedSegment);

    await Promise.all(
      reordered.map((segment, index) =>
        supabase
          .from("meeting_format_segments")
          .update({
            sort_order: (index + 1) * 10,
            updated_at: new Date().toISOString(),
          })
          .eq("id", segment.id),
      ),
    );
  }

  async function addCustomFormatSegment() {
    const key = customSegmentDraft.key.trim();
    const label = customSegmentDraft.label.trim();
    const duration = Number(customSegmentDraft.duration);

    if (!key || !label || Number.isNaN(duration) || duration < 1) {
      return;
    }

    const maxOrder = data.meeting_format_segments.reduce(
      (max, segment) => Math.max(max, segment.sort_order),
      0,
    );

    await supabase.from("meeting_format_segments").insert({
      segment_key: key,
      label,
      duration_minutes: Math.round(duration),
      sort_order: maxOrder + 10,
      is_enabled: true,
    });

    setCustomSegmentDraft({ key: "", label: "", duration: "5" });
  }

  async function deleteCustomFormatSegment(id: string, segmentKey: string) {
    if (CORE_SEGMENT_KEYS.includes(segmentKey)) {
      return;
    }

    await supabase.from("meeting_format_segments").delete().eq("id", id);
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
            const ownerDraft = scoreDrafts[owner] ?? { metric: "", goal: "" };

            return (
              <article
                key={owner}
                className="rounded-xl border border-app-border bg-black/70 p-3"
              >
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-app-border text-xs text-white">
                    {getInitials(owner)}
                  </div>
                  <div>
                    <p className="font-heading text-base text-white">{owner}</p>
                    <p className="text-xs text-app-muted">
                      {ownerRoleByName.get(owner) ?? "Member"}
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
                        className="grid grid-cols-1 gap-2 rounded-lg border border-app-border bg-app-base p-3 md:grid-cols-[2fr_72px_72px_84px_96px_26px]"
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
                        <div className="flex items-center justify-end">
                          {saveStatusBadge(`score-${metric.id}`)}
                        </div>
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
                    value={ownerDraft.metric}
                    onChange={(event) =>
                      setScoreDrafts((previous) => ({
                        ...previous,
                        [owner]: {
                          ...(previous[owner] ?? { metric: "", goal: "" }),
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
                    value={ownerDraft.goal}
                    onChange={(event) =>
                      setScoreDrafts((previous) => ({
                        ...previous,
                        [owner]: {
                          ...(previous[owner] ?? { metric: "", goal: "" }),
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
                  {saveStatusBadge(`score-add-${toStatusKey(owner)}`)}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    );
  }

  function rocksSection() {
    const activeRocks = data.rocks.filter((rock) => !rock.is_archived);
    const archivedRocks = data.rocks.filter((rock) => rock.is_archived);
    const activeTodos = data.todos.filter((todo) => !todo.is_archived);
    const archivedTodos = data.todos.filter((todo) => todo.is_archived);
    const totalArchived = archivedRocks.length + archivedTodos.length;

    return (
      <section className="rounded-2xl border border-app-border bg-app-panel p-4">
        <h2 className="font-heading text-xl text-white">To-Do List</h2>
        <p className="mt-1 text-xs text-app-muted">
          Priority items appear first, followed by backlog items.
        </p>
        <div className="mt-3 space-y-2">
          <p className="text-xs uppercase tracking-[0.12em] text-app-muted">
            Priority: What&apos;s This Week
          </p>
          <div
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => void dropIntoPriority()}
            className="rounded border border-dashed border-app-border bg-app-base px-3 py-2 text-xs text-app-muted"
          >
            Drop a backlog item here to convert it to priority.
          </div>
          {activeRocks.map((rock) => (
            <div
              key={rock.id}
              className="space-y-2 rounded-lg border border-app-border bg-black p-3"
              style={taskAccentStyle(rock.owner)}
              draggable
              onDragStart={() => setDraggingTask({ type: "rock", id: rock.id })}
              onDragEnd={() => setDraggingTask(null)}
            >
              <div className="flex gap-2 items-start">
                <span className="select-none cursor-grab active:cursor-grabbing text-app-muted text-lg leading-none pt-0.5 flex-shrink-0">
                  ::
                </span>
                <div className="flex gap-2 flex-1">
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
                      updateRockOwner(rock.id, event.target.value)
                    }
                    className="rounded border border-app-border bg-app-base px-2 py-1 text-xs text-white"
                  >
                    {ownerOptionsFor(rock.owner).map((owner) => (
                      <option key={owner}>{owner}</option>
                    ))}
                  </select>
                  <input
                    type="date"
                    value={rock.due_date ?? ""}
                    onChange={(event) =>
                      updateRockDueDate(rock.id, event.target.value)
                    }
                    className="rounded border border-app-border bg-app-base px-2 py-1 text-xs text-white"
                  />
                </div>
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
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => void moveRockToTodo(rock.id)}
                    className="rounded border border-app-border px-2 py-1 text-xs text-app-muted transition hover:text-white"
                    title="Move to Backlog"
                  >
                    Move to Backlog
                  </button>
                  {saveStatusBadge(`rock-${rock.id}`)}
                  <button
                    type="button"
                    onClick={() => archiveRock(rock.id)}
                    className="text-app-muted transition hover:text-yellow-500"
                    title="Archive"
                  >
                    Archive
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
              placeholder="Add this week item"
              className="min-w-48 flex-1 rounded border border-app-border bg-app-base px-2 py-1 text-sm text-white"
            />
            <select
              value={rockDraft.owner}
              onChange={(event) =>
                setRockDraft((previous) => ({
                  ...previous,
                  owner: event.target.value,
                }))
              }
              className="rounded border border-app-border bg-app-base px-2 py-1 text-xs text-white"
            >
              {ownerOptionsFor(rockDraft.owner).map((owner) => (
                <option key={owner}>{owner}</option>
              ))}
            </select>
            <input
              type="date"
              value={rockDraft.dueDate}
              onChange={(event) =>
                setRockDraft((previous) => ({
                  ...previous,
                  dueDate: event.target.value,
                }))
              }
              className="rounded border border-app-border bg-app-base px-2 py-1 text-xs text-white"
            />
            <button
              type="button"
              onClick={addRock}
              className="rounded border border-app-border px-3 py-1 text-xs text-white hover:border-brand"
            >
              Add This Week Item
            </button>
            {saveStatusBadge("rock-add")}
          </div>

          <div className="mt-4 border-t border-app-border pt-4">
            <p className="mb-2 text-xs uppercase tracking-[0.12em] text-app-muted">
              Backlog / What to Expect
            </p>
            <div
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => void dropIntoBacklog()}
              className="mb-2 rounded border border-dashed border-app-border bg-app-base px-3 py-2 text-xs text-app-muted"
            >
              Drop a priority item here to convert it to backlog.
            </div>

            <div className="space-y-2">
              {activeTodos.map((todo) => (
                <div
                  key={todo.id}
                  className="flex items-center justify-between rounded-lg border border-app-border bg-black p-3"
                  style={taskAccentStyle(todo.owner)}
                  draggable
                  onDragStart={() =>
                    setDraggingTask({ type: "todo", id: todo.id })
                  }
                  onDragEnd={() => setDraggingTask(null)}
                >
                  <div className="flex flex-1 flex-wrap items-center gap-2">
                    <span className="select-none cursor-grab active:cursor-grabbing text-app-muted text-lg leading-none pt-0.5 flex-shrink-0">
                      ::
                    </span>
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
                        updateTodoOwner(todo.id, event.target.value)
                      }
                      className="rounded border border-app-border bg-app-base px-2 py-1 text-xs text-white"
                    >
                      {ownerOptionsFor(todo.owner).map((owner) => (
                        <option key={owner}>{owner}</option>
                      ))}
                    </select>
                    <input
                      type="date"
                      value={todo.due_date ?? ""}
                      onChange={(event) =>
                        updateTodoDueDate(todo.id, event.target.value)
                      }
                      className="rounded border border-app-border bg-app-base px-2 py-1 text-xs text-white"
                    />
                  </div>

                  <div className="ml-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void moveTodoToRock(todo.id)}
                      className="rounded border border-app-border px-2 py-1 text-xs text-app-muted transition hover:text-white"
                      title="Move to What's This Week"
                    >
                      Move to What&apos;s This Week
                    </button>
                    {saveStatusBadge(`todo-${todo.id}`)}
                    <input
                      type="checkbox"
                      checked={todo.is_complete}
                      onChange={() =>
                        toggleTodoComplete(todo.id, todo.is_complete)
                      }
                      className="h-4 w-4 accent-brand"
                    />
                    <button
                      type="button"
                      onClick={() => archiveTodo(todo.id)}
                      className="text-xs text-app-muted transition hover:text-yellow-500"
                      title="Archive"
                    >
                      Archive
                    </button>
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
                  placeholder="Add backlog item"
                  className="min-w-52 flex-1 rounded border border-app-border bg-app-base px-2 py-1 text-sm text-white"
                />
                <select
                  value={todoDraft.owner}
                  onChange={(event) =>
                    setTodoDraft((previous) => ({
                      ...previous,
                      owner: event.target.value,
                    }))
                  }
                  className="rounded border border-app-border bg-app-base px-2 py-1 text-xs text-white"
                >
                  {ownerOptionsFor(todoDraft.owner).map((owner) => (
                    <option key={owner}>{owner}</option>
                  ))}
                </select>
                <input
                  type="date"
                  value={todoDraft.dueDate}
                  onChange={(event) =>
                    setTodoDraft((previous) => ({
                      ...previous,
                      dueDate: event.target.value,
                    }))
                  }
                  className="rounded border border-app-border bg-app-base px-2 py-1 text-xs text-white"
                />
                <button
                  type="button"
                  onClick={addTodo}
                  className="rounded border border-app-border px-3 py-1 text-xs text-white hover:border-brand"
                >
                  Add Backlog Item
                </button>
                {saveStatusBadge("todo-add")}
              </div>
            </div>
          </div>

          {totalArchived > 0 && (
            <div className="mt-4 border-t border-app-border pt-4">
              <button
                type="button"
                onClick={() => setShowArchived(!showArchived)}
                className="mb-3 flex items-center gap-2 rounded border border-app-border px-3 py-2 text-xs font-semibold text-app-muted transition hover:text-white"
              >
                <span>{showArchived ? "▼" : "▶"}</span>
                <span>Archived Items ({totalArchived})</span>
              </button>

              {showArchived && (
                <div className="space-y-2">
                  {archivedRocks.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs uppercase tracking-[0.12em] text-app-muted">
                        Archived Priority
                      </p>
                      {archivedRocks.map((rock) => (
                        <div
                          key={rock.id}
                          className="flex items-center justify-between rounded-lg border border-app-border bg-app-base/50 p-2 opacity-75"
                        >
                          <span className="truncate text-sm text-app-muted">
                            {rock.title}
                          </span>
                          <button
                            type="button"
                            onClick={() => unarchiveRock(rock.id)}
                            className="text-xs text-app-muted transition hover:text-emerald-400"
                          >
                            Restore
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {archivedTodos.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs uppercase tracking-[0.12em] text-app-muted">
                        Archived Backlog
                      </p>
                      {archivedTodos.map((todo) => (
                        <div
                          key={todo.id}
                          className="flex items-center justify-between rounded-lg border border-app-border bg-app-base/50 p-2 opacity-75"
                        >
                          <span
                            className={`truncate text-sm ${
                              todo.is_complete
                                ? "text-app-muted line-through"
                                : "text-app-muted"
                            }`}
                          >
                            {todo.task_description}
                          </span>
                          <button
                            type="button"
                            onClick={() => unarchiveTodo(todo.id)}
                            className="text-xs text-app-muted transition hover:text-emerald-400"
                          >
                            Restore
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    );
  }

  function todoTimelineSection() {
    return (
      <section className="rounded-2xl border border-app-border bg-app-panel p-4">
        <h2 className="font-heading text-xl text-white">Task Pulse + Calendar</h2>
        <p className="mt-1 text-xs text-app-muted">
          High-level pulse sequencing plus a 14-day health calendar for execution visibility.
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-emerald-300">
            Green {taskTimeline.healthCounts.green}
          </span>
          <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-amber-300">
            Yellow {taskTimeline.healthCounts.yellow}
          </span>
          <span className="rounded-full border border-[#e72027]/50 bg-[#e72027]/12 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-[#ff7c82]">
            Red {taskTimeline.healthCounts.red}
          </span>
        </div>

        <div className="mt-4 rounded-xl border border-app-border bg-black p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.12em] text-app-muted">
              Pulse Lane
            </p>
            <p className="text-[10px] uppercase tracking-[0.12em] text-app-muted">
              Sequence: due date + risk
            </p>
          </div>

          {taskTimeline.pulseSequence.length > 0 ? (
            <div className="overflow-x-auto pb-1">
              <div className="flex min-w-max items-stretch gap-3">
                {taskTimeline.pulseSequence.map((task) => (
                  <article
                    key={`pulse-${task.id}`}
                    className={`relative w-52 rounded-xl border px-3 py-2 ${healthBlockClassName(task.healthColor)}`}
                    style={taskAccentStyle(task.owner)}
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-[10px] uppercase tracking-[0.12em] text-app-muted">
                        {task.priority}
                      </span>
                      <span
                        className={`rounded-full border px-1.5 py-0.5 text-[10px] uppercase tracking-[0.12em] ${healthPillClassName(task.healthColor)}`}
                      >
                        {healthLabel(task.healthColor)}
                      </span>
                    </div>
                    <p className="line-clamp-2 text-sm text-white">{task.text}</p>
                    <p className="mt-1 text-xs text-app-muted">
                      {task.owner}
                      {task.due_date
                        ? ` - ${new Date(`${task.due_date}T00:00:00`).toLocaleDateString()}`
                        : " - No due date"}
                    </p>
                    {task.delayCount > 0 ? (
                      <p className="mt-2 text-[10px] uppercase tracking-[0.12em] text-[#ff7c82]">
                        Delayed {task.delayCount}x
                      </p>
                    ) : null}
                    <span className="pointer-events-none absolute -right-2 top-1/2 hidden h-0.5 w-2 bg-app-border md:block" />
                  </article>
                ))}
              </div>
            </div>
          ) : (
            <p className="rounded-lg border border-app-border bg-app-base px-3 py-2 text-xs text-app-muted">
              No tasks available for pulse view.
            </p>
          )}
        </div>

        <div className="mt-4 rounded-xl border border-app-border bg-black p-3">
          <p className="mb-2 text-xs uppercase tracking-[0.12em] text-app-muted">
            14-Day Calendar
          </p>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-7">
            {taskTimeline.calendarDays.map((day) => (
              <article
                key={`calendar-${day.key}`}
                className="rounded-lg border border-app-border bg-app-base p-2"
              >
                <p className="text-[11px] uppercase tracking-[0.12em] text-app-muted">
                  {day.label}
                </p>
                <div className="mt-2 space-y-1">
                  {day.tasks.length > 0 ? (
                    day.tasks.slice(0, 4).map((task) => (
                      <div
                        key={`calendar-task-${task.id}`}
                        className={`rounded border px-2 py-1 ${healthBlockClassName(task.healthColor)}`}
                        style={taskAccentStyle(task.owner)}
                      >
                        <p className="truncate text-xs text-white">{task.text}</p>
                        <p className="mt-0.5 text-[10px] text-app-muted">
                          {task.owner}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="rounded border border-dashed border-app-border px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-app-muted">
                      Clear
                    </p>
                  )}
                  {day.tasks.length > 4 ? (
                    <p className="text-[10px] uppercase tracking-[0.12em] text-app-muted">
                      +{day.tasks.length - 4} more
                    </p>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="mt-3 space-y-3">
          <p className="text-[10px] uppercase tracking-[0.12em] text-app-muted">
            Detailed Ledger
          </p>
          {taskTimeline.orderedDates.map((date) => (
            <article
              key={date}
              className="rounded-lg border border-app-border bg-black p-3"
            >
              <p className="text-xs uppercase tracking-[0.12em] text-app-muted">
                {new Date(`${date}T00:00:00`).toLocaleDateString()}
              </p>
              <ul className="mt-2 space-y-1">
                {taskTimeline.grouped[date].map((task) => (
                  <li
                    key={task.id}
                    className="rounded border border-app-border bg-app-base px-2 py-1 text-sm text-white"
                    style={taskAccentStyle(task.owner)}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={
                          task.isComplete ? "line-through text-app-muted" : ""
                        }
                      >
                        {task.text}
                      </span>
                      <span className="text-xs text-app-muted">
                        ({task.owner})
                      </span>
                      <span className="text-[10px] uppercase text-app-muted">
                        [{task.priority}]
                      </span>
                      {task.health ? (
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] ${healthPillClassName(task.health.health_color)}`}
                        >
                          {healthLabel(task.health.health_color)}
                        </span>
                      ) : null}
                      {task.delayCount > 0 ? (
                        <span className="rounded-full border border-[#e72027]/40 bg-[#e72027]/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-[#ff7c82]">
                          Delayed {task.delayCount}x
                        </span>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </article>
          ))}

          {taskTimeline.withoutDate.length > 0 ? (
            <article className="rounded-lg border border-app-border bg-black p-3">
              <p className="text-xs uppercase tracking-[0.12em] text-app-muted">
                No Due Date
              </p>
              <ul className="mt-2 space-y-1">
                {taskTimeline.withoutDate.map((task) => (
                  <li
                    key={task.id}
                    className="rounded border border-app-border bg-app-base px-2 py-1 text-sm text-white"
                    style={taskAccentStyle(task.owner)}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={
                          task.isComplete ? "line-through text-app-muted" : ""
                        }
                      >
                        {task.text}
                      </span>
                      <span className="text-xs text-app-muted">
                        ({task.owner})
                      </span>
                      <span className="text-[10px] uppercase text-app-muted">
                        [{task.priority}]
                      </span>
                      {task.health ? (
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] ${healthPillClassName(task.health.health_color)}`}
                        >
                          {healthLabel(task.health.health_color)}
                        </span>
                      ) : null}
                      {task.delayCount > 0 ? (
                        <span className="rounded-full border border-[#e72027]/40 bg-[#e72027]/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-[#ff7c82]">
                          Delayed {task.delayCount}x
                        </span>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </article>
          ) : null}

          {data.todos.length === 0 && data.rocks.length === 0 ? (
            <p className="rounded-lg border border-app-border bg-black px-3 py-2 text-xs text-app-muted">
              No to-dos yet.
            </p>
          ) : null}
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
              style={taskAccentStyle(issue.owner)}
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
                      updateIssueOwner(issue.id, event.target.value)
                    }
                    className="rounded border border-app-border bg-app-base px-2 py-1 text-xs text-white"
                  >
                    {ownerOptionsFor(issue.owner).map((owner) => (
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
                  defaultValue={fallbackAssignee}
                >
                  {assignableOwners.map((owner) => (
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
                  owner: event.target.value,
                }))
              }
              className="rounded border border-app-border bg-app-base px-2 py-1 text-xs text-white"
            >
              {ownerOptionsFor(issueDraft.owner).map((owner) => (
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
                      updateAgendaItemOwner(item.id, event.target.value)
                    }
                    className="rounded border border-app-border bg-black px-2 py-1 text-xs text-white"
                  >
                    {ownerOptionsFor(item.owner).map((owner) => (
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
                    owner: event.target.value,
                  },
                }))
              }
              className="rounded border border-app-border bg-app-base px-2 py-1 text-xs text-white"
            >
              {ownerOptionsFor(agendaDrafts[segment].owner).map((owner) => (
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

  function meetingLinksSection() {
    return (
      <section className="rounded-2xl border border-app-border bg-app-panel p-4">
        <h2 className="font-heading text-xl text-white">Meeting Links</h2>
        <p className="mt-1 text-xs text-app-muted">
          Add a link for presentation mode. Supported embeds: YouTube, Vimeo,
          Loom, and Google Slides.
        </p>

        <div className="mt-3 space-y-3">
          {data.meeting_links.map((link) => {
            const embedUrl = getEmbedUrl(link.url);

            return (
              <article
                key={link.id}
                className="relative overflow-hidden rounded-lg border border-app-border bg-black p-3"
              >
                <span className="absolute left-3 top-3 rounded-full border border-app-border bg-app-panel px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-app-muted">
                  {link.owner}
                </span>

                <div className="mt-7 grid grid-cols-1 gap-2 md:grid-cols-[1fr_112px_70px]">
                  <input
                    defaultValue={link.url}
                    onBlur={(event) =>
                      updateMeetingLinkUrl(link.id, event.target.value)
                    }
                    className="rounded border border-app-border bg-app-base px-2 py-1 text-sm text-white"
                  />
                  <select
                    value={link.owner}
                    onChange={(event) =>
                      updateMeetingLinkOwner(link.id, event.target.value)
                    }
                    className="rounded border border-app-border bg-app-base px-2 py-1 text-xs text-white"
                  >
                    {ownerOptionsFor(link.owner).map((owner) => (
                      <option key={owner}>{owner}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => deleteMeetingLink(link.id)}
                    className="rounded border border-app-border px-2 py-1 text-xs text-app-muted hover:text-brand"
                  >
                    Remove
                  </button>
                </div>

                {embedUrl ? (
                  <div className="mt-3 overflow-hidden rounded-lg border border-app-border bg-black">
                    <iframe
                      src={embedUrl}
                      title={`Meeting link shared by ${link.owner}`}
                      className="h-72 w-full"
                      loading="lazy"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      referrerPolicy="strict-origin-when-cross-origin"
                    />
                  </div>
                ) : (
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 block rounded-lg border border-app-border bg-app-base px-3 py-2 text-sm text-brand underline-offset-4 hover:underline"
                  >
                    Open shared link
                  </a>
                )}
              </article>
            );
          })}

          {data.meeting_links.length === 0 ? (
            <p className="rounded-lg border border-app-border bg-black px-3 py-2 text-xs text-app-muted">
              No links shared yet.
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2 rounded-lg border border-app-border bg-black p-3">
            <input
              value={meetingLinkDraft.url}
              onChange={(event) =>
                setMeetingLinkDraft((previous) => ({
                  ...previous,
                  url: event.target.value,
                }))
              }
              placeholder="Paste URL (example.com or https://...)"
              className="min-w-52 flex-1 rounded border border-app-border bg-app-base px-2 py-1 text-sm text-white"
            />
            <select
              value={meetingLinkDraft.owner}
              onChange={(event) =>
                setMeetingLinkDraft((previous) => ({
                  ...previous,
                  owner: event.target.value,
                }))
              }
              className="rounded border border-app-border bg-app-base px-2 py-1 text-xs text-white"
            >
              {ownerOptionsFor(meetingLinkDraft.owner).map((owner) => (
                <option key={owner}>{owner}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={addMeetingLink}
              className="rounded border border-app-border px-3 py-1 text-xs text-white hover:border-brand"
            >
              Add Link
            </button>
          </div>
        </div>
      </section>
    );
  }

  function concludeSection() {
    return (
      <section className="rounded-2xl border border-app-border bg-app-panel p-4">
        <h2 className="font-heading text-xl text-white">Conclude</h2>
        <p className="mt-1 text-xs text-app-muted">
          Add multiple conclusion blocks. Bullets are supported using -, *, or
          •.
        </p>

        <div className="mt-3 space-y-3">
          {data.conclude_items.map((item) => (
            <article
              key={item.id}
              className="rounded-lg border border-app-border bg-black p-3"
            >
              {editingConcludeId === item.id ? (
                <>
                  <textarea
                    value={editingConcludeText}
                    onChange={(event) =>
                      setEditingConcludeText(event.target.value)
                    }
                    placeholder="Type recap, decisions, and next actions..."
                    className="min-h-28 w-full rounded border border-app-border bg-app-base px-3 py-2 text-sm text-white font-sans"
                  />

                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={saveConcludeEdit}
                      className="rounded border border-app-border px-3 py-1 text-xs text-white hover:border-brand"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={cancelConcludeEdit}
                      className="rounded border border-app-border px-3 py-1 text-xs text-app-muted hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteConcludeItem(item.id)}
                      className="rounded border border-app-border px-3 py-1 text-xs text-app-muted hover:text-brand"
                    >
                      Remove
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="rounded border border-app-border bg-app-base px-3 py-2 text-sm text-app-muted whitespace-pre-wrap font-sans">
                    {item.content}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => startConcludeEdit(item.id, item.content)}
                      className="rounded border border-app-border px-3 py-1 text-xs text-app-muted transition hover:text-white"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteConcludeItem(item.id)}
                      className="rounded border border-app-border px-3 py-1 text-xs text-app-muted transition hover:text-brand"
                    >
                      Remove
                    </button>
                  </div>
                </>
              )}
            </article>
          ))}

          <div className="rounded-lg border border-app-border bg-black p-3">
            <p className="mb-2 text-xs uppercase tracking-[0.12em] text-app-muted">
              New Block
            </p>
            <textarea
              value={concludeDraft}
              onChange={(event) => setConcludeDraft(event.target.value)}
              placeholder="Add conclude content. Example:
- Top wins
- Decisions made
- Expectations for next week"
              className="min-h-28 w-full rounded border border-app-border bg-app-base px-3 py-2 text-sm text-white font-sans"
            />
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={addConcludeItem}
                className="rounded border border-app-border px-3 py-1 text-xs text-white hover:border-brand"
              >
                Add Conclude Block
              </button>
            </div>
          </div>

          {data.conclude_items.length === 0 ? (
            <p className="rounded-lg border border-app-border bg-black px-3 py-2 text-xs text-app-muted">
              No conclude notes yet.
            </p>
          ) : null}
        </div>
      </section>
    );
  }

  function pastMeetingsSection() {
    const completedMeetings = [...data.meetings]
      .filter((meeting) => meeting.is_closed && meeting.ended_at)
      .sort(
        (a, b) =>
          new Date(b.ended_at ?? b.started_at).getTime() -
          new Date(a.ended_at ?? a.started_at).getTime(),
      );

    return (
      <section className="rounded-2xl border border-app-border bg-app-panel p-4">
        <h2 className="font-heading text-xl text-white">Past Meetings</h2>
        <p className="mt-1 text-xs text-app-muted">
          Review meeting date, start/end time, and total duration.
        </p>

        <div className="mt-3 space-y-2">
          {completedMeetings.map((meeting) => {
            const started = new Date(meeting.started_at);
            const ended = meeting.ended_at ? new Date(meeting.ended_at) : null;
            const meetingName =
              meeting.label?.trim() || `${meeting.meeting_date} Meeting`;
            const hasValidTimes =
              Number.isFinite(started.getTime()) &&
              Boolean(ended && Number.isFinite(ended.getTime()));
            const storedDurationSeconds = meeting.total_duration_seconds ?? 0;
            const durationSeconds =
              storedDurationSeconds > 0
                ? storedDurationSeconds
                : hasValidTimes && ended
                  ? Math.max(
                      0,
                      Math.floor((ended.getTime() - started.getTime()) / 1000),
                    )
                  : 0;

            return (
              <article
                key={meeting.id}
                className="rounded-lg border border-app-border bg-black p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <input
                    defaultValue={meetingName}
                    onBlur={(event) =>
                      void updateMeetingLabel(
                        meeting.id,
                        event.target.value,
                        meeting.meeting_date,
                      )
                    }
                    className="min-w-52 rounded border border-app-border bg-app-base px-2 py-1 font-heading text-sm text-white"
                  />
                  <span className="rounded border border-app-border px-2 py-0.5 text-[10px] text-app-muted">
                    {meeting.meeting_date}
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap gap-2 text-xs text-app-muted">
                  <span className="rounded border border-app-border px-2 py-1">
                    Start: {hasValidTimes ? started.toLocaleTimeString() : "--"}
                  </span>
                  <span className="rounded border border-app-border px-2 py-1">
                    End:{" "}
                    {hasValidTimes && ended ? ended.toLocaleTimeString() : "--"}
                  </span>
                  <span className="rounded border border-app-border px-2 py-1 text-white">
                    Total: {toDurationLabel(durationSeconds)}
                  </span>
                </div>
              </article>
            );
          })}

          {completedMeetings.length === 0 ? (
            <p className="rounded-lg border border-app-border bg-black px-3 py-2 text-xs text-app-muted">
              No completed meetings yet.
            </p>
          ) : null}
        </div>
      </section>
    );
  }

  function peopleSection() {
    const activePeople = data.people.filter((person) => person.is_active);
    const inactivePeople = data.people.filter((person) => !person.is_active);

    return (
      <section className="rounded-2xl border border-app-border bg-app-panel p-4">
        <h2 className="font-heading text-xl text-white">People</h2>
        <p className="mt-1 text-xs text-app-muted">
          Manage members for future task assignment and ownership.
        </p>

        <div className="mt-3 space-y-3">
          {activePeople.map((person) => (
            <article
              key={person.id}
              className="rounded-lg border border-app-border bg-black p-3"
            >
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                <input
                  defaultValue={person.full_name}
                  onBlur={(event) =>
                    updatePersonName(person.id, event.target.value)
                  }
                  className="rounded border border-app-border bg-app-base px-2 py-1 text-sm text-white"
                  placeholder="Full name"
                />
                <input
                  defaultValue={person.username}
                  onBlur={(event) =>
                    updatePersonUsername(person.id, event.target.value)
                  }
                  className="rounded border border-app-border bg-app-base px-2 py-1 text-sm text-white"
                  placeholder="Username"
                />
                <input
                  type="email"
                  defaultValue={person.email}
                  onBlur={(event) =>
                    updatePersonEmail(person.id, event.target.value)
                  }
                  className="rounded border border-app-border bg-app-base px-2 py-1 text-sm text-white"
                  placeholder="Email"
                />
                <select
                  value={person.role}
                  onChange={(event) =>
                    updatePersonRole(person.id, event.target.value)
                  }
                  className="rounded border border-app-border bg-app-base px-2 py-1 text-sm text-white"
                >
                  {(roleOptions.includes(person.role)
                    ? roleOptions
                    : [person.role, ...roleOptions]
                  ).map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-2 rounded border border-app-border bg-app-base px-2 py-1">
                  <label className="text-xs text-app-muted">Task Color</label>
                  <input
                    type="color"
                    value={normalizeAccentColor(person.accent_color)}
                    onChange={(event) =>
                      updatePersonAccentColor(person.id, event.target.value)
                    }
                    className="h-7 w-10 cursor-pointer rounded border border-app-border bg-transparent"
                  />
                </div>
              </div>

              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-app-muted">
                  @{person.username}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      togglePersonActive(person.id, person.is_active)
                    }
                    className="rounded border border-app-border px-2 py-1 text-xs text-yellow-300"
                  >
                    Deactivate
                  </button>
                  <button
                    type="button"
                    onClick={() => deletePerson(person.id)}
                    className="rounded border border-app-border px-2 py-1 text-xs text-app-muted hover:text-brand"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </article>
          ))}

          {activePeople.length === 0 ? (
            <p className="rounded-lg border border-app-border bg-black px-3 py-2 text-xs text-app-muted">
              No active people yet.
            </p>
          ) : null}

          {inactivePeople.length > 0 ? (
            <div className="rounded-lg border border-app-border bg-black/60 p-3">
              <p className="mb-2 text-xs uppercase tracking-[0.12em] text-app-muted">
                Inactive
              </p>
              <div className="space-y-2">
                {inactivePeople.map((person) => (
                  <div
                    key={person.id}
                    className="flex items-center justify-between rounded border border-app-border bg-app-base px-2 py-1"
                  >
                    <span className="text-sm text-app-muted">
                      {person.full_name} ({person.email})
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        togglePersonActive(person.id, person.is_active)
                      }
                      className="rounded border border-app-border px-2 py-1 text-xs text-emerald-300"
                    >
                      Reactivate
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="rounded-lg border border-app-border bg-black p-3">
            <p className="mb-2 text-xs uppercase tracking-[0.12em] text-app-muted">
              Add Person
            </p>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <input
                value={personDraft.fullName}
                onChange={(event) =>
                  setPersonDraft((previous) => ({
                    ...previous,
                    fullName: event.target.value,
                  }))
                }
                className="rounded border border-app-border bg-app-base px-2 py-1 text-sm text-white"
                placeholder="Full name"
              />
              <input
                value={personDraft.username}
                onChange={(event) =>
                  setPersonDraft((previous) => ({
                    ...previous,
                    username: event.target.value,
                  }))
                }
                className="rounded border border-app-border bg-app-base px-2 py-1 text-sm text-white"
                placeholder="Username"
              />
              <input
                type="email"
                value={personDraft.email}
                onChange={(event) =>
                  setPersonDraft((previous) => ({
                    ...previous,
                    email: event.target.value,
                  }))
                }
                className="rounded border border-app-border bg-app-base px-2 py-1 text-sm text-white"
                placeholder="Email"
              />
              <select
                value={personDraft.role}
                onChange={(event) =>
                  setPersonDraft((previous) => ({
                    ...previous,
                    role: event.target.value,
                  }))
                }
                className="rounded border border-app-border bg-app-base px-2 py-1 text-sm text-white"
              >
                {roleOptions.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-2 rounded border border-app-border bg-app-base px-2 py-1">
                <label className="text-xs text-app-muted">Task Color</label>
                <input
                  type="color"
                  value={personDraft.accentColor}
                  onChange={(event) =>
                    setPersonDraft((previous) => ({
                      ...previous,
                      accentColor: normalizeAccentColor(event.target.value),
                    }))
                  }
                  className="h-7 w-10 cursor-pointer rounded border border-app-border bg-transparent"
                />
              </div>
            </div>
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={addPerson}
                className="rounded border border-app-border px-3 py-1 text-xs text-white hover:border-brand"
              >
                Add Person
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  function meetingFormatSection() {
    const sorted = [...data.meeting_format_segments].sort(
      (a, b) => a.sort_order - b.sort_order,
    );

    return (
      <section className="rounded-2xl border border-app-border bg-app-panel p-4">
        <h2 className="font-heading text-xl text-white">Meeting Format</h2>
        <p className="mt-1 text-xs text-app-muted">
          Adjust meeting structure, durations, and sequence.
        </p>

        <div className="mt-3 space-y-2">
          {sorted.map((segment) => (
            <article
              key={segment.id}
              onDragOver={(event) => {
                event.preventDefault();

                if (!draggingFormatSegmentId) {
                  return;
                }

                const rect = event.currentTarget.getBoundingClientRect();
                const midpoint = rect.top + rect.height / 2;
                const position = event.clientY < midpoint ? "above" : "below";
                setFormatDropIndicator({ targetId: segment.id, position });
              }}
              onDrop={() => {
                if (!draggingFormatSegmentId) {
                  return;
                }

                void reorderFormatSegments(
                  draggingFormatSegmentId,
                  segment.id,
                  formatDropIndicator?.targetId === segment.id
                    ? formatDropIndicator.position
                    : "above",
                );
                setDraggingFormatSegmentId(null);
                setFormatDropIndicator(null);
              }}
              className={`relative grid grid-cols-1 gap-2 rounded-lg border bg-black p-3 transition-colors md:grid-cols-[26px_120px_1fr_90px_70px_110px] ${
                draggingFormatSegmentId === segment.id
                  ? "border-brand"
                  : "border-app-border"
              }`}
            >
              {formatDropIndicator?.targetId === segment.id ? (
                <div
                  className={`pointer-events-none absolute left-3 right-3 h-0.5 rounded-full bg-brand animate-pulse ${
                    formatDropIndicator.position === "above"
                      ? "-top-1"
                      : "-bottom-1"
                  }`}
                />
              ) : null}
              <span
                draggable
                onDragStart={() => setDraggingFormatSegmentId(segment.id)}
                onDragEnd={() => {
                  setDraggingFormatSegmentId(null);
                  setFormatDropIndicator(null);
                }}
                title="Drag to reorder"
                className="select-none cursor-grab active:cursor-grabbing text-app-muted text-lg leading-none pt-0.5"
              >
                ::
              </span>
              <input
                value={segment.segment_key}
                readOnly
                className="rounded border border-app-border bg-app-base px-2 py-1 text-xs text-app-muted"
              />
              <input
                defaultValue={segment.label}
                onBlur={(event) =>
                  updateFormatLabel(segment.id, event.target.value)
                }
                className="rounded border border-app-border bg-app-base px-2 py-1 text-sm text-white"
              />
              <input
                type="number"
                min={1}
                defaultValue={segment.duration_minutes}
                onBlur={(event) =>
                  updateFormatDuration(segment.id, event.target.value)
                }
                className="rounded border border-app-border bg-app-base px-2 py-1 text-sm text-white"
              />
              <button
                type="button"
                onClick={() =>
                  toggleFormatEnabled(segment.id, segment.is_enabled)
                }
                className={`rounded px-2 py-1 text-xs font-semibold ${
                  segment.is_enabled
                    ? "bg-emerald-700 text-white"
                    : "border border-app-border text-app-muted"
                }`}
              >
                {segment.is_enabled ? "On" : "Off"}
              </button>
              <div className="flex items-center gap-1">
                {!CORE_SEGMENT_KEYS.includes(segment.segment_key) ? (
                  <button
                    type="button"
                    onClick={() =>
                      deleteCustomFormatSegment(segment.id, segment.segment_key)
                    }
                    className="rounded border border-app-border px-2 py-1 text-xs text-app-muted hover:text-brand"
                  >
                    Delete
                  </button>
                ) : null}
              </div>
            </article>
          ))}

          <div className="rounded-lg border border-app-border bg-black p-3">
            <p className="mb-2 text-xs uppercase tracking-[0.12em] text-app-muted">
              Add Custom Segment
            </p>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_1fr_90px_auto]">
              <input
                value={customSegmentDraft.key}
                onChange={(event) =>
                  setCustomSegmentDraft((previous) => ({
                    ...previous,
                    key: event.target.value,
                  }))
                }
                placeholder="Segment key"
                className="rounded border border-app-border bg-app-base px-2 py-1 text-sm text-white"
              />
              <input
                value={customSegmentDraft.label}
                onChange={(event) =>
                  setCustomSegmentDraft((previous) => ({
                    ...previous,
                    label: event.target.value,
                  }))
                }
                placeholder="Display label"
                className="rounded border border-app-border bg-app-base px-2 py-1 text-sm text-white"
              />
              <input
                type="number"
                min={1}
                value={customSegmentDraft.duration}
                onChange={(event) =>
                  setCustomSegmentDraft((previous) => ({
                    ...previous,
                    duration: event.target.value,
                  }))
                }
                placeholder="Minutes"
                className="rounded border border-app-border bg-app-base px-2 py-1 text-sm text-white"
              />
              <button
                type="button"
                onClick={addCustomFormatSegment}
                className="rounded border border-app-border px-3 py-1 text-xs text-white hover:border-brand"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  function kpiInsightsSection() {
    const insights = demoKpiInsights ?? kpiInsights;
    const chartByDepartment = demoKpiInsights
      ? Array.from(
          demoKpiInsights.scorecardMetrics.reduce((acc, metric) => {
            const department = ownerRoleByName.get(metric.owner) ?? "Member";
            const current = acc.get(department) ?? [];
            current.push(metric);
            acc.set(department, current);
            return acc;
          }, new Map<string, KpiInsightsData["scorecardMetrics"]>()),
        ).map(([department, metrics]) => ({
          department,
          metrics: [...metrics].sort((a, b) =>
            a.metric_name.localeCompare(b.metric_name),
          ),
        }))
      : scorecardByDepartment;

    return (
      <section className="rounded-2xl border border-app-border bg-app-panel p-4 lg:col-span-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-heading text-xl text-white">
              KPI Trends and Predictive Signals
            </h2>
            <p className="mt-1 text-xs text-app-muted">
              Goal vs actual trend, owner consistency, and active off-track
              streaks.
            </p>
          </div>

          {demoKpiInsights ? (
            <button
              type="button"
              onClick={() => setDemoKpiInsights(null)}
              className="rounded border border-app-border px-3 py-1 text-xs text-app-muted transition hover:text-white"
            >
              Clear Demo
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setDemoKpiInsights(buildDemoKpiInsights())}
              className="rounded border border-[#e72027] bg-[#e72027]/15 px-3 py-1 text-xs font-semibold text-white transition hover:bg-[#e72027]/25"
            >
              Load Demo KPI Data
            </button>
          )}
        </div>

        {chartByDepartment.length > 0 ? (
          <div className="mt-3 rounded-lg border border-app-border bg-black p-3">
            <h3 className="text-xs uppercase tracking-[0.12em] text-app-muted">
              Department Goal vs Actual
            </h3>
            <p className="mt-1 text-xs text-app-muted">
              Each metric pair is normalized to its own high value for easier
              side-by-side comparison.
            </p>

            <div className="mt-3 flex flex-wrap justify-start gap-3">
              {chartByDepartment.map((group) => {
                const totalMetrics = group.metrics.length;
                const metGoalCount = group.metrics.filter(
                  (metric) => metric.actual >= metric.goal,
                ).length;
                const metGoalPct =
                  totalMetrics === 0 ? 0 : (metGoalCount / totalMetrics) * 100;
                const targetPct =
                  totalMetrics >= 4 ? 75 : totalMetrics === 3 ? 66 : 50;
                const meetsTarget = metGoalPct >= targetPct;

                return (
                  <article
                    key={group.department}
                    className="w-max max-w-full rounded-lg border border-app-border bg-app-base p-3"
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-white">
                        {group.department}
                      </p>
                      <p className="text-[10px] uppercase tracking-[0.08em] text-app-muted">
                        {group.metrics.length} metric
                        {group.metrics.length === 1 ? "" : "s"}
                      </p>
                    </div>
                    <p
                      className={`mb-2 text-[11px] ${
                        meetsTarget ? "text-emerald-300" : "text-[#e72027]"
                      }`}
                    >
                      {metGoalCount}/{totalMetrics} metrics meet goal (
                      {Math.round(metGoalPct)}%)
                    </p>

                    <div className="overflow-x-auto pb-1">
                      <div className="min-w-max rounded border border-app-border bg-black/60 p-2">
                        <div className="flex min-h-56 items-end gap-3">
                          {group.metrics.map((metric, metricIndex) => {
                            const pairMax = Math.max(
                              metric.goal,
                              metric.actual,
                              1,
                            );
                            const goalHeight = `${(metric.goal / pairMax) * 100}%`;
                            const actualHeight = `${(metric.actual / pairMax) * 100}%`;
                            const isFirstMetric = metricIndex === 0;
                            const isLastMetric =
                              metricIndex === group.metrics.length - 1;

                            return (
                              <div
                                key={metric.id}
                                className="group relative w-20 pt-12"
                              >
                                <div
                                  className={`pointer-events-none absolute top-1 z-50 w-44 rounded border border-app-border bg-app-panel px-2 py-1 text-[10px] text-white opacity-0 shadow-lg transition group-hover:opacity-100 ${
                                    isFirstMetric
                                      ? "left-0 translate-x-0"
                                      : isLastMetric
                                        ? "right-0 translate-x-0"
                                        : "left-1/2 -translate-x-1/2"
                                  }`}
                                >
                                  <p className="font-semibold">
                                    {metric.metric_name}
                                  </p>
                                  <p className="text-app-muted">
                                    {metric.owner}
                                  </p>
                                  <p className="text-rose-300">
                                    Goal: {metric.goal.toFixed(2)}
                                  </p>
                                  <p className="text-emerald-300">
                                    Actual: {metric.actual.toFixed(2)}
                                  </p>
                                </div>

                                <div className="flex h-36 items-end justify-center gap-1">
                                  <div
                                    className="w-7 rounded-t bg-rose-500"
                                    style={{ height: goalHeight }}
                                    aria-label={`${metric.metric_name} goal ${metric.goal.toFixed(2)}`}
                                  />
                                  <div
                                    className="w-7 rounded-t bg-emerald-500"
                                    style={{ height: actualHeight }}
                                    aria-label={`${metric.metric_name} actual ${metric.actual.toFixed(2)}`}
                                  />
                                </div>

                                <p
                                  title={metric.metric_name}
                                  className="mt-2 truncate text-center text-[10px] text-app-muted"
                                >
                                  {metric.metric_name}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="mt-2 flex flex-wrap gap-3 text-xs">
              <span className="rounded border border-app-border px-2 py-1 text-rose-300">
                Goal
              </span>
              <span className="rounded border border-app-border px-2 py-1 text-emerald-300">
                Actual
              </span>
              <span className="rounded border border-app-border px-2 py-1 text-app-muted">
                Latest delta: {insights.latestDelta.toFixed(1)}
              </span>
              <span className="rounded border border-app-border px-2 py-1 text-app-muted">
                Next delta prediction: {insights.nextDeltaPrediction.toFixed(1)}
              </span>
            </div>
          </div>
        ) : (
          <p className="mt-3 rounded-lg border border-app-border bg-black px-3 py-2 text-xs text-app-muted">
            Not enough historical snapshots yet. Close at least 2 meetings to
            unlock trend intelligence.
          </p>
        )}

        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <article className="rounded-lg border border-app-border bg-black p-3">
            <h3 className="text-xs uppercase tracking-[0.12em] text-app-muted">
              Owner Consistency
            </h3>
            <div className="mt-2 space-y-1">
              {insights.ownerConsistency.slice(0, 6).map((entry) => (
                <p key={entry.owner} className="text-sm text-white">
                  {entry.owner}: {(entry.consistency * 100).toFixed(0)}%
                  on-track
                </p>
              ))}
              {insights.ownerConsistency.length === 0 ? (
                <p className="text-xs text-app-muted">
                  No historical owner data.
                </p>
              ) : null}
            </div>
          </article>

          <article className="rounded-lg border border-app-border bg-black p-3">
            <h3 className="text-xs uppercase tracking-[0.12em] text-app-muted">
              Off-Track Streaks
            </h3>
            <div className="mt-2 space-y-1">
              {insights.offTrackStreaks.map((entry) => (
                <p
                  key={`${entry.owner}-${entry.metricName}`}
                  className="text-sm text-white"
                >
                  {entry.owner} - {entry.metricName}: {entry.current} meeting
                  {entry.current === 1 ? "" : "s"}
                </p>
              ))}
              {insights.offTrackStreaks.length === 0 ? (
                <p className="text-xs text-app-muted">
                  No active off-track streaks in recent snapshots.
                </p>
              ) : null}
            </div>
          </article>
        </div>
      </section>
    );
  }

  function financialsSection() {
    const periodMetrics =
      shopifyPeriod === "7day"
        ? data.shopify_period_metrics?.sevenDay
        : data.shopify_period_metrics?.thirtyDay;
    const targets = data.shopify_targets || [];
    const currencyCode = data.shopify_financials?.currencyCode || "USD";

    const formatMoney = (value: number) =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currencyCode,
        maximumFractionDigits: value % 1 === 0 ? 0 : 2,
      }).format(value);

    const getTargetForMetric = (metricName: string) => {
      const target = targets.find(
        (t) =>
          t.metric_name === metricName && t.target_period === shopifyPeriod,
      );
      return target?.target_value ?? null;
    };

    const periodLabel =
      shopifyPeriod === "7day" ? "Last 7 Days" : "Last 30 Days";

    return (
      <section className="rounded-2xl border border-app-border bg-app-panel p-4 lg:col-span-2">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-heading text-xl text-white">Financials</h2>
            <p className="mt-1 text-xs text-app-muted">
              Real-time Shopify metrics with period-over-period comparison
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShopifyPeriod("7day")}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                shopifyPeriod === "7day"
                  ? "border-brand bg-brand/20 text-brand"
                  : "border border-app-border text-app-muted hover:text-white"
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => setShopifyPeriod("30day")}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                shopifyPeriod === "30day"
                  ? "border-brand bg-brand/20 text-brand"
                  : "border border-app-border text-app-muted hover:text-white"
              }`}
            >
              30 Days
            </button>
          </div>
        </div>

        {periodMetrics && periodMetrics.length > 0 ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {periodMetrics.map((metric) => {
              const target = getTargetForMetric(metric.metricName);
              const currentValue =
                metric.metricName === "revenue"
                  ? metric.current.revenue
                  : metric.metricName === "orders"
                    ? metric.current.orderCount
                    : metric.current.aov;
              const percentChange = metric.percentChange;
              const isPositive = percentChange >= 0;
              const metricLabel =
                metric.metricName === "revenue"
                  ? "Revenue"
                  : metric.metricName === "orders"
                    ? "Orders"
                    : "Average Order Value";

              return (
                <div
                  key={metric.metricName}
                  className="rounded-xl border border-app-border bg-black/60 p-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.08em] text-app-muted">
                        {metricLabel}
                      </p>
                      <p className="mt-2 text-2xl font-bold text-white">
                        {metric.metricName === "revenue"
                          ? formatMoney(currentValue)
                          : metric.metricName === "orders"
                            ? Math.round(currentValue)
                            : formatMoney(currentValue)}
                      </p>
                    </div>
                    <div
                      className={`rounded-full px-2 py-1 text-xs font-semibold flex items-center gap-1 ${
                        isPositive
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-rose-500/20 text-rose-300"
                      }`}
                    >
                      {isPositive ? "↑" : "↓"}{" "}
                      {Math.abs(percentChange).toFixed(1)}%
                    </div>
                  </div>

                  <div className="mt-4">
                    {editingTarget?.metricName === metric.metricName &&
                    editingTarget ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-app-muted">Target:</span>
                        <input
                          type="number"
                          value={editingTarget.value}
                          onChange={(e) =>
                            setEditingTarget({
                              ...editingTarget,
                              value: e.target.value,
                            })
                          }
                          className="h-6 w-16 rounded border border-brand bg-black/70 px-2 text-right text-xs text-white placeholder-app-muted focus:outline-none focus:ring-2 focus:ring-brand"
                          autoFocus
                        />
                        <button
                          onClick={async () => {
                            const newValue = Number(editingTarget.value);
                            if (newValue > 0) {
                              await updateShopifyTargetAction(
                                metric.metricName,
                                shopifyPeriod,
                                newValue,
                              );
                              setEditingTarget(null);
                              // Optionally refetch data here
                            }
                          }}
                          className="text-xs font-medium text-emerald-400 hover:text-emerald-300"
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => setEditingTarget(null)}
                          className="text-xs font-medium text-app-muted hover:text-white"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() =>
                          setEditingTarget({
                            metricName: metric.metricName,
                            value: String(target ?? 0),
                          })
                        }
                        className="flex cursor-pointer items-center justify-between text-xs transition hover:opacity-80"
                      >
                        <span className="text-app-muted">Target:</span>
                        <span className="text-white font-medium">
                          {target
                            ? metric.metricName === "revenue"
                              ? formatMoney(target)
                              : metric.metricName === "orders"
                                ? Math.round(target)
                                : formatMoney(target)
                            : "Not set"}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-2 text-xs text-app-muted">
                    Prior period:{" "}
                    {metric.metricName === "revenue"
                      ? formatMoney(metric.previous.revenue)
                      : metric.metricName === "orders"
                        ? Math.round(metric.previous.orderCount)
                        : formatMoney(metric.previous.aov)}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-6 rounded-xl border border-dashed border-app-border bg-app-base p-8 text-center">
            <p className="text-sm text-app-muted">
              Loading Shopify metrics for {periodLabel.toLowerCase()}...
            </p>
          </div>
        )}

        <div className="mt-6 rounded-xl border border-app-border bg-black/40 p-4">
          <p className="text-xs uppercase tracking-[0.08em] text-app-muted">
            Coming Soon
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-white">Grants Pipeline</p>
              <p className="mt-1 text-xs text-app-muted">
                Grant metrics and applications tracking
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-white">Add Another Lane</p>
              <p className="mt-1 text-xs text-app-muted">
                Subscriptions, donations, or unit economics
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  function customSegmentSection(label: string) {
    return (
      <section className="rounded-2xl border border-app-border bg-app-panel p-6">
        <h2 className="font-heading text-xl text-white">{label}</h2>
        <p className="mt-2 text-sm text-app-muted">
          This custom segment is part of your editable meeting structure.
        </p>
      </section>
    );
  }

  const currentFormatSegment =
    formatSegments[safeSegmentIndex] ??
    ({
      segment_key: "Segue",
      label: "Segue",
      duration_minutes: 5,
    } as const);
  const currentSegment = currentFormatSegment.segment_key;

  function advanceTimerSegment() {
    setSegmentIndex((current) =>
      Math.min(Math.max(formatSegments.length - 1, 0), current + 1),
    );
  }

  async function saveMeetingFromTimer(elapsedSeconds: number) {
    const isMissingDurationColumnError = (message?: string) =>
      Boolean(
        message &&
        message.includes("total_duration_seconds") &&
        message.toLowerCase().includes("schema cache"),
      );

    const nowIso = new Date().toISOString();
    const meetingDate = nowIso.slice(0, 10);

    if (activeMeeting && !activeMeeting.is_closed) {
      let { error } = await supabase
        .from("meetings")
        .update({
          is_closed: true,
          ended_at: nowIso,
          total_duration_seconds: elapsedSeconds,
          updated_at: nowIso,
          health_score: meetingHealth.score,
        })
        .eq("id", activeMeeting.id);

      if (isMissingDurationColumnError(error?.message)) {
        const retry = await supabase
          .from("meetings")
          .update({
            is_closed: true,
            ended_at: nowIso,
            updated_at: nowIso,
            health_score: meetingHealth.score,
          })
          .eq("id", activeMeeting.id);
        error = retry.error;
      }

      if (error) {
        window.alert(`Failed to save meeting: ${error.message}`);
        throw error;
      }

      setData((previous) => ({
        ...previous,
        meetings: previous.meetings.map((meeting) =>
          meeting.id === activeMeeting.id
            ? {
                ...meeting,
                is_closed: true,
                ended_at: nowIso,
                total_duration_seconds: elapsedSeconds,
                updated_at: nowIso,
                health_score: meetingHealth.score,
              }
            : meeting,
        ),
      }));
      return;
    }

    const startedAt = new Date(
      Date.now() - elapsedSeconds * 1000,
    ).toISOString();
    let insertResult = await supabase
      .from("meetings")
      .insert({
        label: `${meetingDate} Meeting`,
        meeting_date: meetingDate,
        started_at: startedAt,
        ended_at: nowIso,
        total_duration_seconds: elapsedSeconds,
        is_closed: true,
        health_score: meetingHealth.score,
      })
      .select("*")
      .single();

    if (isMissingDurationColumnError(insertResult.error?.message)) {
      insertResult = await supabase
        .from("meetings")
        .insert({
          label: `${meetingDate} Meeting`,
          meeting_date: meetingDate,
          started_at: startedAt,
          ended_at: nowIso,
          is_closed: true,
          health_score: meetingHealth.score,
        })
        .select("*")
        .single();
    }

    const { data: insertedMeeting, error } = insertResult;

    if (error || !insertedMeeting) {
      window.alert(
        `Failed to save meeting: ${error?.message ?? "Unknown error"}`,
      );
      throw error ?? new Error("Could not create meeting.");
    }

    setData((previous) => ({
      ...previous,
      meetings: [insertedMeeting, ...previous.meetings],
    }));
  }

  async function updateMeetingLabel(
    id: string,
    rawLabel: string,
    meetingDate: string,
  ) {
    const nextLabel = rawLabel.trim() || `${meetingDate} Meeting`;

    const { error } = await supabase
      .from("meetings")
      .update({ label: nextLabel, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      window.alert(`Failed to rename meeting: ${error.message}`);
      return;
    }

    setData((previous) => ({
      ...previous,
      meetings: previous.meetings.map((meeting) =>
        meeting.id === id
          ? {
              ...meeting,
              label: nextLabel,
              updated_at: new Date().toISOString(),
            }
          : meeting,
      ),
    }));
  }

  return (
    <div className="min-h-screen bg-app-base p-4 md:p-6">
      <header className="mb-4 flex flex-col gap-3 rounded-2xl border border-app-border bg-app-panel p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Image
            src="/SickFit_-_RED.png"
            alt="SickFit logo"
            width={46}
            height={46}
            className="h-11 w-11 object-contain"
          />
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-app-muted">
              SickFit
            </p>
            <h1 className="font-heading text-2xl text-white">
              Meeting Dashboard
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeMeeting ? (
            <span className="rounded border border-app-border px-2 py-1 text-xs text-app-muted">
              {activeMeeting.label} - {activeMeeting.meeting_date}
            </span>
          ) : null}
          <span className="rounded border border-app-border px-2 py-1 text-xs text-white">
            Meeting Health: {meetingHealth.score}% ({meetingHealth.grade})
          </span>
          <span className="rounded border border-app-border px-2 py-1 text-xs text-app-muted">
            IDS Solved: {meetingHealth.solvedIssues}/{meetingHealth.totalIssues}
          </span>
          <MeetingTimer
            segmentLabel={currentFormatSegment.label}
            durationMinutes={currentFormatSegment.duration_minutes}
            canAdvanceSegment={safeSegmentIndex < formatSegments.length - 1}
            onAdvanceSegment={advanceTimerSegment}
            onSaveMeeting={saveMeetingFromTimer}
          />
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
        <nav className="sticky top-2 z-20 mb-4 rounded-2xl border border-app-border bg-app-panel/95 p-3 backdrop-blur">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <p className="text-xs uppercase tracking-[0.12em] text-app-muted">
                Quick Navigation
              </p>
              <form
                onSubmit={(event) => {
                  event.preventDefault();

                  const firstMatch = filteredSections[0];
                  if (firstMatch) {
                    jumpToSection(firstMatch.id);
                  }
                }}
                className="flex flex-1 gap-2"
              >
                <input
                  value={sectionQuery}
                  onChange={(event) => setSectionQuery(event.target.value)}
                  placeholder="Search section (kpi, people, ids, links...)"
                  className="w-full rounded border border-app-border bg-app-base px-2 py-1 text-sm text-white"
                />
                <button
                  type="submit"
                  className="rounded border border-app-border px-3 py-1 text-xs text-white hover:border-[#e72027]"
                >
                  Jump
                </button>
              </form>
            </div>

            <div className="flex flex-wrap gap-2">
              {DASHBOARD_SECTIONS.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => jumpToSection(section.id)}
                  className="rounded-full border border-app-border px-3 py-1 text-xs text-app-muted transition hover:border-[#e72027] hover:text-white"
                >
                  {section.label}
                </button>
              ))}
            </div>

            {sectionQuery.trim() ? (
              <div className="flex flex-wrap gap-2">
                {filteredSections.length > 0 ? (
                  filteredSections.map((section) => (
                    <button
                      key={`search-${section.id}`}
                      type="button"
                      onClick={() => jumpToSection(section.id)}
                      className="rounded border border-[#e72027]/70 bg-[#e72027]/15 px-2 py-1 text-[11px] text-white"
                    >
                      {section.label}
                    </button>
                  ))
                ) : (
                  <p className="text-xs text-app-muted">No section matches.</p>
                )}
              </div>
            ) : null}
          </div>
        </nav>
      ) : null}

      {!presentMode ? (
        <main className="space-y-4">
          <div
            id="kpi-insights"
            ref={registerSectionRef("kpi-insights")}
            className={`${sectionWrapperClass("kpi-insights")} lg:col-span-2`}
          >
            {kpiInsightsSection()}
          </div>
          <div
            id="financials"
            ref={registerSectionRef("financials")}
            className={`${sectionWrapperClass("financials")} lg:col-span-2`}
          >
            {financialsSection()}
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
            <div className="space-y-4">
              <div
                id="scorecard"
                ref={registerSectionRef("scorecard")}
                className={sectionWrapperClass("scorecard")}
              >
                {scorecardSection()}
              </div>
              <div
                id="people"
                ref={registerSectionRef("people")}
                className={sectionWrapperClass("people")}
              >
                {peopleSection()}
              </div>
              <div
                id="agenda"
                ref={registerSectionRef("agenda")}
                className={sectionWrapperClass("agenda")}
              >
                {agendaSection()}
              </div>
              <div
                id="meeting-links"
                ref={registerSectionRef("meeting-links")}
                className={sectionWrapperClass("meeting-links")}
              >
                {meetingLinksSection()}
              </div>
            </div>

            <div className="space-y-4">
              <div
                id="todo-timeline"
                ref={registerSectionRef("todo-timeline")}
                className={sectionWrapperClass("todo-timeline")}
              >
                {todoTimelineSection()}
              </div>
              <div
                id="issues"
                ref={registerSectionRef("issues")}
                className={sectionWrapperClass("issues")}
              >
                {issuesSection()}
              </div>
              <div
                id="todo-list"
                ref={registerSectionRef("todo-list")}
                className={sectionWrapperClass("todo-list")}
              >
                {rocksSection()}
              </div>
              <div
                id="meeting-format"
                ref={registerSectionRef("meeting-format")}
                className={sectionWrapperClass("meeting-format")}
              >
                {meetingFormatSection()}
              </div>
              <div
                id="conclude"
                ref={registerSectionRef("conclude")}
                className={sectionWrapperClass("conclude")}
              >
                {concludeSection()}
              </div>
              <div
                id="past-meetings"
                ref={registerSectionRef("past-meetings")}
                className={sectionWrapperClass("past-meetings")}
              >
                {pastMeetingsSection()}
              </div>
            </div>
          </div>
        </main>
      ) : (
        <PresentationSlider
            currentIndex={safeSegmentIndex}
          onIndexChange={setSegmentIndex}
          segments={formatSegments.map((segment) => ({
            id: segment.id,
            label: segment.label,
          }))}
        >
          {currentSegment === "Segue" && agendaSection()}
          {currentSegment === "Scorecard" && scorecardSection()}
          {currentSegment === "Rocks" && rocksSection()}
          {currentSegment === "Headlines" && agendaSection()}
          {currentSegment === "Links" && meetingLinksSection()}
          {currentSegment === "To-Dos" && rocksSection()}
          {currentSegment === "IDS" && issuesSection()}
          {currentSegment === "Conclude" && concludeSection()}
          {!CORE_SEGMENT_KEYS.includes(currentSegment) &&
            customSegmentSection(currentFormatSegment.label)}
        </PresentationSlider>
      )}
    </div>
  );
}
