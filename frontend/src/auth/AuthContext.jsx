import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";

const configuredEmailRedirectTo = import.meta.env.VITE_SUPABASE_EMAIL_REDIRECT_TO?.trim();
const configuredOAuthRedirectTo = import.meta.env.VITE_SUPABASE_OAUTH_REDIRECT_TO?.trim();

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
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      throw new Error(`Unexpected response type: ${contentType || "unknown"}`);
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

function isLocalhostOrigin(origin) {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(?::\d+)?$/i.test(origin);
}

function resolveRedirectUrl(explicitUrl, { fallbackPath, useOriginOnly } = {}) {
  const hasWindow = typeof window !== "undefined";
  const runtimeUrl = hasWindow ? new URL(window.location.href) : null;

  const normaliseAgainstRuntimeOrigin = (url) => {
    if (!runtimeUrl) {
      return url;
    }

    if (!isLocalhostOrigin(runtimeUrl.origin) && isLocalhostOrigin(url.origin)) {
      url.protocol = runtimeUrl.protocol;
      url.host = runtimeUrl.host;
    }

    return url;
  };

  if (explicitUrl) {
    let resolvedUrl;
    try {
      resolvedUrl = runtimeUrl ? new URL(explicitUrl, runtimeUrl.origin) : new URL(explicitUrl);
    } catch (error) {
      console.warn("Ignoring invalid redirect URL", explicitUrl, error);
    }

    if (resolvedUrl) {
      const normalisedUrl = normaliseAgainstRuntimeOrigin(resolvedUrl);
      return useOriginOnly ? normalisedUrl.origin : normalisedUrl.toString();
    }
  }

  if (!runtimeUrl) {
    return undefined;
  }

  if (useOriginOnly) {
    return runtimeUrl.origin;
  }

  const fallbackUrl = new URL(runtimeUrl.toString());
  fallbackUrl.hash = "";
  fallbackUrl.search = "";

  if (fallbackPath) {
    fallbackUrl.pathname = fallbackPath;
  }

  return fallbackUrl.toString();
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

    async function exchangeOAuthCode() {
      const currentUrl = new URL(window.location.href);
      const hasCode = currentUrl.searchParams.has("code");
      const hasState = currentUrl.searchParams.has("state");

      if (!hasCode || !hasState) {
        return;
      }

      setLoading(true);

      try {
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(
          currentUrl.toString(),
        );

        if (exchangeError) {
          throw exchangeError;
        }

        if (!mounted) return;

        setSession(data.session ?? null);
        setError(null);
      } catch (exchangeError) {
        console.error("Failed to exchange OAuth code", exchangeError);
        if (mounted) {
          setError(exchangeError);
        }
      } finally {
        if (mounted) {
          currentUrl.searchParams.delete("code");
          currentUrl.searchParams.delete("state");
          currentUrl.searchParams.delete("scope");
          currentUrl.searchParams.delete("auth_code");

          const cleanedUrl = `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`;
          window.history.replaceState({}, document.title, cleanedUrl);

          setLoading(false);
        }
      }
    }

    exchangeOAuthCode();

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

  const userId = session?.user?.id ?? null;

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setProfile(null);
      return;
    }

    async function loadProfile() {
      if (!userId) {
        setProfile(null);
        return;
      }
      try {
        const { data, error: profileError } = await supabase
          .from("profiles")
          .select("id, plan, role, monthly_render_count, monthly_render_limit, upload_override_bytes")
          .eq("id", userId)
          .maybeSingle();

        if (profileError) {
          throw profileError;
        }

        if (!data) {
          const { data: inserted, error: insertError } = await supabase
            .from("profiles")
            .insert({
              id: userId,
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

        const missingProfileTable =
          profileErr?.code === "PGRST205" || profileErr?.message?.includes("public.profiles");

        if (missingProfileTable) {
          console.warn("profiles table missing; using fallback profile limits");
          setProfile({
            id: userId,
            plan: "free",
            role: "user",
            monthly_render_count: 0,
            monthly_render_limit: null,
            upload_override_bytes: null,
          });
          setError(null);
          return;
        }

        setError(profileErr);
      }
    }

    loadProfile();
  }, [userId]);

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
        const redirectTo = resolveRedirectUrl(configuredOAuthRedirectTo, { useOriginOnly: true });
        const oauthOptions = {
          queryParams: { prompt: "select_account" },
        };
        if (redirectTo) {
          oauthOptions.redirectTo = redirectTo;
        }
        const { error: authError } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: oauthOptions,
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
        const emailRedirectTo = resolveRedirectUrl(configuredEmailRedirectTo);
        const { error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: emailRedirectTo ? { emailRedirectTo } : undefined,
        });
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
        const emailRedirectTo = resolveRedirectUrl(configuredEmailRedirectTo);
        const otpOptions = {};
        if (emailRedirectTo) {
          otpOptions.emailRedirectTo = emailRedirectTo;
        }
        const { error: authError } = await supabase.auth.signInWithOtp({
          email,
          options: otpOptions,
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
        const currentUserId = session?.user?.id;
        if (!currentUserId) return;
        try {
          const { data, error: profileError } = await supabase
            .from("profiles")
            .select("id, plan, role, monthly_render_count, monthly_render_limit, upload_override_bytes")
            .eq("id", currentUserId)
            .maybeSingle();
          if (profileError) {
            throw profileError;
          }
          setProfile(data);
        } catch (profileErr) {
          const missingProfileTable =
            profileErr?.code === "PGRST205" || profileErr?.message?.includes("public.profiles");
          if (missingProfileTable) {
            console.warn("profiles table missing during refresh; keeping existing profile");
            setError(null);
            return;
          }
          setError(profileErr);
          throw profileErr;
        }
      },
    }),
    [error, loading, planLimits, plansCatalog, profile, session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
