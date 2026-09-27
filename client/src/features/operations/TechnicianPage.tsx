import { useState } from "react";
import { Link } from "react-router-dom";
import { useApiList } from "../../lib/useApiList";
import { api } from "../../lib/api";
import { Notice } from "../../components/Notice";
import { formatType } from "../devices/deviceOptions";
import {
  ActionDialog,
  DataTable,
  PageHeading,
  Pill,
  Refresh,
  RoleGate,
  textColumn,
  value,
  type RecordRow,
} from "./shared";
const statuses = ["active", "inactive", "offline", "maintenance"];
export function TechnicianPage() {
  return (
    <RoleGate>
      <Technician />
    </RoleGate>
  );
}
function Technician() {
  const data = useApiList<RecordRow>("/technician/devices");
  const [status, setStatus] = useState("all");
  const [editing, setEditing] = useState<RecordRow | null>(null);
  const [nextStatus, setNextStatus] = useState("active");
  const [notice, setNotice] = useState("");
  const rows = data.items.filter(
    (row) => status === "all" || row.status === status,
  );
  return (
    <>
      <PageHeading
        eyebrow="TECHNICIAN WORKSPACE"
        title="Keep every space connected."
        description="Monitor devices across all homes and update their operating status."
      >
        <Link className="button primary" to="/simulator">
          Open simulator
        </Link>
      </PageHeading>
      {notice && <Notice message={notice} onDismiss={() => setNotice("")} />}
      <div className="ops-stats">
        {["active", "offline", "maintenance"].map((item) => (
          <div key={item}>
            <span>{formatType(item)} devices</span>
            <strong>
              {data.loading || data.error
                ? "—"
                : data.items.filter((row) => row.status === item).length}
            </strong>
          </div>
        ))}
      </div>
      <section className="ops-panel">
        <div className="ops-panel-heading">
          <div>
            <h2>Device fleet</h2>
            <p className="muted">
              All homes · search by model, serial number or location
            </p>
          </div>
          <Refresh
            onClick={data.reload}
            disabled={data.loading || editing !== null}
          />
        </div>
        <DataTable
          key={status}
          {...data}
          rows={rows}
          label="devices"
          rowKey={(row) => String(row.device_id)}
          searchText={(row) =>
            [
              row.brand_model,
              row.serial_no,
              row.device_type,
              row.home_name,
              row.room_name,
            ].join(" ")
          }
          filters={
            <label className="ops-select">
              Device status
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                <option value="all">All statuses</option>
                {statuses.map((item) => (
                  <option key={item} value={item}>
                    {formatType(item)}
                  </option>
                ))}
              </select>
            </label>
          }
          columns={[
            {
              label: "Device",
              render: (row) => (
                <>
                  <strong>{value(row, "brand_model")}</strong>
                  <small>
                    #{row.device_id} · {formatType(value(row, "device_type"))}
                  </small>
                </>
              ),
            },
            textColumn("Serial number", "serial_no"),
            {
              label: "Location",
              render: (row) => (
                <>
                  {value(row, "home_name")}
                  <small>{value(row, "room_name")}</small>
                </>
              ),
            },
            {
              label: "Status",
              render: (row) => (
                <Pill
                  tone={
                    row.status === "active"
                      ? "good"
                      : row.status === "offline"
                        ? "high"
                        : "neutral"
                  }
                >
                  {formatType(value(row, "status"))}
                </Pill>
              ),
            },
            {
              label: "Actions",
              render: (row) => (
                <button
                  className="button secondary small"
                  onClick={() => {
                    setEditing(row);
                    setNextStatus(String(row.status));
                  }}
                >
                  Change status
                </button>
              ),
            },
          ]}
        />
      </section>
      {editing && (
        <ActionDialog
          title="Change device status"
          description={`${value(editing, "brand_model")} · ${value(editing, "home_name")} / ${value(editing, "room_name")}. Offline and maintenance statuses can create alerts. Returning to active does not resolve existing alerts.`}
          actionLabel="Save status"
          onClose={() => setEditing(null)}
          onConfirm={async () => {
            if (nextStatus === editing.status) return;
            const { device } = await api<{ device: RecordRow }>(
              `/technician/devices/${editing.device_id}`,
              { method: "PUT", body: JSON.stringify({ status: nextStatus }) },
            );
            data.setItems((current) =>
              current.map((row) =>
                row.device_id === editing.device_id
                  ? { ...row, ...device }
                  : row,
              ),
            );
            setNotice("Device status updated.");
          }}
        >
          <label className="ops-select">
            New status
            <select
              value={nextStatus}
              onChange={(event) => setNextStatus(event.target.value)}
            >
              {statuses.map((item) => (
                <option key={item} value={item}>
                  {formatType(item)}
                </option>
              ))}
            </select>
          </label>
        </ActionDialog>
      )}
    </>
  );
}
