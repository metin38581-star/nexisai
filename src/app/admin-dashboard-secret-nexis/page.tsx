import { redirect } from "next/navigation";

import SuperAdminDashboard from "@/components/admin/SuperAdminDashboard";
import { hasValidStandaloneAdminSession } from "@/lib/standalone-admin-auth";

export const dynamic = "force-dynamic";

export default async function SecretAdminDashboardPage() {
  if (!(await hasValidStandaloneAdminSession())) {
    redirect("/admin-login");
  }

  return <SuperAdminDashboard />;
}
