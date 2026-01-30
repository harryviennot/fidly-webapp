import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Check if there's a pending invite token to return to
  // The actual token handling happens client-side via sessionStorage
  // Just redirect to root, the app will handle routing
  return NextResponse.redirect(new URL("/", requestUrl.origin));
}
