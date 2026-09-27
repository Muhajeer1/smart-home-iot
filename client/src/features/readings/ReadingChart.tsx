import { useId, useMemo } from "react";
import type { Reading, Sensor } from "../../lib/types";
import { formatTime, formatValue, numeric } from "./readingUtils";

type Point = { time: number; value: number; reading: Reading };
// Preserve local peaks as well as the first and last measurements, bounding SVG
// size without pretending that the sampled plot is the complete data table.
function sample(points: Point[]): Point[] {
  if (points.length <= 180) return points;
  const result = [points[0]];
  const width = Math.ceil((points.length - 2) / 88);
  for (let start = 1; start < points.length - 1; start += width) {
    const bucket = points.slice(
      start,
      Math.min(start + width, points.length - 1),
    );
    const min = bucket.reduce((a, b) => (a.value < b.value ? a : b));
    const max = bucket.reduce((a, b) => (a.value > b.value ? a : b));
    result.push(
      ...(min === max ? [min] : [min, max].sort((a, b) => a.time - b.time)),
    );
  }
  result.push(points[points.length - 1]);
  return result;
}

export function ReadingChart({
  readings,
  sensor,
}: {
  readings: Reading[];
  sensor: Sensor;
}) {
  const id = useId();
  const points = useMemo(
    () =>
      readings
        .flatMap((reading) => {
          const value = numeric(reading.reading_value),
            time = Date.parse(reading.reading_time);
          return value !== null && Number.isFinite(time)
            ? [{ value, time, reading }]
            : [];
        })
        .sort(
          (a, b) =>
            a.time - b.time || a.reading.reading_id - b.reading.reading_id,
        ),
    [readings],
  );
  if (!points.length)
    return (
      <div className="chart-empty">
        No numeric, timestamped readings to plot for these filters.
      </div>
    );
  const displayed = sample(points);
  const min = numeric(sensor.normal_min),
    max = numeric(sensor.normal_max);
  let bottom = points[0].value,
    top = bottom;
  for (const point of points) {
    bottom = Math.min(bottom, point.value);
    top = Math.max(top, point.value);
  }
  if (min !== null) bottom = Math.min(bottom, min);
  if (max !== null) top = Math.max(top, max);
  const padding = Math.max((top - bottom) * 0.15, Math.abs(top) * 0.01, 0.1);
  bottom -= padding;
  top += padding;
  const left = 68,
    right = 866,
    yTop = 24,
    yBottom = 227;
  const first = points[0].time,
    last = points[points.length - 1].time;
  const x = (time: number) =>
    last === first
      ? (left + right) / 2
      : left + ((time - first) / (last - first)) * (right - left);
  const y = (value: number) =>
    yBottom - ((value - bottom) / (top - bottom)) * (yBottom - yTop);
  const coordinates = displayed
    .map((point) => `${x(point.time)},${y(point.value)}`)
    .join(" ");
  const bandTop = Math.min(top, max ?? top),
    bandBottom = Math.max(bottom, min ?? bottom);
  const showBand = (min !== null || max !== null) && bandTop >= bandBottom;
  return (
    <figure className="reading-chart">
      <svg
        viewBox="0 0 890 275"
        role="img"
        aria-labelledby={`${id}-title ${id}-description`}
      >
        <title id={`${id}-title`}>
          {sensor.sensor_type.replaceAll("_", " ")} reading history
        </title>
        <desc id={`${id}-description`}>
          {points.length} timestamped readings. Values from{" "}
          {formatValue(Math.min(...displayed.map((p) => p.value)))} to{" "}
          {formatValue(Math.max(...displayed.map((p) => p.value)))}{" "}
          {sensor.unit}. The table provides individual records.
        </desc>
        {showBand && (
          <rect
            x={left}
            y={y(bandTop)}
            width={right - left}
            height={y(bandBottom) - y(bandTop)}
            fill="#eef4e8"
          />
        )}
        {[0, 1, 2, 3, 4].map((index) => {
          const value = bottom + (index / 4) * (top - bottom);
          return (
            <g key={index}>
              <line
                x1={left}
                x2={right}
                y1={y(value)}
                y2={y(value)}
                stroke="#e6ece5"
                strokeDasharray="4 5"
              />
              <text
                x={left - 12}
                y={y(value) + 4}
                textAnchor="end"
                className="chart-axis-text"
              >
                {formatValue(value)}
              </text>
            </g>
          );
        })}
        {min !== null && min <= top && min >= bottom && (
          <line
            x1={left}
            x2={right}
            y1={y(min)}
            y2={y(min)}
            stroke="#98b48d"
            strokeDasharray="5 5"
          />
        )}
        {max !== null && max <= top && max >= bottom && (
          <line
            x1={left}
            x2={right}
            y1={y(max)}
            y2={y(max)}
            stroke="#98b48d"
            strokeDasharray="5 5"
          />
        )}
        <polyline
          points={coordinates}
          fill="none"
          stroke="#386e56"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {displayed.map((point) => (
          <circle
            key={point.reading.reading_id}
            cx={x(point.time)}
            cy={y(point.value)}
            r={displayed.length < 30 ? 3.5 : 2}
            fill={
              (min !== null && point.value < min) ||
              (max !== null && point.value > max)
                ? "#b67847"
                : "#386e56"
            }
          >
            <title>
              {formatTime(point.reading.reading_time)}:{" "}
              {formatValue(point.value)} {sensor.unit}
            </title>
          </circle>
        ))}
        <text x={left} y="258" className="chart-axis-text">
          {formatTime(points[0].reading.reading_time)}
        </text>
        {last !== first && (
          <text x={right} y="258" textAnchor="end" className="chart-axis-text">
            {formatTime(points[points.length - 1].reading.reading_time)}
          </text>
        )}
      </svg>
      <figcaption>
        <span>
          <i className="legend-band" />
          Configured normal range
        </span>
        <span>
          <i className="legend-outside" />
          Outside range
        </span>
        <span>
          {displayed.length < points.length
            ? `${displayed.length} representative points · ${points.length} measurements`
            : `${points.length} measurements`}
        </span>
      </figcaption>
    </figure>
  );
}
