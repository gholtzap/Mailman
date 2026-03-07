import { getUserForPage } from "@/lib/auth/get-user-for-page";
import { fetchDashboardData } from "@/lib/data/dashboard";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const user = await getUserForPage();
  const initialData = await fetchDashboardData(user);

  return <DashboardClient initialData={initialData} />;
}
