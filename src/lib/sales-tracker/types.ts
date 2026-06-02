export interface SalesRepRow {
  id: string;
  name: string;
  daily_goal: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface SalesWeekEntryRow {
  id: string;
  rep_id: string;
  week_start_date: string;
  entry_date: string;
  day_index: number;
  amount: number | null;
  note: string;
  created_at: string;
  updated_at: string;
}

export interface SalesDayEntry {
  id?: string;
  rep_id: string;
  week_start_date: string;
  entry_date: string;
  day_index: number;
  amount: number | null;
  note: string;
}

export type SalesDayStatus = "hit" | "miss" | "empty";

export interface SalesRepWithEntries {
  rep: SalesRepRow;
  entries: SalesDayEntry[];
}

export interface SalesTrackerInitialData {
  weekStartDate: string;
  reps: SalesRepRow[];
  entries: SalesWeekEntryRow[];
}
