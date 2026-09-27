import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import {
  ArrowRight,
  Eye,
  EyeOff,
  House,
  Leaf,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useAuth } from "./AuthContext";
import { api, errorMessage } from "../../lib/api";
import { Brand } from "../../components/Brand";
import { ErrorNotice } from "../../components/Feedback";

export function AuthPage({ register = false }: { register?: boolean }) {
  const { user, login } = useAuth();
  const location = useLocation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const requestedPath = location.state?.from;
  const destination =
    typeof requestedPath === "string" &&
    requestedPath.startsWith("/") &&
    !requestedPath.startsWith("//")
      ? requestedPath
      : "/";
  if (user) return <Navigate to={destination} replace />;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError("");
    setBusy(true);
    const data = new FormData(event.currentTarget);
    try {
      if (register) {
        await api("/register", {
          method: "POST",
          body: JSON.stringify({
            full_name: String(data.get("full_name")).trim(),
            email: email.trim(),
            password: data.get("password"),
          }),
        });
        setSuccess(true);
      } else {
        await login(email.trim(), String(data.get("password")));
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <section className="auth-story">
        <Brand />
        <div className="auth-story-content">
          <span className="eyebrow light">
            <span className="tiny-dot" /> YOUR SPACE, CONNECTED
          </span>
          <h1>
            A little smarter.
            <br />A lot more home.
          </h1>
          <p>
            Bring your spaces together. A thoughtful place for every home, room,
            and device.
          </p>
          <div className="home-art" aria-hidden="true">
            <div className="art-orbit orbit-one" />
            <div className="art-orbit orbit-two" />
            <div className="art-house">
              <House size={94} strokeWidth={1} />
            </div>
            <span className="art-chip chip-one">
              <Leaf size={18} /> Made for everyday
            </span>
            <span className="art-chip chip-two">
              <Sparkles size={18} /> Simply connected
            </span>
          </div>
        </div>
        <div className="auth-story-footer">
          <ShieldCheck size={16} /> Your homes. Your own space.
        </div>
      </section>
      <main className="auth-form-side">
        <div className="mobile-brand">
          <Brand />
        </div>
        <div className="auth-form-wrap">
          <span className="eyebrow">WELCOME TO SMART HOME</span>
          <h2>
            {success
              ? "You’re all set."
              : register
                ? "Make yourself at home."
                : "Good to have you back."}
          </h2>
          <p className="muted">
            {success
              ? "Your account is ready. Sign in to add your first home."
              : register
                ? "Create your account and start connecting your spaces."
                : "Sign in to pick up right where you left off."}
          </p>
          {success ? (
            <Link className="button primary full-width" to="/login">
              Continue to sign in <ArrowRight size={18} />
            </Link>
          ) : (
            <form onSubmit={submit}>
              <fieldset disabled={busy}>
                {register && (
                  <label>
                    Full name
                    <input
                      name="full_name"
                      autoComplete="name"
                      placeholder="Your full name"
                      required
                    />
                  </label>
                )}
                <label>
                  Email address
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                </label>
                <label>
                  Password
                  <div className="password-field">
                    <input
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete={
                        register ? "new-password" : "current-password"
                      }
                      placeholder="Enter your password"
                      required
                    />
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </label>
                {error && <ErrorNotice message={error} />}
                <button className="button primary full-width" type="submit">
                  {busy
                    ? "Please wait…"
                    : register
                      ? "Create account"
                      : "Sign in"}
                  <ArrowRight size={18} />
                </button>
              </fieldset>
            </form>
          )}
          {!success && (
            <p className="auth-switch">
              {register ? "Already have an account?" : "New around here?"}{" "}
              <Link
                state={location.state}
                to={register ? "/login" : "/register"}
              >
                {register ? "Sign in" : "Create an account"}
              </Link>
            </p>
          )}
        </div>
        <p className="auth-footnote">A more connected home starts here.</p>
      </main>
    </div>
  );
}
