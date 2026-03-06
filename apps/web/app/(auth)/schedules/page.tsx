import { getUserForPage } from "@/lib/auth/get-user-for-page";
import { fetchSchedules } from "@/lib/data/schedules";
import SchedulesClient from "./SchedulesClient";

export default async function SchedulesPage() {
  const user = await getUserForPage();
  const initialData = await fetchSchedules(user);

  return <SchedulesClient initialData={initialData} />;
}
