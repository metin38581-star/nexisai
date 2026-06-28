import { redirect } from "next/navigation";

import AdminLoginClient from "@/app/admin-panel-om/AdminLoginClient";
import { ADMIN_DASHBOARD_PATH } from "@/lib/admin-routes";
import { getStandaloneAdminAuthReadiness } from "@/lib/standalone-admin-password";
import { hasValidStandaloneAdminSession } from "@/lib/standalone-admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminPanelOmPage() {
  const authReadiness = getStandaloneAdminAuthReadiness();

  if (authReadiness.isReady && (await hasValidStandaloneAdminSession())) {
    redirect(ADMIN_DASHBOARD_PATH);
  }

  return <AdminLoginClient authReadiness={authReadiness} />;
}
