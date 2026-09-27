import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useApiList } from "../../lib/useApiList";
import { ErrorNotice, Loading } from "../../components/Feedback";
import { formatTime, formatValue, numeric } from "../readings/readingUtils";
import { formatType } from "../devices/deviceOptions";
import {
  DataTable,
  PageHeading,
  Refresh,
  ScopeNote,
  textColumn,
  value,
  type Column,
  type RecordRow,
} from "./shared";
type Report = {
  path: string;
  title: string;
  description: string;
  columns: Column<RecordRow>[];
  bar?: { label: string; count: string };
};
const sensor: Column<RecordRow> = {
  label: "Sensor",
  render: (row) => (
    <>
      <strong>{formatType(value(row, "sensor_type"))}</strong>
      <small>
        #{row.sensor_id} · {formatType(value(row, "device_type"))}
      </small>
    </>
  ),
};
const location: Column<RecordRow> = {
  label: "Location",
  render: (row) => (
    <>
      {value(row, "home_name")}
      <small>{value(row, "room_name")}</small>
    </>
  ),
};
const numberColumn = (label: string, key: string): Column<RecordRow> => ({
  label,
  render: (row) => formatValue(numeric(row[key] as string | number | null)),
});
const reports: Report[] = [
  {
    path: "devices-per-home",
    title: "Devices per home",
    description: "Connected inventory across the selected homes.",
    columns: [
      textColumn("Home", "home_name"),
      numberColumn("Devices", "device_count"),
    ],
    bar: { label: "home_name", count: "device_count" },
  },
  {
    path: "rooms-per-home",
    title: "Rooms per home",
    description: "The spaces that make up each home.",
    columns: [
      textColumn("Home", "home_name"),
      numberColumn("Rooms", "room_count"),
    ],
    bar: { label: "home_name", count: "room_count" },
  },
  {
    path: "alert-summary",
    title: "Alerts by type",
    description: "Created in the last 30 days · active and resolved alerts.",
    columns: [
      { label: "Type", render: (row) => formatType(value(row, "alert_type")) },
      numberColumn("Alerts", "alert_count"),
    ],
    bar: { label: "alert_type", count: "alert_count" },
  },
  {
    path: "average-reading-by-sensor-type",
    title: "Average readings",
    description:
      "All recorded readings, grouped by sensor type. Units are not supplied by this report.",
    columns: [
      {
        label: "Sensor type",
        render: (row) => formatType(value(row, "sensor_type")),
      },
      numberColumn("Average", "average_reading_value"),
      numberColumn("Readings", "reading_count"),
    ],
  },
  {
    path: "latest-readings",
    title: "Latest readings",
    description:
      "Most recent recorded values per sensor. Units are not supplied by this report.",
    columns: [
      sensor,
      location,
      numberColumn("Value", "reading_value"),
      {
        label: "Recorded",
        render: (row) => formatTime(String(row.reading_time || "")),
      },
    ],
  },
  {
    path: "abnormal-readings",
    title: "Out-of-range readings",
    description:
      "All recorded readings compared with each sensor’s current normal range.",
    columns: [
      sensor,
      location,
      numberColumn("Count", "abnormal_count"),
      {
        label: "Normal range",
        render: (row) =>
          `${formatValue(numeric(row.normal_min as string | number | null))} – ${formatValue(numeric(row.normal_max as string | number | null))}`,
      },
      {
        label: "Observed range",
        render: (row) =>
          `${formatValue(numeric(row.min_abnormal_value as string | number | null))} – ${formatValue(numeric(row.max_abnormal_value as string | number | null))}`,
      },
      {
        label: "Last occurrence",
        render: (row) => formatTime(String(row.last_abnormal_time || "")),
      },
    ],
  },
];
export function AnalyticsPage() {
  const homes = useApiList<RecordRow>("/analytics/homes");
  const [params, setParams] = useSearchParams();
  const homeId = params.get("homeId") || "all";
  const [revision, setRevision] = useState(0);
  const valid =
    homeId === "all" ||
    homes.items.some((home) => String(home.home_id) === homeId);
  return (
    <>
      <PageHeading
        eyebrow="ANALYTICS"
        title="See the bigger picture."
        description="Understand your spaces through their devices, readings and alerts."
      >
        <Refresh
          onClick={() => {
            homes.reload();
            setRevision((current) => current + 1);
          }}
          disabled={homes.loading}
        />
      </PageHeading>
      <ScopeNote />
      {homes.loading ? (
        <Loading label="Loading available homes…" />
      ) : homes.error ? (
        <ErrorNotice message={homes.error} retry={homes.reload} />
      ) : (
        <>
          <div className="ops-analytics-filter">
            <label className="ops-select">
              Report scope
              <select
                value={valid ? homeId : "invalid"}
                onChange={(event) =>
                  setParams(
                    event.target.value === "all"
                      ? {}
                      : { homeId: event.target.value },
                  )
                }
              >
                <option value="all">All accessible homes</option>
                {!valid && (
                  <option value="invalid" disabled>
                    Unavailable home
                  </option>
                )}
                {homes.items.map((home) => (
                  <option
                    key={String(home.home_id)}
                    value={String(home.home_id)}
                  >
                    {value(home, "home_name")} · #{home.home_id}
                  </option>
                ))}
              </select>
            </label>
            <span className="muted">
              {homeId === "all"
                ? `${homes.items.length} accessible homes`
                : "One home selected"}
            </span>
          </div>
          {!valid ? (
            <ErrorNotice message="This home is not available. Choose another report scope." />
          ) : (
            <div className="ops-reports" key={`${homeId}:${revision}`}>
              {reports.map((report) => (
                <ReportPanel
                  key={report.path}
                  report={report}
                  homeId={homeId}
                />
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
function ReportPanel({ report, homeId }: { report: Report; homeId: string }) {
  const data = useApiList<RecordRow>(
    `/analytics/${report.path}${homeId === "all" ? "" : `?homeId=${encodeURIComponent(homeId)}`}`,
  );
  const max = report.bar
    ? Math.max(
        1,
        ...data.items.map((row) => Number(row[report.bar!.count]) || 0),
      )
    : 1;
  return (
    <section
      className={`ops-panel ${report.path.includes("readings") && !report.path.includes("average") ? "ops-report-wide" : ""}`}
      aria-label={report.title}
    >
      <div className="ops-panel-heading">
        <div>
          <h2>{report.title}</h2>
          <p className="muted">{report.description}</p>
        </div>
        <Refresh onClick={data.reload} disabled={data.loading} />
      </div>
      {report.bar && !data.loading && !data.error && data.items.length > 0 && (
        <div className="ops-bars" aria-hidden="true">
          {data.items.slice(0, 6).map((row, index) => (
            <div key={index}>
              <span>{formatType(value(row, report.bar!.label))}</span>
              <div>
                <i
                  style={{
                    width: `${(Math.max(0, Number(row[report.bar!.count]) || 0) / max) * 100}%`,
                  }}
                />
              </div>
              <strong>{value(row, report.bar!.count)}</strong>
            </div>
          ))}
        </div>
      )}
      <DataTable
        {...data}
        rows={data.items}
        columns={report.columns}
        label={report.title.toLowerCase()}
        rowKey={(_, index) => index}
      />
    </section>
  );
}
