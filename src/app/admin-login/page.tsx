import { redirect } from "next/navigation";

import AdminLoginClient from "@/app/admin-login/AdminLoginClient";
import { hasValidStandaloneAdminSession } from "@/lib/standalone-admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  if (await hasValidStandaloneAdminSession()) {
    redirect("/admin-dashboard-secret-nexis");
  }

  return <AdminLoginClient />;
}
