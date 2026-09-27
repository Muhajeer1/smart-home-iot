export interface User {
  user_id: number;
  full_name: string;
  email: string;
  role_id: string | number;
  role_name: string;
}

export interface Home {
  home_id: number;
  owner_user_id: number;
  home_name: string;
  address_text: string;
  created_at?: string;
}

export interface Room {
  room_id: number;
  home_id: number;
  room_name: string;
  floor_no: number;
}

export interface Summary {
  home_count: string | number;
  room_count: string | number;
  device_count: string | number;
}

export type DeviceType =
  | "thermostat"
  | "camera"
  | "smart_lock"
  | "smoke_detector"
  | "light"
  | "smart_plug"
  | "motion_detector";
export type DeviceStatus = "active" | "inactive" | "offline" | "maintenance";

export interface Device {
  device_id: number;
  room_id: number;
  device_type: DeviceType;
  brand_model: string;
  serial_no: string;
  status: DeviceStatus;
  installed_at: string | null;
}

export interface Sensor {
  sensor_id: number;
  device_id: number;
  sensor_type: string;
  unit: string;
  normal_min: number | string | null;
  normal_max: number | string | null;
  is_active: boolean;
}

export interface Reading {
  reading_id: number;
  sensor_id: number;
  reading_time: string;
  reading_value: number | string | null;
  quality_flag: string | null;
}

export interface SimulatorSensor {
  sensor_id: number;
  sensor_type: string;
  unit: string;
  normal_min: number | string | null;
  normal_max: number | string | null;
  device_type: string;
  serial_no: string;
  room_name: string;
  home_name: string;
}
