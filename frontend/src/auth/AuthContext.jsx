import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";

const AuthContext = createContext({
  session: null,
  user: null,
  loading: true,
  profile: null,
  planLimits: null,
  plansCatalog: [],
  error: null,
  signInWithGoogle: async () => {},
  signInWithPassword: async () => {},
  signUpWithPassword: async () => {},
  sendMagicLink: async () => {},
  signOut: async () => {},
  refreshProfile: async () => {},
});

const MB = 1024 * 1024;

const FALLBACK_PLANS = [
  {
    key: "free",
    name: "Free",
    maxUploadBytes: 20 * MB,
    maxMonthlyRenders: 25,
    signedUrlTtlSeconds: 60 * 30,
  },
  {
    key: "pro",
    name: "Pro",
    maxUploadBytes: 200 * MB,
    maxMonthlyRenders: 250,
    signedUrlTtlSeconds: 60 * 60,
  },
  {
    key: "enterprise",
    name: "Enterprise",
    maxUploadBytes: 512 * MB,
    maxMonthlyRenders: null,
    signedUrlTtlSeconds: 60 * 60 * 24,
  },
];

const MISSING_SUPABASE_ERROR_MESSAGE =
  "Supabase credentials are not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable authentication.";

async function fetchPlanCatalog() {
  try {
    const response = await fetch("/api/plan-limits");
    if (!response.ok) {
      throw new Error("Unable to load plan catalog");
    }
    const payload = await response.json();
    return payload?.plans ?? [];
  } catch (error) {
    console.error("Failed to fetch plan catalog", error);
    return [];
  }
}

function mergePlanLimitsFromCatalog(planKey, catalog, profileOverrideBytes) {
  const base =
    catalog.find((plan) => plan.key === planKey) || FALLBACK_PLANS.find((plan) => plan.key === planKey) || FALLBACK_PLANS[0];
  const overrides = {};
  if (typeof profileOverrideBytes === "number" && profileOverrideBytes > 0) {
    overrides.maxUploadBytes = profileOverrideBytes;
  }
  return { ...base, ...overrides };
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [plansCatalog, setPlansCatalog] = useState(FALLBACK_PLANS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPlanCatalog().then((plans) => {
      if (Array.isArray(plans) && plans.length > 0) {
        setPlansCatalog(plans);
      }
    });
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      setError(new Error(MISSING_SUPABASE_ERROR_MESSAGE));
      return undefined;
    }

    let mounted = true;

    async function initSession() {
      try {
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          throw sessionError;
        }
        if (!mounted) return;
        setSession(data.session ?? null);
      } catch (err) {
        console.error("Failed to initialise session", err);
        if (mounted) {
          setError(err);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    initSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setProfile(null);
    });

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setProfile(null);
      return;
    }

    async function loadProfile() {
      if (!session?.user) {
        setProfile(null);
        return;
      }
      try {
        const { data, error: profileError } = await supabase
          .from("profiles")
          .select("id, plan, role, monthly_render_count, monthly_render_limit, upload_override_bytes")
          .eq("id", session.user.id)
          .maybeSingle();

        if (profileError) {
          throw profileError;
        }

        if (!data) {
          const { data: inserted, error: insertError } = await supabase
            .from("profiles")
            .insert({
              id: session.user.id,
              plan: "free",
              role: "user",
              monthly_render_count: 0,
              monthly_render_limit: null,
              upload_override_bytes: null,
            })
            .select("id, plan, role, monthly_render_count, monthly_render_limit, upload_override_bytes")
            .single();

          if (insertError) {
            throw insertError;
          }
          setProfile(inserted);
          setError(null);
        } else {
          setProfile(data);
          setError(null);
        }
      } catch (profileErr) {
        console.error("Failed to load profile", profileErr);
        setError(profileErr);
      }
    }

    loadProfile();
  }, [session?.user?.id]);

  const planLimits = useMemo(() => {
    if (!profile) return null;
    const fromCatalog = mergePlanLimitsFromCatalog(profile.plan, plansCatalog, profile.upload_override_bytes);
    if (!fromCatalog) {
      return null;
    }
    return {
      ...fromCatalog,
      monthlyRenderCount: profile.monthly_render_count ?? 0,
      monthlyRenderLimit:
        profile.monthly_render_limit ?? fromCatalog.maxMonthlyRenders ?? fromCatalog.monthlyRenderLimit ?? null,
    };
  }, [plansCatalog, profile]);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      profile,
      planLimits,
      plansCatalog,
      error,
      async signInWithGoogle() {
        if (!isSupabaseConfigured) {
          const configurationError = new Error(MISSING_SUPABASE_ERROR_MESSAGE);
          setError(configurationError);
          throw configurationError;
        }
        setError(null);
        const { error: authError } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            queryParams: { prompt: "select_account" },
            redirectTo: window.location.origin,
          },
        });
        if (authError) {
          setError(authError);
          throw authError;
        }
      },
      async signInWithPassword(email, password) {
        if (!isSupabaseConfigured) {
          const configurationError = new Error(MISSING_SUPABASE_ERROR_MESSAGE);
          setError(configurationError);
          throw configurationError;
        }
        setError(null);
        const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) {
          setError(authError);
          throw authError;
        }
      },
      async signUpWithPassword(email, password) {
        if (!isSupabaseConfigured) {
          const configurationError = new Error(MISSING_SUPABASE_ERROR_MESSAGE);
          setError(configurationError);
          throw configurationError;
        }
        setError(null);
        const { error: authError } = await supabase.auth.signUp({ email, password });
        if (authError) {
          setError(authError);
          throw authError;
        }
      },
      async sendMagicLink(email) {
        if (!isSupabaseConfigured) {
          const configurationError = new Error(MISSING_SUPABASE_ERROR_MESSAGE);
          setError(configurationError);
          throw configurationError;
        }
        setError(null);
        const { error: authError } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: window.location.origin,
          },
        });
        if (authError) {
          setError(authError);
          throw authError;
        }
      },
      async signOut() {
        if (!isSupabaseConfigured) {
          const configurationError = new Error(MISSING_SUPABASE_ERROR_MESSAGE);
          setError(configurationError);
          throw configurationError;
        }
        setError(null);
        const { error: signOutError } = await supabase.auth.signOut();
        if (signOutError) {
          setError(signOutError);
          throw signOutError;
        }
      },
      async refreshProfile() {
        if (!isSupabaseConfigured) {
          const configurationError = new Error(MISSING_SUPABASE_ERROR_MESSAGE);
          setError(configurationError);
          throw configurationError;
        }
        if (!session?.user) return;
        const { data, error: profileError } = await supabase
          .from("profiles")
          .select("id, plan, role, monthly_render_count, monthly_render_limit, upload_override_bytes")
          .eq("id", session.user.id)
          .maybeSingle();
        if (profileError) {
          throw profileError;
        }
        setProfile(data);
      },
    }),
    [error, loading, planLimits, plansCatalog, profile, session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
