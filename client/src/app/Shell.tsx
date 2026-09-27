import { useState, type ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import {
  ArrowUpRight,
  House,
  LayoutDashboard,
  Leaf,
  LogOut,
  Menu,
  X,
  FlaskConical,
  Activity,
  Bell,
  ChartNoAxesCombined,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { Brand } from "../components/Brand";
import { useAuth } from "../features/auth/AuthContext";
import { errorMessage } from "../lib/api";
import { ErrorNotice } from "../components/Feedback";
import { canSimulateReadings } from "../features/readings/readingUtils";

export function Shell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function signOut() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await logout();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  const initials = user!.full_name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      {menuOpen && (
        <button
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <aside
        className={`sidebar ${menuOpen ? "is-open" : ""}`}
        aria-label="Main navigation"
      >
        <div className="sidebar-brand">
          <Link to="/" aria-label="Smart Home overview">
            <Brand />
          </Link>
          <button
            className="icon-button mobile-only"
            aria-label="Close navigation"
            onClick={() => setMenuOpen(false)}
          >
            <X size={20} />
          </button>
        </div>
        <div className="workspace-label">
          <span className="workspace-icon">
            <House size={18} />
          </span>
          <div>
            Personal workspace<small>Your connected spaces</small>
          </div>
        </div>
        <p className="nav-label">WORKSPACE</p>
        <nav onClick={() => setMenuOpen(false)}>
          <NavLink to="/" end>
            <LayoutDashboard size={19} /> Overview
          </NavLink>
          <NavLink to="/homes">
            <House size={19} /> My homes
          </NavLink>
          <NavLink to="/activity">
            <Activity size={19} /> Activity
          </NavLink>
          <NavLink to="/alert-center">
            <Bell size={19} /> Alerts
          </NavLink>
          <NavLink to="/analytics">
            <ChartNoAxesCombined size={19} /> Analytics
          </NavLink>
          {user?.role_name === "admin" && (
            <NavLink to="/admin">
              <ShieldCheck size={19} /> Administration
            </NavLink>
          )}
          {canSimulateReadings(user) && (
            <NavLink to="/technician">
              <Wrench size={19} /> Technician
            </NavLink>
          )}
          {canSimulateReadings(user) && (
            <NavLink to="/simulator">
              <FlaskConical size={19} />
              Simulator
            </NavLink>
          )}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <Leaf size={23} />
            <h3>Room for more.</h3>
            <p>Every connected space starts with a home.</p>
            <Link to="/homes" onClick={() => setMenuOpen(false)}>
              Explore your homes <ArrowUpRight size={15} />
            </Link>
          </div>
          <button
            className="logout-button"
            disabled={busy}
            onClick={() => void signOut()}
          >
            <LogOut size={18} />
            {busy ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="topbar-location">
            <button
              className="icon-button mobile-only"
              aria-label="Open navigation"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
            >
              <Menu size={22} />
            </button>
            <span className="muted">Workspace</span>
            <span className="breadcrumb-divider">/</span>
            <strong>
              {location.pathname === "/"
                ? "Overview"
                : location.pathname === "/simulator"
                  ? "Simulator"
                  : (
                      {
                        "/activity": "Activity",
                        "/alert-center": "Alerts",
                        "/analytics": "Analytics",
                        "/admin": "Administration",
                        "/technician": "Technician",
                      } as Record<string, string>
                    )[location.pathname] || "My homes"}
            </strong>
          </div>
          <div className="profile">
            <div className="profile-copy">
              <strong>{user!.full_name}</strong>
              <span>{user!.role_name || "user"}</span>
            </div>
            <span className="avatar">{initials || "H"}</span>
          </div>
        </header>
        <main id="main-content" className="main-content">
          {error && <ErrorNotice message={error} />}
          {children}
        </main>
        <footer className="app-footer">
          <span>Smart Home</span>
          <span>A place for everything that makes a home.</span>
        </footer>
      </div>
    </div>
  );
}
