"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { createBrowserSupabaseClient } from "@/services/supabase";
import type { AuthState, LoginCredentials } from "@/types";

export function useAuth() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    status: "initializing",
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.warn("Supabase session load error:", error.message);
          if (
            error.message.includes("Refresh Token Not Found") ||
            error.message.includes("invalid_grant") ||
            error.status === 400
          ) {
            await supabase.auth.signOut();
            if (typeof window !== "undefined") {
              window.location.reload();
            }
            return;
          }
        }

        if (!isMounted) {
          return;
        }

        setAuthState({
          user: data.session?.user ?? null,
          session: data.session,
          status: data.session ? "authenticated" : "unauthenticated",
          isLoading: false,
          error,
        });
      } catch (err: any) {
        console.error("Failed to load session:", err);
        if (
          err.message?.includes("Refresh Token Not Found") ||
          err.message?.includes("invalid_grant") ||
          err.status === 400
        ) {
          await supabase.auth.signOut();
          if (typeof window !== "undefined") {
            window.location.reload();
          }
          return;
        }
        if (!isMounted) {
          return;
        }
        setAuthState((curr) => ({ ...curr, isLoading: false, error: err }));
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthState({
        user: session?.user ?? null,
        session,
        status: session ? "authenticated" : "unauthenticated",
        isLoading: false,
        error: null,
      });
    });

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      if (
        reason &&
        (reason.message?.includes("Refresh Token Not Found") ||
          reason.message?.includes("invalid_grant") ||
          reason.status === 400 ||
          reason.name === "AuthApiError")
      ) {
        console.warn("Stale Supabase session detected via unhandled rejection. Clearing...", reason);
        event.preventDefault(); // Prevent Next.js dev overlay from showing
        supabase.auth.signOut().then(() => {
          window.location.reload();
        });
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("unhandledrejection", handleUnhandledRejection);
    }

    void loadSession();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      if (typeof window !== "undefined") {
        window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      }
    };
  }, [supabase]);

  const login = useCallback(
    async ({ email, password }: LoginCredentials) => {
      setAuthState((current) => ({ ...current, isLoading: true, error: null }));

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      setAuthState({
        user: data.session?.user ?? null,
        session: data.session,
        status: data.session ? "authenticated" : "unauthenticated",
        isLoading: false,
        error,
      });

      return { data, error };
    },
    [supabase]
  );

  const logout = useCallback(async () => {
    setAuthState((current) => ({ ...current, isLoading: true, error: null }));

    const { error } = await supabase.auth.signOut();

    setAuthState({
      user: null,
      session: null,
      status: "unauthenticated",
      isLoading: false,
      error,
    });

    return { error };
  }, [supabase]);

  const refreshSession = useCallback(async () => {
    setAuthState((current) => ({ ...current, isLoading: true, error: null }));

    const { data, error } = await supabase.auth.refreshSession();

    setAuthState({
      user: data.session?.user ?? null,
      session: data.session,
      status: data.session ? "authenticated" : "unauthenticated",
      isLoading: false,
      error,
    });

    return { data, error };
  }, [supabase]);

  return {
    ...authState,
    login,
    logout,
    refreshSession,
    isAuthenticated: authState.status === "authenticated",
  };
}
