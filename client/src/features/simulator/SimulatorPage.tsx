import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FlaskConical, RefreshCw, Search, Sparkles } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import {
  canSimulateReadings,
  formatValue,
  PAGE_SIZE,
  rangeText,
} from "../readings/readingUtils";
import { api, errorMessage } from "../../lib/api";
import { useApiList } from "../../lib/useApiList";
import type { Reading, SimulatorSensor } from "../../lib/types";
import { formatType } from "../devices/deviceOptions";
import { ErrorNotice, Loading } from "../../components/Feedback";
import { Notice } from "../../components/Notice";
import { Pagination } from "../../components/Pagination";
import { BulkDialog } from "./BulkDialog";

export function SimulatorPage() {
  const { user } = useAuth();
  if (!canSimulateReadings(user))
    return (
      <div className="empty-state">
        <h1>Access restricted</h1>
        <p className="muted">
          The simulator is available to administrators and technicians.
        </p>
        <Link className="button primary" to="/homes">
          Back to my homes
        </Link>
      </div>
    );
  return <Simulator />;
}

function Simulator() {
  const {
    items: sensors,
    loading,
    error,
    reload,
  } = useApiList<SimulatorSensor>("/technician/sensors");
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [requestedPage, setPage] = useState(1);
  const [generating, setGenerating] = useState<number | null>(null);
  const pending = useRef(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const types = useMemo(
    () => [...new Set(sensors.map((sensor) => sensor.sensor_type))].sort(),
    [sensors],
  );
  const filtered = sensors.filter(
    (sensor) =>
      (type === "all" || sensor.sensor_type === type) &&
      `${formatType(sensor.sensor_type)} ${sensor.home_name} ${sensor.room_name} ${sensor.serial_no}`
        .toLocaleLowerCase()
        .includes(search.toLocaleLowerCase()),
  );
  const page = Math.max(
    1,
    Math.min(requestedPage, Math.ceil(filtered.length / PAGE_SIZE) || 1),
  );
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  async function generate(sensor: SimulatorSensor) {
    if (pending.current) return;
    pending.current = true;
    setGenerating(sensor.sensor_id);
    setActionError("");
    try {
      const { reading } = await api<{ reading: Reading }>(
        "/readings/simulate",
        {
          method: "POST",
          body: JSON.stringify({ sensor_id: sensor.sensor_id }),
        },
      );
      setNotice(
        `${sensor.home_name} · ${sensor.room_name} · ${formatType(sensor.sensor_type)}: generated ${formatValue(reading.reading_value)} ${sensor.unit}.`,
      );
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      pending.current = false;
      setGenerating(null);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">TOOLS FOR YOUR CONNECTED WORLD</span>
          <h1>Reading simulator</h1>
          <p className="muted">
            Generate measurements and explore how your system responds.
          </p>
        </div>
        <button
          className="button secondary"
          disabled={loading || generating !== null || bulkOpen}
          onClick={reload}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>
      <section className="simulator-banner">
        <span className="simulator-icon">
          <FlaskConical size={30} />
        </span>
        <div>
          <h2>A test run for your smart homes.</h2>
          <p>Operator workspace · Sensors from all homes in the system.</p>
          <p>
            Generate one reading for a selected sensor, or add a system-wide
            dataset.
          </p>
        </div>
        <button
          className="button primary"
          disabled={
            loading || !!error || !sensors.length || generating !== null
          }
          onClick={() => setBulkOpen(true)}
        >
          <Sparkles size={17} />
          Generate dataset
        </button>
      </section>
      <Notice message={notice} onDismiss={() => setNotice("")} />
      {actionError && <ErrorNotice message={actionError} />}
      <section className="detail-panel">
        <div className="section-title">
          <div>
            <h2>
              Choose a sensor{" "}
              <span className="count-pill">
                {loading ? "…" : error ? "—" : sensors.length}
              </span>
            </h2>
            <p className="muted">
              Each action adds a saved measurement and may trigger an alert.
            </p>
          </div>
        </div>
        <div className="collection-toolbar">
          <label className="search-field">
            <Search size={18} />
            <input
              type="search"
              aria-label="Search simulator sensors"
              placeholder="Home, room, sensor, or serial…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <label className="sort-field">
            <select
              aria-label="Filter sensor type"
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All sensor types</option>
              {types.map((value) => (
                <option key={value} value={value}>
                  {formatType(value)}
                </option>
              ))}
            </select>
          </label>
        </div>
        {loading ? (
          <Loading label="Loading simulator sensors…" />
        ) : error ? (
          <ErrorNotice message={error} retry={reload} />
        ) : !sensors.length ? (
          <div className="empty-state">
            <FlaskConical size={30} />
            <h3>No sensors to simulate</h3>
            <p className="muted">Add a device with sensors to get started.</p>
          </div>
        ) : !filtered.length ? (
          <div className="empty-state">
            <Search size={30} />
            <h3>No sensors match</h3>
            <button
              className="button secondary"
              onClick={() => {
                setSearch("");
                setType("all");
                setPage(1);
              }}
            >
              Clear filters
            </button>
          </div>
        ) : (
          <>
            <div
              className="data-table-wrap"
              tabIndex={0}
              role="region"
              aria-label="Simulator sensor table"
            >
              <table className="data-table simulator-table">
                <caption className="sr-only">Sensors across all homes</caption>
                <thead>
                  <tr>
                    <th scope="col">Sensor</th>
                    <th scope="col">Location</th>
                    <th scope="col">Normal range</th>
                    <th scope="col">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((sensor) => (
                    <tr key={sensor.sensor_id}>
                      <td>
                        <strong>{formatType(sensor.sensor_type)}</strong>
                        <small>{sensor.serial_no}</small>
                      </td>
                      <td>
                        <strong>{sensor.home_name}</strong>
                        <small>{sensor.room_name}</small>
                      </td>
                      <td>
                        {rangeText(sensor)} {sensor.unit}
                      </td>
                      <td>
                        <button
                          className="button secondary compact-button"
                          aria-label={`Generate ${formatType(sensor.sensor_type)} reading for ${sensor.serial_no} (sensor ${sensor.sensor_id})`}
                          disabled={generating !== null}
                          onClick={() => void generate(sensor)}
                        >
                          <Sparkles size={14} />
                          {generating === sensor.sensor_id
                            ? "Generating…"
                            : "Generate"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={filtered.length}
              onChange={setPage}
            />
          </>
        )}
      </section>
      {bulkOpen && (
        <BulkDialog
          sensorCount={sensors.length}
          onClose={() => setBulkOpen(false)}
          onComplete={(message) => {
            setNotice(message);
            setBulkOpen(false);
          }}
        />
      )}
    </>
  );
}
