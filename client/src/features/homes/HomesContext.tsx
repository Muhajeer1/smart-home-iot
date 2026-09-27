import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api, errorMessage } from "../../lib/api";
import type { Home, Summary } from "../../lib/types";

interface HomesState {
  homes: Home[];
  summary: Summary | null;
  loading: boolean;
  error: string;
  summaryError: string;
  reload: () => Promise<void>;
  refreshSummary: () => Promise<void>;
  save: (
    values: { home_name: string; address_text: string },
    id?: number,
  ) => Promise<Home>;
  remove: (id: number) => Promise<void>;
}
const Context = createContext<HomesState | null>(null);

export function HomesProvider({ children }: { children: ReactNode }) {
  const [homes, setHomes] = useState<Home[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [summaryError, setSummaryError] = useState("");
  const refreshSummary = useCallback(async () => {
    try {
      setSummary(await api<Summary>("/analytics/dashboard-summary"));
      setSummaryError("");
    } catch (err) {
      setSummary(null);
      setSummaryError(errorMessage(err));
    }
  }, []);
  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    await Promise.all([
      api<Home[]>("/api/homes")
        .then(setHomes)
        .catch((err) => setError(errorMessage(err))),
      refreshSummary(),
    ]);
    setLoading(false);
  }, [refreshSummary]);
  useEffect(() => {
    void reload();
  }, [reload]);

  const save: HomesState["save"] = async (values, id) => {
    const { home } = await api<{ home: Home }>(
      id === undefined ? "/homes" : `/homes/${id}`,
      {
        method: id === undefined ? "POST" : "PUT",
        body: JSON.stringify(values),
      },
    );
    setHomes((current) =>
      id === undefined
        ? [home, ...current]
        : current.map((item) => (item.home_id === id ? home : item)),
    );
    if (id === undefined) void refreshSummary();
    return home;
  };
  const remove = async (id: number) => {
    await api(`/homes/${id}`, { method: "DELETE" });
    setHomes((current) => current.filter((home) => home.home_id !== id));
    void refreshSummary();
  };
  return (
    <Context.Provider
      value={{
        homes,
        summary,
        loading,
        error,
        summaryError,
        reload,
        refreshSummary,
        save,
        remove,
      }}
    >
      {children}
    </Context.Provider>
  );
}

export function useHomes() {
  const context = useContext(Context);
  if (!context) throw new Error("useHomes must be used within HomesProvider");
  return context;
}
