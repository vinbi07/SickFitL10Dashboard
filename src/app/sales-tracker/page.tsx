import { SalesTrackerClient } from "@/components/sales-tracker/SalesTrackerClient";
import { getInitialSalesTrackerData } from "@/lib/sales-tracker/server";

export default async function SalesTrackerPage() {
  const initialData = await getInitialSalesTrackerData();

  return <SalesTrackerClient initialData={initialData} />;
}
