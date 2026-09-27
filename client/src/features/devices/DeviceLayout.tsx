import { createContext, useContext } from "react";
import { Link, Outlet, useParams } from "react-router-dom";
import { useHomeSpace } from "../homes/HomeLayout";
import { useRoomSpace } from "../rooms/RoomLayout";
import { useApiList } from "../../lib/useApiList";
import type { Device, Sensor } from "../../lib/types";
import { ErrorNotice, Loading } from "../../components/Feedback";

interface DeviceSpace {
  device: Device;
  sensors: Sensor[];
  loading: boolean;
  error: string;
  reload: () => void;
}
const Context = createContext<DeviceSpace | null>(null);

function DeviceSpaceProvider({ device }: { device: Device }) {
  const {
    items: sensors,
    loading,
    error,
    reload,
  } = useApiList<Sensor>(`/sensors/${device.device_id}`);
  return (
    <Context.Provider value={{ device, sensors, loading, error, reload }}>
      <Outlet />
    </Context.Provider>
  );
}

export function DeviceLayout() {
  const { deviceId } = useParams();
  const { home } = useHomeSpace();
  const { room, devices, loading, error, reload } = useRoomSpace();
  if (loading) return <Loading label="Loading device…" />;
  if (error) return <ErrorNotice message={error} retry={reload} />;
  const device = devices.find(
    (item) =>
      String(item.device_id) === deviceId && item.room_id === room.room_id,
  );
  if (!device)
    return (
      <div className="empty-state">
        <h1>Device not found</h1>
        <p className="muted">
          This device is unavailable in the selected room.
        </p>
        <Link
          className="button primary"
          to={`/homes/${home.home_id}/rooms/${room.room_id}`}
        >
          Back to room
        </Link>
      </div>
    );
  return <DeviceSpaceProvider key={device.device_id} device={device} />;
}

export function useDeviceSpace() {
  const context = useContext(Context);
  if (!context)
    throw new Error("useDeviceSpace must be used within DeviceLayout");
  return context;
}
