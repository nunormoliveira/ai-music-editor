import { useEffect, useMemo, useState } from "react";
import Editor from "./Editor.jsx";
import LandingPage from "./LandingPage.jsx";
import AuthView from "./auth/AuthView.jsx";
import { useAuth } from "./auth/AuthContext.jsx";

const VIEW = {
  landing: "landing",
  editor: "editor",
};

function getViewFromHash() {
  if (typeof window === "undefined") {
    return VIEW.landing;
  }
  return window.location.hash === "#editor" ? VIEW.editor : VIEW.landing;
}

export default function App() {
  const { session, loading, planLimits, profile, signOut, refreshProfile } = useAuth();
  const [view, setView] = useState(() => getViewFromHash());

  useEffect(() => {
    const handleHashChange = () => {
      setView(getViewFromHash());
    };

    if (typeof window === "undefined") {
      return undefined;
    }

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  useEffect(() => {
    if (!session) {
      setView(VIEW.landing);
    }
  }, [session]);

  const accessToken = useMemo(() => session?.access_token ?? null, [session?.access_token]);

  const openEditor = () => {
    if (typeof window !== "undefined") {
      if (window.location.hash !== "#editor") {
        window.location.hash = "editor";
      }
    }
    setView(VIEW.editor);
  };

  const openLanding = () => {
    if (typeof window !== "undefined" && window.location.hash) {
      window.location.hash = "";
    }
    setView(VIEW.landing);
  };

  if (loading) {
    return (
      <div className="auth-shell">
        <div className="auth-card glass-card auth-card--loading">
          <div className="auth-header">
            <div className="auth-logo">♫</div>
            <div>
              <p className="auth-kicker">Creative Studio</p>
              <h1 className="auth-title">Booting up your studio…</h1>
            </div>
          </div>
          <div className="auth-loading-spinner" />
        </div>
      </div>
    );
  }

  if (!session) {
    return <AuthView />;
  }

  if (view === VIEW.editor) {
    return (
      <Editor
        onNavigateHome={openLanding}
        session={session}
        accessToken={accessToken}
        planLimits={planLimits}
        profile={profile}
        onUsageUpdate={refreshProfile}
      />
    );
  }

  return (
    <LandingPage
      onStart={openEditor}
      onSignOut={signOut}
      planLimits={planLimits}
      profile={profile}
      session={session}
    />
  );
}
