import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { MemberKpiInitialData } from "./types";

export async function getInitialMemberKpiData(): Promise<MemberKpiInitialData> {
  const supabase = await createSupabaseServerClient();

  const [peopleResult, kpisResult] = await Promise.all([
    supabase
      .from("people")
      .select("id, full_name, role, accent_color, is_active")
      .eq("is_active", true)
      .order("full_name", { ascending: true }),
    supabase
      .from("member_kpis")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);

  return {
    people: (peopleResult.data ?? []) as MemberKpiInitialData["people"],
    kpis: (kpisResult.data ?? []) as MemberKpiInitialData["kpis"],
  };
}
