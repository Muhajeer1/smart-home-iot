import type { Reading, Sensor, User } from "../../lib/types";

export const PAGE_SIZE = 25;
export function canSimulateReadings(user: User | null) {
  return user?.role_name === "admin" || user?.role_name === "technician";
}
export function numeric(
  value: number | string | null | undefined,
): number | null {
  if (value === null || value === undefined || String(value).trim() === "")
    return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
export function formatValue(value: number | string | null | undefined) {
  const number = numeric(value);
  return number === null
    ? "—"
    : new Intl.NumberFormat(undefined, { maximumFractionDigits: 4 }).format(
        number,
      );
}
export function formatTime(value: string) {
  const time = new Date(value);
  return Number.isNaN(time.getTime())
    ? "Unknown time"
    : time.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
}
export type RangeState = "within" | "outside" | "unconfigured" | "unknown";
export const rangeLabels: Record<RangeState, string> = {
  within: "Within range",
  outside: "Outside range",
  unconfigured: "Not configured",
  unknown: "Unavailable",
};
export function rangeState(
  value: Reading["reading_value"],
  sensor: Pick<Sensor, "normal_min" | "normal_max">,
): RangeState {
  const number = numeric(value),
    min = numeric(sensor.normal_min),
    max = numeric(sensor.normal_max);
  if (number === null || (min !== null && max !== null && min > max))
    return "unknown";
  if (min === null && max === null) return "unconfigured";
  return (min !== null && number < min) || (max !== null && number > max)
    ? "outside"
    : "within";
}
export function rangeText(sensor: Pick<Sensor, "normal_min" | "normal_max">) {
  const min = numeric(sensor.normal_min),
    max = numeric(sensor.normal_max);
  if (min === null && max === null) return "Not configured";
  if (min === null) return `Up to ${formatValue(max)}`;
  if (max === null) return `${formatValue(min)} and above`;
  return `${formatValue(min)} – ${formatValue(max)}`;
}
export function byNewest(a: Reading, b: Reading) {
  const time = (value: string) => {
    const n = Date.parse(value);
    return Number.isFinite(n) ? n : -Infinity;
  };
  const difference = time(b.reading_time) - time(a.reading_time);
  return Number.isNaN(difference) || difference === 0
    ? Number(b.reading_id) - Number(a.reading_id)
    : difference;
}
export function dateBoundary(value: string, end = false): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(0);
  date.setFullYear(year, month - 1, day);
  date.setHours(0, 0, 0, 0);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  )
    return null;
  if (end) date.setDate(date.getDate() + 1);
  return date.getTime();
}

// Quoting handles delimiters; the prefix also prevents spreadsheet formulas
// in text fields controlled by database content (such as the unit).
function csvCell(value: unknown) {
  let text = String(value ?? "");
  if (typeof value !== "number" && /^[\s]*[=+\-@\t\r]/.test(text))
    text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
export function readingsCsv(readings: Reading[], sensor: Sensor) {
  return (
    "\uFEFF" +
    [
      [
        "reading_id",
        "sensor_id",
        "reading_time",
        "reading_value",
        "unit",
        "quality",
        "range_status",
      ],
      ...readings.map((reading) => [
        reading.reading_id,
        sensor.sensor_id,
        reading.reading_time,
        numeric(reading.reading_value) ?? "",
        sensor.unit,
        reading.quality_flag,
        rangeLabels[rangeState(reading.reading_value, sensor)],
      ]),
    ]
      .map((row) => row.map(csvCell).join(","))
      .join("\r\n")
  );
}
export function downloadReadings(readings: Reading[], sensor: Sensor) {
  const blob = new Blob([readingsCsv(readings, sensor)], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `sensor-${sensor.sensor_id}-readings.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
