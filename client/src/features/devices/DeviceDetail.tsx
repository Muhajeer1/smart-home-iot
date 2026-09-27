import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Cpu,
  Pencil,
  Plus,
  Radio,
  Search,
  Trash2,
} from "lucide-react";
import { useHomeSpace } from "../homes/HomeLayout";
import { useRoomSpace } from "../rooms/RoomLayout";
import { useAuth } from "../auth/AuthContext";
import { api, errorMessage } from "../../lib/api";
import { useDeviceSpace } from "./DeviceLayout";
import { Breadcrumbs } from "../../components/Breadcrumbs";
import { Notice } from "../../components/Notice";
import { ErrorNotice, Loading } from "../../components/Feedback";
import { DeviceDialog } from "./DeviceDialog";
import { DeleteDeviceDialog } from "./DeleteDeviceDialog";
import { canEditDevice, deviceInfo, formatType } from "./deviceOptions";
import { StatusBadge } from "./StatusBadge";

export function DeviceDetail() {
  const { home } = useHomeSpace();
  const { room } = useRoomSpace();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { device, sensors, loading, error, reload } = useDeviceSpace();
  const [search, setSearch] = useState("");
  const filteredSensors = sensors.filter((sensor) =>
    formatType(sensor.sensor_type)
      .toLocaleLowerCase()
      .includes(search.toLocaleLowerCase()),
  );
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const pending = useRef(false);
  const { Icon, label } = deviceInfo(device.device_type);
  const homePath = `/homes/${home.home_id}`;
  const roomPath = `${homePath}/rooms/${room.room_id}`;
  const installed = device.installed_at ? new Date(device.installed_at) : null;
  async function addDefaults() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setActionError("");
    try {
      const result = await api<{ message: string }>(
        `/devices/${device.device_id}/default-sensors`,
        { method: "POST" },
      );
      setNotice(result.message);
      reload();
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      <Breadcrumbs
        items={[
          { label: home.home_name, to: homePath },
          { label: room.room_name, to: roomPath },
          { label: device.brand_model },
        ]}
      />
      <div className="page-heading">
        <div>
          <span className="eyebrow">{label.toUpperCase()}</span>
          <h1>{device.brand_model}</h1>
          <p className="muted">
            Part of your {room.room_name.toLocaleLowerCase()}.
          </p>
        </div>
        <div className="heading-actions">
          {canEditDevice(user) && (
            <button className="button primary" onClick={() => setEditing(true)}>
              <Pencil size={17} />
              Edit device
            </button>
          )}
          <button
            className="button secondary"
            onClick={() => setDeleting(true)}
          >
            <Trash2 size={17} />
            Delete device
          </button>
        </div>
      </div>
      <Notice message={notice} onDismiss={() => setNotice("")} />
      <section className="device-overview" aria-label="Device information">
        <span className="device-overview-icon">
          <Icon size={42} strokeWidth={1.4} />
        </span>
        <dl>
          <div>
            <dt>Device type</dt>
            <dd>{label}</dd>
          </div>
          <div>
            <dt>Serial number</dt>
            <dd>{device.serial_no}</dd>
          </div>
          <div>
            <dt>Installed</dt>
            <dd>
              {installed && !Number.isNaN(installed.getTime())
                ? installed.toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })
                : "Not recorded"}
            </dd>
          </div>
          <div>
            <dt>Device state</dt>
            <dd>
              <StatusBadge status={device.status} />
            </dd>
          </div>
        </dl>
      </section>
      <section className="detail-panel">
        <div className="section-title">
          <div>
            <h2>
              A closer look{" "}
              <span className="count-pill">
                {loading ? "…" : error ? "—" : sensors.length}
              </span>
            </h2>
            <p className="muted">Sensors and their configured normal ranges.</p>
          </div>
          <button
            className="button secondary"
            disabled={loading || busy || !!error}
            onClick={() => void addDefaults()}
          >
            <Plus size={16} />
            {busy ? "Adding…" : "Add default sensors"}
          </button>
        </div>
        <p className="permission-note">
          Add any missing sensors for this device type. Existing sensors stay in
          place.
        </p>
        {!loading && !error && sensors.length > 0 && (
          <label className="search-field sensor-search">
            <Search size={18} />
            <input
              type="search"
              aria-label="Search sensors"
              placeholder="Search sensors…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
        )}
        {actionError && <ErrorNotice message={actionError} />}
        {loading ? (
          <Loading label="Loading sensors…" />
        ) : error ? (
          <ErrorNotice message={error} retry={reload} />
        ) : sensors.length === 0 ? (
          <div className="empty-state">
            <Radio size={30} />
            <h3>No sensors yet</h3>
            <p className="muted">
              Add the default sensors to give this device its senses.
            </p>
          </div>
        ) : filteredSensors.length === 0 ? (
          <div className="empty-state">
            <Search size={28} />
            <h3>No sensors found</h3>
            <button className="button secondary" onClick={() => setSearch("")}>
              Clear search
            </button>
          </div>
        ) : (
          <div className="sensor-grid">
            {filteredSensors.map((sensor) => (
              <article className="sensor-card" key={sensor.sensor_id}>
                <div className="resource-card-top">
                  <span className="stat-icon lavender">
                    <Cpu size={21} />
                  </span>
                  <span
                    className={`sensor-state ${sensor.is_active ? "" : "sensor-paused"}`}
                  >
                    {sensor.is_active ? "Enabled" : "Disabled"}
                  </span>
                </div>
                <h3>
                  <Link to={`sensors/${sensor.sensor_id}`}>
                    {formatType(sensor.sensor_type)}
                  </Link>
                </h3>
                <p className="sensor-range">
                  {sensor.normal_min === null && sensor.normal_max === null
                    ? "Not configured"
                    : `${sensor.normal_min ?? "—"} – ${sensor.normal_max ?? "—"}`}
                  <span>{sensor.unit}</span>
                </p>
                <p className="muted">Normal range</p>
                <Link
                  className="resource-card-link sensor-history-link"
                  to={`sensors/${sensor.sensor_id}`}
                >
                  View readings <ArrowRight size={16} />
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>
      {editing && (
        <DeviceDialog
          device={device}
          onClose={() => setEditing(false)}
          onSaved={(message) => {
            setNotice(message);
            setEditing(false);
          }}
        />
      )}
      {deleting && (
        <DeleteDeviceDialog
          device={device}
          onClose={() => setDeleting(false)}
          onDeleted={() => navigate(roomPath, { replace: true })}
        />
      )}
    </>
  );
}
