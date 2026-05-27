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
      const { data, error } = await supabase.auth.getSession();

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

    void loadSession();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
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
