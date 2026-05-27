import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/supabase";

const LOCAL_SUPABASE_URL = "http://localhost:54321";
const LOCAL_SUPABASE_ANON_KEY = "local-anon-key";
const LOCAL_SUPABASE_SERVICE_ROLE_KEY = "local-service-role-key";

const PLACEHOLDER_VALUES = new Set([
  "",
  "your-project-url",
  "your-anon-key",
  "your-service-role-key",
]);

type SupabaseConfig = {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
};

let browserClient: SupabaseClient<Database> | undefined;
let serverClient: SupabaseClient<Database> | undefined;

const getConfiguredValue = (value: string | undefined, fallback: string): string => {
  if (!value || PLACEHOLDER_VALUES.has(value)) {
    return fallback;
  }

  return value;
};

const getSupabaseConfig = (): SupabaseConfig => ({
  url: getConfiguredValue(process.env.NEXT_PUBLIC_SUPABASE_URL, LOCAL_SUPABASE_URL),
  anonKey: getConfiguredValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, LOCAL_SUPABASE_ANON_KEY),
  serviceRoleKey: getConfiguredValue(
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    LOCAL_SUPABASE_SERVICE_ROLE_KEY
  ),
});

export const createBrowserSupabaseClient = (): SupabaseClient<Database> => {
  if (!browserClient) {
    const { url, anonKey } = getSupabaseConfig();

    browserClient = createClient<Database>(url, anonKey);
  }

  return browserClient;
};

export const createServerSupabaseClient = (): SupabaseClient<Database> => {
  if (typeof window !== "undefined") {
    throw new Error("createServerSupabaseClient can only be used on the server.");
  }

  if (!serverClient) {
    const { url, serviceRoleKey } = getSupabaseConfig();

    // TODO(oma-deferred): connect to the provisioned Supabase project when real keys are available.
    serverClient = createClient<Database>(url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return serverClient;
};

export const supabase = createBrowserSupabaseClient();
