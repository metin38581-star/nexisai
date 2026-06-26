import { redirect } from "next/navigation";

import AdminBusinessDashboard from "@/components/admin/AdminBusinessDashboard";
import { hasValidStandaloneAdminSession } from "@/lib/standalone-admin-auth";

export default async function AdminPage() {
  const authenticated = await hasValidStandaloneAdminSession();
  if (!authenticated) {
    redirect("/admin-login");
  }

  return <AdminBusinessDashboard />;
}
