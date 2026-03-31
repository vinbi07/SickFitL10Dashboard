import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { getDashboardData } from "@/lib/supabase/dashboard";

export default async function DashboardPage() {
  const data = await getDashboardData();

  return <DashboardClient initialData={data} />;
}
