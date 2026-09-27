import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  Activity,
  Download,
  RefreshCw,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { useHomeSpace } from "../homes/HomeLayout";
import { useRoomSpace } from "../rooms/RoomLayout";
import { useDeviceSpace } from "../devices/DeviceLayout";
import { useAuth } from "../auth/AuthContext";
import { formatType } from "../devices/deviceOptions";
import { Breadcrumbs } from "../../components/Breadcrumbs";
import { Notice } from "../../components/Notice";
import { Pagination } from "../../components/Pagination";
import { ErrorNotice, Loading } from "../../components/Feedback";
import { api, errorMessage } from "../../lib/api";
import { useApiList } from "../../lib/useApiList";
import type { Reading, Sensor } from "../../lib/types";
import {
  byNewest,
  canSimulateReadings,
  dateBoundary,
  downloadReadings,
  formatTime,
  formatValue,
  numeric,
  PAGE_SIZE,
  rangeLabels,
  rangeState,
  rangeText,
} from "./readingUtils";
import { ReadingChart } from "./ReadingChart";

export function ReadingsPage() {
  const { sensorId } = useParams();
  const { home } = useHomeSpace();
  const { room } = useRoomSpace();
  const { device, sensors, loading, error, reload } = useDeviceSpace();
  if (loading) return <Loading label="Loading sensor…" />;
  if (error) return <ErrorNotice message={error} retry={reload} />;
  const sensor = sensors.find(
    (item) =>
      String(item.sensor_id) === sensorId &&
      item.device_id === device.device_id,
  );
  if (!sensor)
    return (
      <div className="empty-state">
        <h1>Sensor not found</h1>
        <p className="muted">
          This sensor is unavailable on the selected device.
        </p>
        <Link
          className="button primary"
          to={`/homes/${home.home_id}/rooms/${room.room_id}/devices/${device.device_id}`}
        >
          Back to device
        </Link>
      </div>
    );
  return <SensorHistory key={sensor.sensor_id} sensor={sensor} />;
}

function SensorHistory({ sensor }: { sensor: Sensor }) {
  const { home } = useHomeSpace();
  const { room } = useRoomSpace();
  const { device } = useDeviceSpace();
  const { user } = useAuth();
  const {
    items: readings,
    setItems: setReadings,
    loading,
    error,
    reload,
  } = useApiList<Reading>(`/readings/${sensor.sensor_id}`);
  const [params, setParams] = useSearchParams();
  // Router navigation may commit in a transition. Consecutive controls must
  // build on the latest requested query, not on the previous rendered query.
  const pendingParams = useRef(params);
  useLayoutEffect(() => {
    pendingParams.current = params;
  }, [params]);
  function updateParams(next: URLSearchParams) {
    pendingParams.current = next;
    setParams(next, { replace: true });
  }
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [exportError, setExportError] = useState("");
  const quality = ["good", "warning", "error", "unknown"].includes(
    params.get("quality") || "",
  )
    ? params.get("quality")!
    : "all";
  const range = ["within", "outside", "unconfigured", "unknown"].includes(
    params.get("range") || "",
  )
    ? params.get("range")!
    : "all";
  const order = params.get("order") === "oldest" ? "oldest" : "newest";
  const from =
    dateBoundary(params.get("from") || "") === null ? "" : params.get("from")!;
  const to =
    dateBoundary(params.get("to") || "") === null ? "" : params.get("to")!;
  const invalidDates = !!from && !!to && from > to;
  function filter(key: string, value: string) {
    const next = new URLSearchParams(pendingParams.current);
    if (!value || value === "all" || (key === "order" && value === "newest"))
      next.delete(key);
    else next.set(key, value);
    next.delete("page");
    updateParams(next);
  }
  const ordered = useMemo(() => [...readings].sort(byNewest), [readings]);
  const filtered = useMemo(() => {
    if (invalidDates) return [];
    const start = dateBoundary(from),
      end = dateBoundary(to, true);
    return ordered.filter((reading) => {
      const time = Date.parse(reading.reading_time);
      const flag = ["good", "warning", "error"].includes(
        reading.quality_flag || "",
      )
        ? reading.quality_flag
        : "unknown";
      return (
        (quality === "all" || quality === flag) &&
        (range === "all" ||
          range === rangeState(reading.reading_value, sensor)) &&
        (start === null || (Number.isFinite(time) && time >= start)) &&
        (end === null || (Number.isFinite(time) && time < end))
      );
    });
  }, [ordered, quality, range, from, to, invalidDates, sensor]);
  const stats = useMemo(() => {
    let count = 0,
      sum = 0,
      min = Infinity,
      max = -Infinity,
      outside = 0;
    for (const reading of filtered) {
      const value = numeric(reading.reading_value);
      if (value !== null) {
        count++;
        sum += value;
        min = Math.min(min, value);
        max = Math.max(max, value);
      }
      if (rangeState(reading.reading_value, sensor) === "outside") outside++;
    }
    return {
      average: count ? sum / count : null,
      min: count ? min : null,
      max: count ? max : null,
      outside,
    };
  }, [filtered, sensor]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const requestedPage = Number(params.get("page") || 1);
  const page = Number.isSafeInteger(requestedPage)
    ? Math.max(1, Math.min(pages, requestedPage))
    : 1;
  const sorted = useMemo(
    () => (order === "oldest" ? [...filtered].reverse() : filtered),
    [filtered, order],
  );
  const visible = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const latest = filtered[0];
  const homePath = `/homes/${home.home_id}`,
    roomPath = `${homePath}/rooms/${room.room_id}`,
    devicePath = `${roomPath}/devices/${device.device_id}`;
  async function simulate() {
    if (pending.current || !canSimulateReadings(user)) return;
    pending.current = true;
    setBusy(true);
    setActionError("");
    try {
      const { reading } = await api<{ reading: Reading }>(
        "/readings/simulate",
        {
          method: "POST",
          body: JSON.stringify({ sensor_id: sensor.sensor_id }),
        },
      );
      setReadings((current) => [
        reading,
        ...current.filter((item) => item.reading_id !== reading.reading_id),
      ]);
      setNotice(
        `Generated ${formatValue(reading.reading_value)} ${sensor.unit}. Active filters may hide the new reading.`,
      );
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
          { label: device.brand_model, to: devicePath },
          { label: formatType(sensor.sensor_type) },
        ]}
      />
      <div className="page-heading">
        <div>
          <span className="eyebrow">THE RHYTHM OF YOUR HOME</span>
          <h1>{formatType(sensor.sensor_type)} readings</h1>
          <p className="muted">
            {device.brand_model} · {room.room_name}
          </p>
        </div>
        <div className="heading-actions">
          <button
            className="button secondary"
            disabled={loading || busy}
            onClick={reload}
          >
            <RefreshCw size={16} />
            Refresh
          </button>
          {canSimulateReadings(user) && (
            <button
              className="button primary"
              disabled={loading || busy || !!error}
              onClick={() => void simulate()}
            >
              <Sparkles size={17} />
              {busy ? "Generating…" : "Generate reading"}
            </button>
          )}
        </div>
      </div>
      <div className="sensor-context">
        <span>
          <Activity size={16} />
          {sensor.is_active ? "Sensor enabled" : "Sensor disabled"}
        </span>
        <span>
          Normal range:{" "}
          <strong>
            {rangeText(sensor)} {sensor.unit}
          </strong>
        </span>
        <span>Times shown in your local timezone</span>
      </div>
      <Notice message={notice} onDismiss={() => setNotice("")} />
      {actionError && <ErrorNotice message={actionError} />}
      {canSimulateReadings(user) && (
        <p className="permission-note">
          Generate reading adds one simulated measurement to this sensor’s
          history.
        </p>
      )}
      {loading ? (
        <Loading label="Loading readings…" />
      ) : error ? (
        <ErrorNotice message={error} retry={reload} />
      ) : (
        <>
          <section className="reading-filters" aria-label="Reading filters">
            <div className="reading-filter">
              <label htmlFor="reading-from">From date</label>
              <input
                id="reading-from"
                type="date"
                value={from}
                onChange={(e) => filter("from", e.target.value)}
              />
            </div>
            <div className="reading-filter">
              <label htmlFor="reading-to">To date</label>
              <input
                id="reading-to"
                type="date"
                value={to}
                onChange={(e) => filter("to", e.target.value)}
              />
            </div>
            <div className="reading-filter">
              <label htmlFor="reading-quality">Quality</label>
              <select
                id="reading-quality"
                value={quality}
                onChange={(e) => filter("quality", e.target.value)}
              >
                <option value="all">All quality</option>
                <option value="good">Good</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>
            <div className="reading-filter">
              <label htmlFor="reading-range">Normal range</label>
              <select
                id="reading-range"
                value={range}
                onChange={(e) => filter("range", e.target.value)}
              >
                <option value="all">All values</option>
                {Object.entries(rangeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <button
              className="text-button reset-filters"
              onClick={() => updateParams(new URLSearchParams())}
            >
              Reset filters
            </button>
          </section>
          {invalidDates && (
            <ErrorNotice message="The start date must be on or before the end date." />
          )}
          <div className="reading-summary-heading">
            <span className="eyebrow">CURRENT FILTERS</span>
            <span>
              {filtered.length} of {readings.length} readings
            </span>
          </div>
          <section
            className="reading-stats"
            aria-label="Filtered reading summary"
          >
            <article>
              <span>Latest matching reading</span>
              <strong>
                {latest ? formatValue(latest.reading_value) : "—"}
                <small>{sensor.unit}</small>
              </strong>
              <p>
                {latest
                  ? formatTime(latest.reading_time)
                  : "No matching records"}
              </p>
            </article>
            <article>
              <span>Average</span>
              <strong>
                {formatValue(stats.average)}
                <small>{sensor.unit}</small>
              </strong>
              <p>Across matching numeric values</p>
            </article>
            <article>
              <span>Minimum / maximum</span>
              <strong>
                {formatValue(stats.min)} <small>/</small>{" "}
                {formatValue(stats.max)}
              </strong>
              <p>{sensor.unit} · matching values</p>
            </article>
            <article>
              <span>Outside normal range</span>
              <strong>{stats.outside}</strong>
              <p>Compared with configured limits</p>
            </article>
          </section>
          <section className="detail-panel trend-panel">
            <div className="section-title">
              <div>
                <h2>A little perspective</h2>
                <p className="muted">How these readings changed over time.</p>
              </div>
              <TrendingUp size={23} />
            </div>
            <ReadingChart readings={filtered} sensor={sensor} />
          </section>
          <section className="detail-panel reading-history">
            <div className="section-title">
              <div>
                <h2>
                  Reading history{" "}
                  <span className="count-pill">{filtered.length}</span>
                </h2>
                <p className="muted">
                  Quality is the recorded flag; range compares the value with
                  this sensor’s limits.
                </p>
              </div>
              <button
                className="button secondary"
                disabled={!filtered.length || invalidDates}
                onClick={() => {
                  setExportError("");
                  try {
                    downloadReadings(sorted, sensor);
                  } catch {
                    setExportError(
                      "Unable to export readings. Please try again.",
                    );
                  }
                }}
              >
                <Download size={16} />
                Export CSV
              </button>
            </div>
            {exportError && <ErrorNotice message={exportError} />}
            <div className="history-toolbar">
              <span>
                {filtered.length
                  ? `Showing ${Math.min(PAGE_SIZE, visible.length)} records on this page`
                  : "No matching records"}
              </span>
              <label className="sort-field">
                <select
                  aria-label="Sort readings"
                  value={order}
                  onChange={(e) => filter("order", e.target.value)}
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                </select>
              </label>
            </div>
            {readings.length === 0 ? (
              <div className="empty-state">
                <Activity size={30} />
                <h3>Waiting for the first reading</h3>
                <p className="muted">
                  This sensor has no recorded measurements yet.
                </p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="empty-state">
                <Activity size={30} />
                <h3>No readings match</h3>
                <p className="muted">
                  Try a wider date range or reset the filters.
                </p>
              </div>
            ) : (
              <div
                className="data-table-wrap"
                tabIndex={0}
                role="region"
                aria-label="Reading history table"
              >
                <table className="data-table">
                  <caption className="sr-only">
                    Readings for {formatType(sensor.sensor_type)}
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Recorded at</th>
                      <th scope="col">Value ({sensor.unit})</th>
                      <th scope="col">Quality</th>
                      <th scope="col">Normal range</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((reading) => {
                      const quality = ["good", "warning", "error"].includes(
                        reading.quality_flag || "",
                      )
                        ? reading.quality_flag!
                        : "unknown";
                      const state = rangeState(reading.reading_value, sensor);
                      return (
                        <tr key={reading.reading_id}>
                          <td>{formatTime(reading.reading_time)}</td>
                          <td className="reading-value">
                            {formatValue(reading.reading_value)}
                          </td>
                          <td>
                            <span
                              className={`quality-badge quality-${quality}`}
                            >
                              {formatType(quality)}
                            </span>
                          </td>
                          <td>
                            <span className={`range-label range-${state}`}>
                              {rangeLabels[state]}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={filtered.length}
              onChange={(value) => {
                const next = new URLSearchParams(pendingParams.current);
                next.set("page", String(value));
                updateParams(next);
              }}
            />
          </section>
        </>
      )}
    </>
  );
}
