import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Cpu,
  DoorOpen,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useHomeSpace } from "../homes/HomeLayout";
import { useRoomSpace } from "./RoomLayout";
import { useAuth } from "../auth/AuthContext";
import { Breadcrumbs } from "../../components/Breadcrumbs";
import { Notice } from "../../components/Notice";
import { ErrorNotice, Loading } from "../../components/Feedback";
import { RoomDialog } from "./RoomDialog";
import { DeviceDialog } from "../devices/DeviceDialog";
import { DeleteDeviceDialog } from "../devices/DeleteDeviceDialog";
import {
  canEditDevice,
  deviceInfo,
  deviceStatuses,
  floorLabel,
} from "../devices/deviceOptions";
import { StatusBadge } from "../devices/StatusBadge";
import type { Device } from "../../lib/types";

export function RoomDetail() {
  const { home } = useHomeSpace();
  const { room, devices, loading, error, reload } = useRoomSpace();
  const { user } = useAuth();
  const [editingRoom, setEditingRoom] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | "new" | null>(
    null,
  );
  const [deleting, setDeleting] = useState<Device | null>(null);
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const filtered = devices.filter(
    (device) =>
      (status === "all" || device.status === status) &&
      `${deviceInfo(device.device_type).label} ${device.brand_model} ${device.serial_no}`
        .toLocaleLowerCase()
        .includes(search.toLocaleLowerCase()),
  );
  const editable = canEditDevice(user);
  return (
    <>
      <Breadcrumbs
        items={[
          { label: home.home_name, to: `/homes/${home.home_id}` },
          { label: room.room_name },
        ]}
      />
      <div className="page-heading">
        <div>
          <span className="eyebrow">A SPACE OF ITS OWN</span>
          <h1>{room.room_name}</h1>
          <p className="address-line muted">
            <DoorOpen size={17} />
            {floorLabel(room.floor_no)} · {home.home_name}
          </p>
        </div>
        <button
          className="button secondary"
          onClick={() => setEditingRoom(true)}
        >
          <Pencil size={17} />
          Edit room
        </button>
      </div>
      <Notice message={notice} onDismiss={() => setNotice("")} />
      <section className="detail-panel">
        <div className="section-title">
          <div>
            <h2>
              The little things, connected{" "}
              <span className="count-pill">
                {loading ? "…" : error ? "—" : devices.length}
              </span>
            </h2>
            <p className="muted">Devices that belong to this room.</p>
          </div>
          <button
            className="button primary"
            disabled={loading || !!error}
            onClick={() => setEditingDevice("new")}
          >
            <Plus size={17} />
            Add device
          </button>
        </div>
        {!editable && (
          <p className="permission-note">
            Your technician or administrator can change an existing device’s
            model and state.
          </p>
        )}
        {!loading && !error && devices.length > 0 && (
          <div className="collection-toolbar">
            <label className="search-field">
              <Search size={18} />
              <input
                type="search"
                aria-label="Search devices"
                placeholder="Search type, model, or serial…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <label className="sort-field">
              <select
                aria-label="Filter device state"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="all">All states</option>
                {deviceStatuses.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
        {loading ? (
          <Loading label="Loading devices…" />
        ) : error ? (
          <ErrorNotice message={error} retry={reload} />
        ) : devices.length === 0 ? (
          <div className="empty-state">
            <Cpu size={32} />
            <h3>A little more connected.</h3>
            <p className="muted">
              Add the first device to this room. We’ll take care of its default
              sensors.
            </p>
            <button
              className="button primary"
              onClick={() => setEditingDevice("new")}
            >
              <Plus size={17} />
              Add your first device
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <Search size={28} />
            <h3>No devices found</h3>
            <p className="muted">Try a different search or state.</p>
            <button
              className="button secondary"
              onClick={() => {
                setSearch("");
                setStatus("all");
              }}
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="devices-grid">
            {filtered.map((device) => {
              const { Icon, label } = deviceInfo(device.device_type);
              return (
                <article className="device-card" key={device.device_id}>
                  <div className="resource-card-top">
                    <span className="device-icon">
                      <Icon size={26} strokeWidth={1.6} />
                    </span>
                    <StatusBadge status={device.status} />
                  </div>
                  <span className="device-type-label">{label}</span>
                  <h3>
                    <Link to={`devices/${device.device_id}`}>
                      {device.brand_model}
                    </Link>
                  </h3>
                  <p className="device-serial">{device.serial_no}</p>
                  <div className="device-card-footer">
                    <Link
                      className="resource-card-link"
                      to={`devices/${device.device_id}`}
                    >
                      View device <ArrowRight size={16} />
                    </Link>
                    <div className="resource-actions">
                      {editable && (
                        <button
                          className="icon-button"
                          aria-label={`Edit ${device.brand_model}`}
                          onClick={() => setEditingDevice(device)}
                        >
                          <Pencil size={16} />
                        </button>
                      )}
                      <button
                        className="icon-button"
                        aria-label={`Delete ${device.brand_model}`}
                        onClick={() => setDeleting(device)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
      {editingRoom && (
        <RoomDialog
          room={room}
          onClose={() => setEditingRoom(false)}
          onSaved={() => {
            setNotice("Room updated successfully.");
            setEditingRoom(false);
          }}
        />
      )}
      {editingDevice && (
        <DeviceDialog
          device={editingDevice === "new" ? undefined : editingDevice}
          onClose={() => setEditingDevice(null)}
          onSaved={(message) => {
            setNotice(message);
            setEditingDevice(null);
          }}
        />
      )}
      {deleting && (
        <DeleteDeviceDialog
          device={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={() => {
            setNotice("Device deleted.");
            setDeleting(null);
          }}
        />
      )}
    </>
  );
}
