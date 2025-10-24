import { useMemo, useState } from "react";
import { useAuth } from "./AuthContext";

const TABS = {
  signin: "signin",
  signup: "signup",
  magic: "magic",
};

export default function AuthView() {
  const { signInWithGoogle, signInWithPassword, signUpWithPassword, sendMagicLink, error } = useAuth();
  const [activeTab, setActiveTab] = useState(TABS.signin);
  const [formState, setFormState] = useState({ email: "", password: "" });
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState(null);

  const tabCopy = useMemo(() => {
    switch (activeTab) {
      case TABS.signup:
        return {
          title: "Create your Creative Studio account",
          cta: "Sign up",
        };
      case TABS.magic:
        return {
          title: "Sign in with a magic link",
          cta: "Send magic link",
        };
      case TABS.signin:
      default:
        return {
          title: "Welcome back",
          cta: "Sign in",
        };
    }
  }, [activeTab]);

  async function handleSubmit(event) {
    event.preventDefault();
    setPending(true);
    setMessage(null);

    try {
      if (activeTab === TABS.signin) {
        await signInWithPassword(formState.email, formState.password);
      } else if (activeTab === TABS.signup) {
        await signUpWithPassword(formState.email, formState.password);
        setMessage("Account created. Please confirm your email and sign in.");
      } else {
        await sendMagicLink(formState.email);
        setMessage("Magic link sent! Check your inbox to continue.");
      }
    } catch (err) {
      setMessage(err?.message ?? "An error occurred");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card glass-card">
        <header className="auth-header">
          <div className="auth-logo">♫</div>
          <div>
            <p className="auth-kicker">Creative Studio</p>
            <h1 className="auth-title">{tabCopy.title}</h1>
          </div>
        </header>

        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${activeTab === TABS.signin ? "is-active" : ""}`}
            onClick={() => {
              setActiveTab(TABS.signin);
              setMessage(null);
            }}
          >
            Sign in
          </button>
          <button
            type="button"
            className={`auth-tab ${activeTab === TABS.signup ? "is-active" : ""}`}
            onClick={() => {
              setActiveTab(TABS.signup);
              setMessage(null);
            }}
          >
            Sign up
          </button>
          <button
            type="button"
            className={`auth-tab ${activeTab === TABS.magic ? "is-active" : ""}`}
            onClick={() => {
              setActiveTab(TABS.magic);
              setMessage(null);
            }}
          >
            Magic link
          </button>
        </div>

        <button
          type="button"
          className="auth-google"
          onClick={() => {
            setMessage(null);
            signInWithGoogle().catch((err) => setMessage(err?.message ?? "Failed to sign in with Google"));
          }}
        >
          Continue with Google
        </button>

        <div className="auth-divider">
          <span>or</span>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-label" htmlFor="email">
            Email
            <input
              id="email"
              type="email"
              required
              value={formState.email}
              onChange={(event) => setFormState((prev) => ({ ...prev, email: event.target.value }))}
            />
          </label>

          {activeTab !== TABS.magic && (
            <label className="auth-label" htmlFor="password">
              Password
              <input
                id="password"
                type="password"
                required
                minLength={6}
                value={formState.password}
                onChange={(event) => setFormState((prev) => ({ ...prev, password: event.target.value }))}
              />
            </label>
          )}

          <button className="btn btn-primary" disabled={pending} type="submit">
            {pending ? "Please wait…" : tabCopy.cta}
          </button>
        </form>

        {(message || error) && <p className="auth-message">{message || error?.message}</p>}

        <p className="auth-footer-note">
          Secure logins are powered by Supabase Auth. Upgrade paths include 2FA, passkeys/WebAuthn and session logs.
        </p>
      </div>
    </div>
  );
}
