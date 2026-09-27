import { useState } from "react";
import { useApiList } from "../../lib/useApiList";
import { formatTime } from "../readings/readingUtils";
import { formatType } from "../devices/deviceOptions";
import {
  DataTable,
  PageHeading,
  Refresh,
  ScopeNote,
  type RecordRow,
  value,
} from "./shared";
export function ActivityPage() {
  const data = useApiList<RecordRow>("/events");
  const [type, setType] = useState("all");
  const [home, setHome] = useState("all");
  const homes = new Map(
    data.items.map((row) => [String(row.home_id), value(row, "home_name")]),
  );
  const rows = data.items.filter(
    (row) =>
      (type === "all" || row.event_type === type) &&
      (home === "all" || String(row.home_id) === home),
  );
  return (
    <>
      <PageHeading
        eyebrow="ACTIVITY"
        title="The story of your spaces."
        description="A timeline of device changes and the moments that matter."
      >
        <Refresh onClick={data.reload} disabled={data.loading} />
      </PageHeading>
      <ScopeNote />
      <section className="ops-panel">
        <DataTable
          key={`${type}:${home}`}
          {...data}
          rows={rows}
          label="events"
          rowKey={(row) => String(row.event_id)}
          searchText={(row) =>
            [
              row.description,
              row.home_name,
              row.device_type,
              row.event_type,
            ].join(" ")
          }
          filters={
            <>
              <label className="ops-select">
                Event type
                <select
                  value={type}
                  onChange={(event) => setType(event.target.value)}
                >
                  <option value="all">All event types</option>
                  {[...new Set(data.items.map((row) => String(row.event_type)))]
                    .sort()
                    .map((item) => (
                      <option key={item} value={item}>
                        {formatType(item)}
                      </option>
                    ))}
                </select>
              </label>
              <label className="ops-select">
                Home
                <select
                  value={home}
                  onChange={(event) => setHome(event.target.value)}
                >
                  <option value="all">All accessible homes</option>
                  {[...homes].map(([id, name]) => (
                    <option key={id} value={id}>
                      {name} · #{id}
                    </option>
                  ))}
                </select>
              </label>
            </>
          }
          columns={[
            {
              label: "Event",
              render: (row) => (
                <>
                  <strong>
                    {formatType(String(row.event_type || "Event"))}
                  </strong>
                  <small>#{String(row.event_id)}</small>
                </>
              ),
            },
            {
              label: "Description",
              render: (row) => value(row, "description"),
            },
            {
              label: "Location",
              render: (row) => (
                <>
                  {value(row, "home_name")}
                  <small>
                    {formatType(String(row.device_type || "")) ||
                      "No linked device"}
                  </small>
                </>
              ),
            },
            {
              label: "Time",
              render: (row) => formatTime(String(row.event_time || "")),
            },
          ]}
        />
      </section>
    </>
  );
}
