export const AGENDA_SEGMENTS = [
  "Segue",
  "Scorecard",
  "Rocks",
  "Headlines",
  "Links",
  "To-Dos",
  "IDS",
  "Conclude",
] as const;

export type AgendaSegment = (typeof AGENDA_SEGMENTS)[number];

export const SEGMENT_DURATIONS_MINUTES: Record<AgendaSegment, number> = {
  Segue: 5,
  Scorecard: 5,
  Rocks: 5,
  Headlines: 5,
  Links: 10,
  "To-Dos": 5,
  IDS: 60,
  Conclude: 5,
};

export const OWNERS = ["Joey", "Rena", "Paden", "Mike", "Krystle"] as const;

export type Owner = (typeof OWNERS)[number];

export const OWNER_ROLES: Record<Owner, string> = {
  Joey: "CTO",
  Rena: "Digital Brand & Partnership Lead",
  Paden: "CEO",
  Mike: "Graphic Design",
  Krystle: "Partnerships & Sales",
};

export const ROLE_OPTIONS = Array.from(new Set(Object.values(OWNER_ROLES)));

export const OWNER_INITIALS: Record<Owner, string> = {
  Joey: "JS",
  Rena: "RV",
  Paden: "PW",
  Mike: "MG",
  Krystle: "KS",
};
