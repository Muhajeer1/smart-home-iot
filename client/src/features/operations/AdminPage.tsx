import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useHomes } from "../homes/HomesContext";
import { useApiList } from "../../lib/useApiList";
import { api } from "../../lib/api";
import { Notice } from "../../components/Notice";
import { formatTime } from "../readings/readingUtils";
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
  type Column,
  type RecordRow,
} from "./shared";
const tabs = ["users", "homes", "devices"] as const;
type Tab = (typeof tabs)[number];
export function AdminPage() {
  return (
    <RoleGate admin>
      <Admin />
    </RoleGate>
  );
}
function Admin() {
  const [params, setParams] = useSearchParams();
  const tab: Tab = tabs.find((item) => item === params.get("tab")) || "users";
  return (
    <>
      <PageHeading
        eyebrow="ADMINISTRATION"
        title="Everything, in one place."
        description="Manage accounts, homes and devices across the system."
      />
      <div className="ops-tabs" aria-label="Administration section">
        {tabs.map((item) => (
          <button
            key={item}
            aria-pressed={tab === item}
            onClick={() => setParams({ tab: item })}
          >
            {formatType(item)}
          </button>
        ))}
      </div>
      <AdminCollection key={tab} tab={tab} />
    </>
  );
}
function AdminCollection({ tab }: { tab: Tab }) {
  const data = useApiList<RecordRow>(`/admin/${tab}`);
  const { user } = useAuth();
  const homes = useHomes();
  const [deleting, setDeleting] = useState<RecordRow | null>(null);
  const [notice, setNotice] = useState("");
  const singular = { users: "user", homes: "home", devices: "device" }[tab];
  const idKey = `${singular}_id`;
  function protection(row: RecordRow) {
    if (tab !== "users") return "";
    if (Number(row.user_id) === user?.user_id)
      return "You cannot delete your signed-in account here.";
    if (
      (row.role_name === "admin" || Number(row.role_id) === 1) &&
      data.items.filter(
        (item) => item.role_name === "admin" || Number(item.role_id) === 1,
      ).length <= 1
    )
      return "Keep at least one administrator.";
    return "";
  }
  const columns: Column<RecordRow>[] =
    tab === "users"
      ? [
          textColumn("Name", "full_name"),
          textColumn("Email", "email"),
          {
            label: "Role",
            render: (row) => <Pill>{formatType(value(row, "role_name"))}</Pill>,
          },
          {
            label: "Joined",
            render: (row) => formatTime(String(row.created_at || "")),
          },
        ]
      : tab === "homes"
        ? [
            textColumn("Home", "home_name"),
            textColumn("Address", "address_text"),
            textColumn("Owner", "owner_name"),
          ]
        : [
            textColumn("Device", "brand_model"),
            {
              label: "Type",
              render: (row) => formatType(value(row, "device_type")),
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
                <Pill tone={row.status === "active" ? "good" : "neutral"}>
                  {formatType(value(row, "status"))}
                </Pill>
              ),
            },
          ];
  columns.unshift({ label: "ID", render: (row) => `#${row[idKey]}` });
  columns.push({
    label: "Actions",
    render: (row) => (
      <>
        <button
          className="button secondary small"
          disabled={Boolean(protection(row))}
          onClick={() => setDeleting(row)}
        >
          Delete {singular}
        </button>
        {protection(row) && <small>{protection(row)}</small>}
      </>
    ),
  });
  return (
    <>
      {notice && <Notice message={notice} onDismiss={() => setNotice("")} />}
      <section className="ops-panel">
        <div className="ops-panel-heading">
          <div>
            <h2>{formatType(tab)}</h2>
            <p className="muted">
              System-wide directory
              {!data.loading && !data.error
                ? ` · ${data.items.length} records`
                : ""}
            </p>
          </div>
          <Refresh
            onClick={data.reload}
            disabled={data.loading || deleting !== null}
          />
        </div>
        <DataTable
          {...data}
          rows={data.items}
          label={tab}
          rowKey={(row) => String(row[idKey])}
          searchText={(row) => Object.values(row).join(" ")}
          columns={columns}
        />
      </section>
      {deleting && (
        <ActionDialog
          title={`Delete this ${singular}?`}
          description={`Permanently delete “${value(deleting, tab === "users" ? "full_name" : tab === "homes" ? "home_name" : "brand_model")}” (#${deleting[idKey]})? Linked records may also be removed. This cannot be undone.`}
          actionLabel={`Delete ${singular}`}
          danger
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            if (protection(deleting)) throw new Error(protection(deleting));
            await api(`/admin/${tab}/${deleting[idKey]}`, { method: "DELETE" });
            data.setItems((current) =>
              current.filter((row) => row[idKey] !== deleting[idKey]),
            );
            void homes.reload();
            setNotice(`${formatType(singular)} deleted.`);
          }}
        />
      )}
    </>
  );
}
