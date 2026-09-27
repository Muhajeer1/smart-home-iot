import type { DeviceStatus } from "../../lib/types";
import { deviceStatuses } from "./deviceOptions";

export function StatusBadge({ status }: { status: DeviceStatus }) {
  return (
    <span className={`device-status status-${status}`}>
      <span aria-hidden="true" />
      {deviceStatuses.find((item) => item.value === status)?.label || status}
    </span>
  );
}
