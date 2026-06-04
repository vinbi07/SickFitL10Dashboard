import { MemberKpiTrackersClient } from "@/components/member-kpi-trackers/MemberKpiTrackersClient";
import { getInitialMemberKpiData } from "@/lib/member-kpi/server";

export const metadata = {
  title: "Member KPI Trackers — SickFit",
};

export default async function MemberKpiTrackersPage() {
  const initialData = await getInitialMemberKpiData();
  return <MemberKpiTrackersClient initialData={initialData} />;
}
