import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  DoorOpen,
  MapPin,
  Pencil,
  Plus,
  Search,
} from "lucide-react";
import { useHomeSpace } from "./HomeLayout";
import { ErrorNotice, Loading } from "../../components/Feedback";
import { HomeDialog } from "./HomeDialog";
import { RoomDialog } from "../rooms/RoomDialog";
import { Breadcrumbs } from "../../components/Breadcrumbs";
import { Notice } from "../../components/Notice";
import { floorLabel } from "../devices/deviceOptions";
import type { Room } from "../../lib/types";

export function HomeDetail() {
  const { home, rooms, loading, error, reload } = useHomeSpace();
  const [editingHome, setEditingHome] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | "new" | null>(null);
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const filtered = rooms.filter((room) =>
    `${room.room_name} ${floorLabel(room.floor_no)}`
      .toLocaleLowerCase()
      .includes(search.toLocaleLowerCase()),
  );
  return (
    <>
      <Breadcrumbs items={[{ label: home.home_name }]} />
      <div className="page-heading">
        <div>
          <span className="eyebrow">YOUR PERSONAL SPACE</span>
          <h1>{home.home_name}</h1>
          <p className="address-line muted">
            <MapPin size={17} />
            {home.address_text}
          </p>
        </div>
        <button
          className="button secondary"
          onClick={() => setEditingHome(true)}
        >
          <Pencil size={17} />
          Edit home
        </button>
      </div>
      <Notice message={notice} onDismiss={() => setNotice("")} />
      <section className="detail-panel">
        <div className="section-title">
          <div>
            <h2>
              A room for every moment{" "}
              <span className="count-pill">
                {loading ? "…" : error ? "—" : rooms.length}
              </span>
            </h2>
            <p className="muted">
              Every space has a purpose. Find yours below.
            </p>
          </div>
          <button
            className="button primary"
            onClick={() => setEditingRoom("new")}
            disabled={loading || !!error}
          >
            <Plus size={17} />
            Add room
          </button>
        </div>
        {!loading && !error && rooms.length > 0 && (
          <label className="search-field">
            <Search size={18} />
            <input
              type="search"
              aria-label="Search rooms"
              placeholder="Search by room name or floor…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        )}
        {loading ? (
          <Loading label="Loading rooms…" />
        ) : error ? (
          <ErrorNotice message={error} retry={reload} />
        ) : rooms.length === 0 ? (
          <div className="empty-state">
            <DoorOpen size={30} />
            <h3>A fresh start.</h3>
            <p className="muted">
              Make a place for your devices by adding your first room.
            </p>
            <button
              className="button primary"
              onClick={() => setEditingRoom("new")}
            >
              <Plus size={17} />
              Add your first room
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <Search size={28} />
            <h3>No rooms found</h3>
            <p className="muted">Try another name or floor.</p>
            <button className="button secondary" onClick={() => setSearch("")}>
              Clear search
            </button>
          </div>
        ) : (
          <div className="rooms-grid">
            {filtered.map((room) => (
              <article className="room-card" key={room.room_id}>
                <div className="resource-card-top">
                  <span className="stat-icon sand">
                    <DoorOpen size={23} />
                  </span>
                  <button
                    className="icon-button"
                    aria-label={`Edit ${room.room_name}`}
                    onClick={() => setEditingRoom(room)}
                  >
                    <Pencil size={16} />
                  </button>
                </div>
                <h3>
                  <Link to={`rooms/${room.room_id}`}>{room.room_name}</Link>
                </h3>
                <p className="muted">{floorLabel(room.floor_no)}</p>
                <Link
                  className="resource-card-link"
                  to={`rooms/${room.room_id}`}
                >
                  View devices <ArrowRight size={16} />
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>
      {editingHome && (
        <HomeDialog
          home={home}
          onClose={() => setEditingHome(false)}
          onSaved={(message) => {
            setNotice(message);
            setEditingHome(false);
          }}
        />
      )}
      {editingRoom && (
        <RoomDialog
          room={editingRoom === "new" ? undefined : editingRoom}
          onClose={() => setEditingRoom(null)}
          onSaved={() => {
            setNotice(
              editingRoom === "new"
                ? "Your new room is ready."
                : "Room updated successfully.",
            );
            setEditingRoom(null);
          }}
        />
      )}
    </>
  );
}
