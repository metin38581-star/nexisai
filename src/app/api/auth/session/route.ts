import { NextResponse } from "next/server";

import { handleApiRouteError } from "@/lib/api-error";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type AuthAction = "register" | "login";

interface AuthSessionRequest {
  action?: AuthAction;
  email?: string;
  password?: string;
  companyName?: string;
}

function resolveSiteUrl(request: Request): string | undefined {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (configured) {
    return configured;
  }

  const origin = request.headers.get("origin")?.trim().replace(/\/$/, "");
  return origin || undefined;
}

function resolveDisplayName(
  companyName: string | undefined,
  email: string,
  metadata: Record<string, unknown> | undefined,
): string {
  const trimmedCompany = companyName?.trim();
  if (trimmedCompany) {
    return trimmedCompany;
  }

  const fullName = metadata?.full_name;
  if (typeof fullName === "string" && fullName.trim()) {
    return fullName.trim();
  }

  return email.split("@")[0]?.trim() || "İşletme Hesabı";
}

function validatePayload(body: AuthSessionRequest): {
  action: AuthAction;
  email: string;
  password: string;
  companyName?: string;
} | { error: string } {
  const action = body.action;
  const email = body.email?.trim() ?? "";
  const password = body.password?.trim() ?? "";
  const companyName = body.companyName?.trim();

  if (action !== "register" && action !== "login") {
    return { error: "Geçersiz oturum işlemi." };
  }

  if (action === "register" && !companyName) {
    return { error: "İşletme adı zorunludur." };
  }

  if (!email) {
    return { error: "E-posta adresi zorunludur." };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Geçerli bir e-posta adresi girin." };
  }

  if (!password) {
    return { error: "Şifre alanı zorunludur." };
  }

  if (password.length < 6) {
    return { error: "Şifre en az 6 karakter olmalıdır." };
  }

  return { action, email, password, companyName };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AuthSessionRequest;
    const validated = validatePayload(body);

    if ("error" in validated) {
      return NextResponse.json(
        { success: false, error: validated.error },
        { status: 400 },
      );
    }

    const { action, email, password, companyName } = validated;
    const supabase = await createSupabaseServerClient();
    const siteUrl = resolveSiteUrl(request);

    const authResult =
      action === "register"
        ? await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                full_name: companyName,
                company_name: companyName,
              },
              ...(siteUrl
                ? { emailRedirectTo: `${siteUrl}/dashboard` }
                : {}),
            },
          })
        : await supabase.auth.signInWithPassword({
            email,
            password,
          });

    if (authResult.error) {
      const status =
        typeof authResult.error.status === "number" &&
        authResult.error.status >= 500
          ? 503
          : 400;

      return NextResponse.json(
        {
          success: false,
          error: authResult.error.message,
        },
        { status },
      );
    }

    const user = authResult.data.user;
    const session = authResult.data.session;

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Kullanıcı kaydı oluşturulamadı.",
        },
        { status: 400 },
      );
    }

    if (!session?.access_token) {
      return NextResponse.json({
        success: true,
        requiresEmailConfirmation: action === "register",
        message:
          action === "register"
            ? "Kayıt oluşturuldu. E-posta doğrulaması sonrası giriş yapabilirsiniz."
            : "Oturum başlatılamadı. Lütfen tekrar deneyin.",
      });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email ?? email,
        userName: resolveDisplayName(
          companyName,
          email,
          user.user_metadata as Record<string, unknown> | undefined,
        ),
      },
      accessToken: session.access_token,
    });
  } catch (error) {
    return handleApiRouteError(error, "Oturum işlemi sırasında bir hata oluştu.");
  }
}
