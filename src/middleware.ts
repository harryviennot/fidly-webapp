import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const cookieDomain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({
            name,
            value,
            ...options,
            domain: cookieDomain,
          });
        },
        remove(name: string, options: Record<string, unknown>) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({
            name,
            value: "",
            ...options,
            domain: cookieDomain,
          });
        },
      },
    }
  );

  // getSession() will attempt to refresh an expired access token. If the
  // refresh token is missing/stale/already-rotated, supabase throws
  // (AuthApiError: refresh_token_not_found). Treat any failure as "no session"
  // rather than letting it crash the request with a 500.
  let session = null;
  try {
    const result = await supabase.auth.getSession();
    if (result.error) throw result.error;
    session = result.data.session;
  } catch {
    session = null;
  }

  // If no session, clear any stale auth cookies and redirect to showcase login.
  if (!session) {
    const showcaseUrl =
      process.env.NEXT_PUBLIC_SHOWCASE_URL || "https://stampeo.app";
    const loginUrl = `${showcaseUrl}/login?redirect=${encodeURIComponent(request.url)}`;
    const redirect = NextResponse.redirect(loginUrl);

    // Drop dead Supabase auth cookies so the bad refresh token can't keep
    // re-triggering the error on subsequent requests.
    for (const cookie of request.cookies.getAll()) {
      if (cookie.name.startsWith("sb-")) {
        redirect.cookies.set({
          name: cookie.name,
          value: "",
          maxAge: 0,
          domain: cookieDomain,
        });
      }
    }

    return redirect;
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     * - api routes (they handle their own auth)
     * - register (public customer registration page)
     * - invite (team invitation acceptance page)
     * - auth (OAuth callback writes the session cookie itself; middleware
     *   running first would see no session and redirect to login before
     *   the code can be exchanged)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api|register|invite|auth).*)",
  ],
};
