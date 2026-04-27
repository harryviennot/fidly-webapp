"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { createClient } from "../utils/supabase/client";
import type { User, Session, AuthError, Provider } from "@supabase/supabase-js";

export type OAuthProvider = Extract<Provider, "google" | "apple">;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    name: string
  ) => Promise<{ data: { user: User | null } | null; error: AuthError | null }>;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ error: AuthError | null }>;
  signInWithOAuth: (
    provider: OAuthProvider,
    returnTo?: string
  ) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  verifyOtp: (
    email: string,
    token: string
  ) => Promise<{ error: AuthError | null }>;
  resendOtp: (email: string) => Promise<{ error: AuthError | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const signUp = useCallback(
    async (email: string, password: string, name: string) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      return { data: data ? { user: data.user } : null, error };
    },
    [supabase.auth]
  );

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    },
    [supabase.auth]
  );

  const signInWithOAuth = useCallback(
    async (provider: OAuthProvider, returnTo?: string) => {
      // Use the configured app URL when present so OAuth lands on the
      // cookie-domain-compatible host (e.g. nip.io) even if the current
      // tab somehow resolved to localhost. Falls back to the live origin
      // only when NEXT_PUBLIC_APP_URL isn't set.
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL || globalThis.location.origin;
      const callbackUrl = new URL("/auth/callback", baseUrl);
      if (returnTo) {
        callbackUrl.searchParams.set("next", returnTo);
        try {
          sessionStorage.setItem("auth_next", returnTo);
        } catch {
          // sessionStorage unavailable (private browsing) — silently degrade.
        }
      }
      console.log("[auth] signInWithOAuth", { provider, returnTo, redirectTo: callbackUrl.toString() });
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: callbackUrl.toString() },
      });
      return { error };
    },
    [supabase.auth]
  );

  const verifyOtp = useCallback(
    async (email: string, token: string) => {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: "signup",
      });
      return { error };
    },
    [supabase.auth]
  );

  const resendOtp = useCallback(
    async (email: string) => {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
      });
      return { error };
    },
    [supabase.auth]
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    // Redirect to showcase login after sign out
    const showcaseUrl =
      process.env.NEXT_PUBLIC_SHOWCASE_URL || "https://stampeo.app";
    window.location.href = `${showcaseUrl}/login`;
  }, [supabase.auth]);

  return (
    <AuthContext.Provider
      value={{ user, session, loading, signUp, signIn, signInWithOAuth, signOut, verifyOtp, resendOtp }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
