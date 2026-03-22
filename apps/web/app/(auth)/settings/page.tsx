import { getUserForPage } from "@/lib/auth/get-user-for-page";
import { fetchSettings } from "@/lib/data/settings";
import SettingsClient from "./SettingsClient";

export default async function SettingsPage() {
  const user = await getUserForPage();
  const initialData = fetchSettings(user);

  return <SettingsClient initialData={initialData} />;
}
