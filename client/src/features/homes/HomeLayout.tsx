import {
  createContext,
  useContext,
  type Dispatch,
  type SetStateAction,
} from "react";
import { Link, Outlet, useParams } from "react-router-dom";
import { useHomes } from "./HomesContext";
import { useApiList } from "../../lib/useApiList";
import type { Home, Room } from "../../lib/types";
import { ErrorNotice, Loading } from "../../components/Feedback";

interface HomeSpace {
  home: Home;
  rooms: Room[];
  setRooms: Dispatch<SetStateAction<Room[]>>;
  loading: boolean;
  error: string;
  reload: () => void;
}
const Context = createContext<HomeSpace | null>(null);

function HomeSpaceProvider({ home }: { home: Home }) {
  const {
    items: rooms,
    setItems: setRooms,
    loading,
    error,
    reload,
  } = useApiList<Room>(`/rooms/${home.home_id}`);
  return (
    <Context.Provider value={{ home, rooms, setRooms, loading, error, reload }}>
      <Outlet />
    </Context.Provider>
  );
}

export function HomeLayout() {
  const { homeId } = useParams();
  const { homes, loading, error, reload } = useHomes();
  if (loading) return <Loading />;
  if (error) return <ErrorNotice message={error} retry={() => void reload()} />;
  const home = homes.find((item) => String(item.home_id) === homeId);
  if (!home)
    return (
      <div className="empty-state">
        <h1>Home not found</h1>
        <p className="muted">This home is unavailable in your workspace.</p>
        <Link className="button primary" to="/homes">
          Back to my homes
        </Link>
      </div>
    );
  return <HomeSpaceProvider key={home.home_id} home={home} />;
}

export function useHomeSpace() {
  const context = useContext(Context);
  if (!context) throw new Error("useHomeSpace must be used within HomeLayout");
  return context;
}
