import { useRef, useState } from "react";
import { useApiList } from "../../lib/useApiList";
import { api, errorMessage } from "../../lib/api";
import { Notice } from "../../components/Notice";
import { ErrorNotice } from "../../components/Feedback";
import { formatTime } from "../readings/readingUtils";
import { formatType } from "../devices/deviceOptions";
import {
  ActionDialog,
  DataTable,
  PageHeading,
  Pill,
  Refresh,
  ScopeNote,
  type RecordRow,
  value,
} from "./shared";
export function AlertsPage() {
  const data = useApiList<RecordRow>("/alerts?status=all");
  const [status, setStatus] = useState("active");
  const [severity, setSeverity] = useState("all");
  const [deleting, setDeleting] = useState<RecordRow | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const pending = useRef(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function toggle(row: RecordRow) {
    if (pending.current) return;
    pending.current = true;
    setBusy(String(row.alert_id));
    setError("");
    try {
      const { alert } = await api<{ alert: RecordRow }>(
        `/alerts/${row.alert_id}/resolve`,
        {
          method: "PATCH",
          body: JSON.stringify({ is_resolved: !row.is_resolved }),
        },
      );
      data.setItems((current) =>
        current.map((item) =>
          item.alert_id === row.alert_id ? { ...item, ...alert } : item,
        ),
      );
      setNotice(row.is_resolved ? "Alert reopened." : "Alert resolved.");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      pending.current = false;
      setBusy(null);
    }
  }
  const active = data.items.filter((row) => !row.is_resolved).length;
  const rows = data.items.filter(
    (row) =>
      (status === "all" ||
        Boolean(row.is_resolved) === (status === "resolved")) &&
      (severity === "all" || row.severity === severity),
  );
  return (
    <>
      <PageHeading
        eyebrow="ALERT CENTER"
        title="A little attention. A safer home."
        description="Review alerts, resolve issues and keep track of what still needs you."
      >
        <Refresh
          onClick={data.reload}
          disabled={data.loading || busy !== null || deleting !== null}
        />
      </PageHeading>
      <ScopeNote />
      {notice && <Notice message={notice} onDismiss={() => setNotice("")} />}
      {error && <ErrorNotice message={error} />}
      <div className="ops-stats">
        <div>
          <span>Active alerts</span>
          <strong>{data.loading || data.error ? "—" : active}</strong>
        </div>
        <div>
          <span>High priority · active</span>
          <strong>
            {data.loading || data.error
              ? "—"
              : data.items.filter(
                  (row) => !row.is_resolved && row.severity === "high",
                ).length}
          </strong>
        </div>
        <div>
          <span>Resolved</span>
          <strong>
            {data.loading || data.error ? "—" : data.items.length - active}
          </strong>
        </div>
      </div>
      <section className="ops-panel">
        <div className="ops-tabs" aria-label="Alert status">
          {["active", "resolved", "all"].map((item) => (
            <button
              key={item}
              aria-pressed={status === item}
              onClick={() => setStatus(item)}
            >
              {formatType(item)}
            </button>
          ))}
        </div>
        <DataTable
          key={`${status}:${severity}`}
          {...data}
          rows={rows}
          label="alerts"
          rowKey={(row) => String(row.alert_id)}
          searchText={(row) =>
            [
              row.alert_type,
              row.home_name,
              row.room_name,
              row.sensor_type,
              row.device_type,
            ].join(" ")
          }
          filters={
            <label className="ops-select">
              Severity
              <select
                value={severity}
                onChange={(event) => setSeverity(event.target.value)}
              >
                <option value="all">All severities</option>
                {[
                  ...new Set(
                    data.items.map((row) => String(row.severity || "")),
                  ),
                ]
                  .filter(Boolean)
                  .sort()
                  .map((item) => (
                    <option key={item} value={item}>
                      {formatType(item)}
                    </option>
                  ))}
              </select>
            </label>
          }
          columns={[
            {
              label: "Alert",
              render: (row) => (
                <>
                  <strong>
                    {formatType(String(row.alert_type || "Alert"))}
                  </strong>
                  <small>
                    #{String(row.alert_id)} ·{" "}
                    {formatTime(String(row.created_at || ""))}
                  </small>
                </>
              ),
            },
            {
              label: "Location",
              render: (row) => (
                <>
                  {value(row, "home_name")}
                  <small>
                    {value(row, "room_name")} ·{" "}
                    {formatType(
                      String(row.sensor_type || row.device_type || ""),
                    )}
                  </small>
                </>
              ),
            },
            {
              label: "Severity",
              render: (row) => (
                <Pill tone={String(row.severity)}>
                  {formatType(String(row.severity || "Unknown"))}
                </Pill>
              ),
            },
            {
              label: "Status",
              render: (row) => (
                <Pill tone={row.is_resolved ? "good" : "medium"}>
                  {row.is_resolved ? "Resolved" : "Active"}
                </Pill>
              ),
            },
            {
              label: "Actions",
              render: (row) => (
                <div className="ops-actions">
                  <button
                    className="button secondary small"
                    disabled={busy !== null || data.loading}
                    onClick={() => void toggle(row)}
                  >
                    {busy === String(row.alert_id)
                      ? "Saving…"
                      : row.is_resolved
                        ? "Reopen"
                        : "Resolve"}
                  </button>
                  <button
                    className="button secondary small"
                    disabled={busy !== null}
                    onClick={() => setDeleting(row)}
                  >
                    Delete
                  </button>
                </div>
              ),
            },
          ]}
        />
      </section>
      {deleting && (
        <ActionDialog
          title="Delete this alert?"
          description={`Permanently delete alert #${deleting.alert_id}? Resolving it instead keeps its history. Deleting an alert does not fix the underlying device or sensor issue.`}
          actionLabel="Delete alert"
          danger
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            await api(`/alerts/${deleting.alert_id}`, { method: "DELETE" });
            data.setItems((current) =>
              current.filter((row) => row.alert_id !== deleting.alert_id),
            );
            setNotice("Alert deleted.");
          }}
        />
      )}
    </>
  );
}
