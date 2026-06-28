/** Gizli SuperAdmin giriş kapısı — URL'yi dışarıda paylaşmayın. */
export const ADMIN_LOGIN_PATH = "/admin-panel-om";

/** SuperAdmin merkezi veri paneli. */
export const ADMIN_DASHBOARD_PATH = "/admin-dashboard-secret-nexis";

/** İşletme admin paneli (oturum gerekli). */
export const ADMIN_BUSINESS_PATH = "/admin";

/** Eski/tahmin edilebilir admin giriş yolları — ana sayfaya mühürlenir. */
export const SEALED_LEGACY_ADMIN_PATHS = ["/admin-login"] as const;
