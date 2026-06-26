import { redirect } from "next/navigation";

import SuperAdminDashboard from "@/components/admin/SuperAdminDashboard";
import { isSuperAdminEmail } from "@/lib/admin-emails";
import { getActiveSessionUser } from "@/lib/auth-session";

export const dynamic = "force-dynamic";

export default async function SecretAdminDashboardPage() {
  const user = await getActiveSessionUser();

  if (!user?.email || !isSuperAdminEmail(user.email)) {
    redirect("/");
  }

  return <SuperAdminDashboard adminEmail={user.email} />;
}
