import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDownAZ,
  ArrowRight,
  Building2,
  Check,
  Cpu,
  DoorOpen,
  House,
  MapPin,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { useHomes } from "./HomesContext";
import { DeleteHomeDialog, HomeDialog } from "./HomeDialog";
import { ErrorNotice, Loading } from "../../components/Feedback";
import type { Home } from "../../lib/types";

export function HomesPage({ overview = false }: { overview?: boolean }) {
  const { user } = useAuth();
  const { homes, summary, summaryError, loading, error, reload } = useHomes();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("recent");
  const [editing, setEditing] = useState<Home | "new" | null>(null);
  const [deleting, setDeleting] = useState<Home | null>(null);
  const [notice, setNotice] = useState("");
  const filtered = homes.filter((home) =>
    `${home.home_name} ${home.address_text}`
      .toLocaleLowerCase()
      .includes(search.toLocaleLowerCase()),
  );
  if (sort === "name")
    filtered.sort((a, b) => a.home_name.localeCompare(b.home_name));
  const stats = [
    {
      label: "Your homes",
      value: summary?.home_count,
      caption: "Spaces you call your own",
      Icon: House,
      tone: "green",
    },
    {
      label: "Rooms",
      value: summary?.room_count,
      caption: "A place for every moment",
      Icon: DoorOpen,
      tone: "sand",
    },
    {
      label: "Devices",
      value: summary?.device_count,
      caption: "Connected to your spaces",
      Icon: Cpu,
      tone: "lavender",
    },
  ];
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">YOUR EVERYDAY, SIMPLIFIED</span>
          <h1>
            {overview
              ? `Welcome home, ${user!.full_name.trim().split(/\s+/)[0]}.`
              : "Your homes, together."}
          </h1>
          <p className="muted">
            {overview
              ? "A little overview of the places that matter to you."
              : "One place to look after all your connected spaces."}
          </p>
        </div>
        <button className="button primary" onClick={() => setEditing("new")}>
          <Plus size={18} />
          Add home
        </button>
      </div>
      <section className="welcome-banner" aria-label="Your connected home">
        <div className="banner-copy">
          <span className="banner-tag">
            <span className="tiny-dot" /> MAKE ROOM FOR BETTER LIVING
          </span>
          <h2>
            Every home has a story.
            <br />
            Keep yours connected.
          </h2>
          <p>
            From your favorite corner to your next new space.
            <br className="desktop-break" /> It all starts with a home.
          </p>
          <button className="banner-link" onClick={() => setEditing("new")}>
            Connect a new space <ArrowRight size={17} />
          </button>
        </div>
        <div className="banner-art" aria-hidden="true">
          <div className="illustration-grid" />
          <div className="building building-back">
            <div className="building-windows">
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
            </div>
          </div>
          <div className="building building-front">
            <div className="building-roof" />
            <div className="building-window" />
            <div className="building-door" />
          </div>
          <div className="plant plant-one" />
          <div className="plant plant-two" />
          <div className="connection-badge">
            <House size={17} /> A place of your own
          </div>
        </div>
      </section>
      <section className="stats-grid" aria-label="Home overview">
        {stats.map(({ label, value, caption, Icon, tone }) => (
          <div className="stat-card" key={label}>
            <div className={`stat-icon ${tone}`}>
              <Icon size={22} strokeWidth={1.7} />
            </div>
            <div>
              <span className="stat-label">{label}</span>
              <strong className="stat-number">
                {loading ? "…" : (value ?? "—")}
              </strong>
              <span className="stat-caption">{caption}</span>
            </div>
          </div>
        ))}
      </section>
      {summaryError && (
        <ErrorNotice
          message={`Overview unavailable: ${summaryError}`}
          retry={() => void reload()}
        />
      )}
      <section className="homes-section" aria-labelledby="homes-title">
        <div className="section-title">
          <div>
            <h2 id="homes-title">
              My homes{" "}
              <span className="count-pill">{loading ? "…" : homes.length}</span>
            </h2>
            <p className="muted">A familiar place, wherever you are.</p>
          </div>
          <span className="section-decoration">
            <SlidersHorizontal size={15} /> Your personal collection
          </span>
        </div>
        <div className="collection-toolbar">
          <label className="search-field">
            <Search size={18} />
            <input
              aria-label="Search homes"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or address…"
              type="search"
            />
          </label>
          <label className="sort-field">
            <ArrowDownAZ size={18} />
            <select
              aria-label="Sort homes"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="recent">Newest first</option>
              <option value="name">Name: A–Z</option>
            </select>
          </label>
        </div>
        {notice && (
          <div className="success-notice" role="status">
            <Check size={17} />
            {notice}
            <button
              aria-label="Dismiss notification"
              className="text-button"
              onClick={() => setNotice("")}
            >
              Dismiss
            </button>
          </div>
        )}
        {loading ? (
          <Loading label="Finding your homes…" />
        ) : error ? (
          <ErrorNotice message={error} retry={() => void reload()} />
        ) : homes.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">
              <House size={32} />
            </span>
            <h3>Your next chapter starts here.</h3>
            <p className="muted">
              Add your first home and make room for a more connected everyday.
            </p>
            <button
              className="button primary"
              onClick={() => setEditing("new")}
            >
              <Plus size={18} />
              Add your first home
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <Search size={28} />
            <h3>No homes found</h3>
            <p className="muted">Try another name or address.</p>
            <button className="button secondary" onClick={() => setSearch("")}>
              Clear search
            </button>
          </div>
        ) : (
          <div className="homes-grid">
            {filtered.map((home, index) => (
              <article className="home-card" key={home.home_id}>
                <div className={`home-card-top card-tone-${index % 3}`}>
                  <div className="home-glyph">
                    <Building2 size={35} strokeWidth={1.25} />
                  </div>
                  <span className="home-category">PERSONAL HOME</span>
                  <div className="home-card-actions">
                    <button
                      className="icon-button"
                      aria-label={`Edit ${home.home_name}`}
                      onClick={() => setEditing(home)}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label={`Delete ${home.home_name}`}
                      onClick={() => setDeleting(home)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <div className="home-card-body">
                  <h3>
                    <Link to={`/homes/${home.home_id}`}>{home.home_name}</Link>
                  </h3>
                  <p className="home-address">
                    <MapPin size={15} />
                    <span>{home.address_text}</span>
                  </p>
                  <div className="home-card-footer">
                    <span>Your space</span>
                    <Link to={`/homes/${home.home_id}`}>
                      View home <ArrowRight size={16} />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
            <button className="add-home-card" onClick={() => setEditing("new")}>
              <span>
                <Plus size={24} />
              </span>
              <strong>Room for another?</strong>
              <small>Add a new home to your collection.</small>
            </button>
          </div>
        )}
      </section>
      {editing && (
        <HomeDialog
          home={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
          onSaved={(message) => {
            setNotice(message);
            setEditing(null);
          }}
        />
      )}
      {deleting && (
        <DeleteHomeDialog
          home={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={() => {
            setNotice("Home deleted.");
            setDeleting(null);
          }}
        />
      )}
    </>
  );
}
