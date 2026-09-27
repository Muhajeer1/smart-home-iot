import {
  Navigate,
  Route,
  Routes,
  useLocation,
  Outlet,
  Link,
} from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import { AuthPage } from "../features/auth/AuthPage";
import { ErrorNotice, Loading } from "../components/Feedback";
import { Shell } from "./Shell";
import { HomesProvider } from "../features/homes/HomesContext";
import { HomesPage } from "../features/homes/HomesPage";
import { HomeDetail } from "../features/homes/HomeDetail";
import { HomeLayout } from "../features/homes/HomeLayout";
import { RoomLayout } from "../features/rooms/RoomLayout";
import { RoomDetail } from "../features/rooms/RoomDetail";
import { DeviceDetail } from "../features/devices/DeviceDetail";
import { DeviceLayout } from "../features/devices/DeviceLayout";
import { ReadingsPage } from "../features/readings/ReadingsPage";
import { SimulatorPage } from "../features/simulator/SimulatorPage";

import { ActivityPage } from "../features/operations/ActivityPage";
import { AlertsPage } from "../features/operations/AlertsPage";
import { AnalyticsPage } from "../features/operations/AnalyticsPage";
import { AdminPage } from "../features/operations/AdminPage";
import { TechnicianPage } from "../features/operations/TechnicianPage";

function Protected() {
  const { user } = useAuth();
  const location = useLocation();
  if (!user)
    return (
      <Navigate
        to="/login"
        state={{ from: location.pathname + location.search }}
        replace
      />
    );
  return (
    <HomesProvider key={user.user_id}>
      <Shell>
        <Outlet />
      </Shell>
    </HomesProvider>
  );
}

export function App() {
  const { loading, error, refresh } = useAuth();
  if (loading)
    return (
      <div className="full-page-state">
        <Loading />
      </div>
    );
  if (error)
    return (
      <div className="full-page-state">
        <div>
          <h1>Let’s reconnect.</h1>
          <ErrorNotice message={error} retry={() => void refresh()} />
        </div>
      </div>
    );
  return (
    <Routes>
      <Route path="/login" element={<AuthPage key="login" />} />
      <Route path="/register" element={<AuthPage key="register" register />} />
      <Route element={<Protected />}>
        <Route index element={<HomesPage overview />} />
        <Route path="homes" element={<HomesPage />} />
        <Route path="activity" element={<ActivityPage />} />
        <Route path="alert-center" element={<AlertsPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="admin" element={<AdminPage />} />
        <Route path="technician" element={<TechnicianPage />} />
        <Route path="events" element={<Navigate to="/activity" replace />} />
        <Route
          path="alerts"
          element={<Navigate to="/alert-center" replace />}
        />
        <Route path="dashboard" element={<Navigate to="/" replace />} />
        <Route path="simulator" element={<SimulatorPage />} />
        <Route path="homes/:homeId" element={<HomeLayout />}>
          <Route index element={<HomeDetail />} />
          <Route path="rooms/:roomId" element={<RoomLayout />}>
            <Route index element={<RoomDetail />} />
            <Route path="devices/:deviceId" element={<DeviceLayout />}>
              <Route index element={<DeviceDetail />} />
              <Route path="sensors/:sensorId" element={<ReadingsPage />} />
            </Route>
          </Route>
        </Route>
        <Route
          path="*"
          element={
            <div className="empty-state">
              <h1>This page isn’t here.</h1>
              <p className="muted">Let’s get you back to your space.</p>
              <Link className="button primary" to="/">
                Go to overview
              </Link>
            </div>
          }
        />
      </Route>
    </Routes>
  );
}
