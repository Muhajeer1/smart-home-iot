import type { DeviceStatus, DeviceType, User } from "../../lib/types";
import {
  Camera,
  Flame,
  Lightbulb,
  LockKeyhole,
  Plug,
  Radar,
  Thermometer,
} from "lucide-react";

export const deviceTypes: {
  value: DeviceType;
  label: string;
  sensors: string;
  Icon: typeof Camera;
}[] = [
  {
    value: "thermostat",
    label: "Thermostat",
    sensors: "Temperature and humidity",
    Icon: Thermometer,
  },
  {
    value: "camera",
    label: "Camera",
    sensors: "Motion and light",
    Icon: Camera,
  },
  {
    value: "smart_lock",
    label: "Smart lock",
    sensors: "Open / close",
    Icon: LockKeyhole,
  },
  {
    value: "smoke_detector",
    label: "Smoke detector",
    sensors: "Smoke and temperature",
    Icon: Flame,
  },
  {
    value: "light",
    label: "Light",
    sensors: "Light and energy",
    Icon: Lightbulb,
  },
  { value: "smart_plug", label: "Smart plug", sensors: "Energy", Icon: Plug },
  {
    value: "motion_detector",
    label: "Motion detector",
    sensors: "Motion and light",
    Icon: Radar,
  },
];
export const deviceStatuses: { value: DeviceStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "offline", label: "Offline" },
  { value: "maintenance", label: "Maintenance" },
];
export function deviceInfo(type: DeviceType) {
  return deviceTypes.find((item) => item.value === type) || deviceTypes[0];
}
export function canEditDevice(user: User | null) {
  return user?.role_name === "admin" || user?.role_name === "technician";
}
export function floorLabel(floor: number) {
  return Number(floor) === 0 ? "Ground floor" : `Floor ${floor}`;
}

export function formatType(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/^./, (letter) => letter.toUpperCase());
}
