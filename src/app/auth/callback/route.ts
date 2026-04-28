import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import {
  buildLastLoginCookie,
  type LastLoginMethod,
} from "@/lib/last-login";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next");
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    request.headers.get("origin") ??
    requestUrl.origin;

  console.log("[auth/callback] hit:", {
    fullUrl: requestUrl.toString(),
    hasCode: !!code,
    next,
  });

  const providerError = requestUrl.searchParams.get("error");
  if (providerError) {
    const description = requestUrl.searchParams.get("error_description") || providerError;
    console.error("[auth/callback] provider error:", providerError, description);
    const showcaseUrl = process.env.NEXT_PUBLIC_SHOWCASE_URL || "https://stampeo.app";
    return NextResponse.redirect(
      `${showcaseUrl}/login?auth_error=${encodeURIComponent(description)}`
    );
  }

  let lastLoginMethod: LastLoginMethod | null = null;
  let lastLoginEmail: string | undefined;

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("[auth/callback] exchangeCodeForSession failed:", error);
      const showcaseUrl = process.env.NEXT_PUBLIC_SHOWCASE_URL || "https://stampeo.app";
      return NextResponse.redirect(
        `${showcaseUrl}/login?auth_error=${encodeURIComponent(error.message)}`
      );
    }
    const provider = data.user?.app_metadata?.provider;
    if (provider === "google" || provider === "apple" || provider === "email") {
      lastLoginMethod = provider;
      lastLoginEmail = data.user?.email ?? undefined;
    }
  } else {
    console.warn("[auth/callback] no code param in callback URL");
  }

  const target =
    next && next.startsWith("/") && !next.startsWith("//")
      ? new URL(next, baseUrl)
      : new URL("/", baseUrl);

  const response = NextResponse.redirect(target);
  if (lastLoginMethod) {
    response.cookies.set(buildLastLoginCookie(lastLoginMethod, lastLoginEmail));
  }
  return response;
}
