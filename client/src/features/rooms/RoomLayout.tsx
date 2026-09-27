import {
  createContext,
  useContext,
  type Dispatch,
  type SetStateAction,
} from "react";
import { Link, Outlet, useParams } from "react-router-dom";
import { useHomeSpace } from "../homes/HomeLayout";
import { useApiList } from "../../lib/useApiList";
import type { Device, Room } from "../../lib/types";
import { ErrorNotice, Loading } from "../../components/Feedback";

interface RoomSpace {
  room: Room;
  devices: Device[];
  setDevices: Dispatch<SetStateAction<Device[]>>;
  loading: boolean;
  error: string;
  reload: () => void;
}
const Context = createContext<RoomSpace | null>(null);

function RoomSpaceProvider({ room }: { room: Room }) {
  const {
    items: devices,
    setItems: setDevices,
    loading,
    error,
    reload,
  } = useApiList<Device>(`/devices/${room.room_id}`);
  return (
    <Context.Provider
      value={{ room, devices, setDevices, loading, error, reload }}
    >
      <Outlet />
    </Context.Provider>
  );
}

export function RoomLayout() {
  const { roomId } = useParams();
  const { home, rooms, loading, error, reload } = useHomeSpace();
  if (loading) return <Loading label="Loading room…" />;
  if (error) return <ErrorNotice message={error} retry={reload} />;
  const room = rooms.find(
    (item) => String(item.room_id) === roomId && item.home_id === home.home_id,
  );
  if (!room)
    return (
      <div className="empty-state">
        <h1>Room not found</h1>
        <p className="muted">This room is unavailable in the selected home.</p>
        <Link className="button primary" to={`/homes/${home.home_id}`}>
          Back to home
        </Link>
      </div>
    );
  return <RoomSpaceProvider key={room.room_id} room={room} />;
}

export function useRoomSpace() {
  const context = useContext(Context);
  if (!context) throw new Error("useRoomSpace must be used within RoomLayout");
  return context;
}
