import { redirect } from "next/navigation";

import AdminLoginClient from "@/app/admin-panel-om/AdminLoginClient";
import { ADMIN_DASHBOARD_PATH } from "@/lib/admin-routes";
import { hasValidStandaloneAdminSession } from "@/lib/standalone-admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminPanelOmPage() {
  if (await hasValidStandaloneAdminSession()) {
    redirect(ADMIN_DASHBOARD_PATH);
  }

  return <AdminLoginClient />;
}
