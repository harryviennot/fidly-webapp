import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next");

  const providerError = requestUrl.searchParams.get("error");
  if (providerError) {
    const description = requestUrl.searchParams.get("error_description") || providerError;
    console.error("[auth/callback] provider error:", providerError, description);
    const showcaseUrl = process.env.NEXT_PUBLIC_SHOWCASE_URL || "https://stampeo.app";
    return NextResponse.redirect(
      `${showcaseUrl}/login?auth_error=${encodeURIComponent(description)}`
    );
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("[auth/callback] exchangeCodeForSession failed:", error);
      const showcaseUrl = process.env.NEXT_PUBLIC_SHOWCASE_URL || "https://stampeo.app";
      return NextResponse.redirect(
        `${showcaseUrl}/login?auth_error=${encodeURIComponent(error.message)}`
      );
    }
  } else {
    console.warn("[auth/callback] no code param in callback URL");
  }

  if (next && next.startsWith("/") && !next.startsWith("//")) {
    return NextResponse.redirect(new URL(next, requestUrl.origin));
  }

  return NextResponse.redirect(new URL("/", requestUrl.origin));
}
