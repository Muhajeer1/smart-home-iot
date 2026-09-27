import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api, ApiError, errorMessage } from "../../lib/api";
import type { User } from "../../lib/types";

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}
const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api<{ user: User }>("/me");
      setUser(result.user);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) setUser(null);
      else setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const expire = () => setUser(null);
    window.addEventListener("session-expired", expire);
    return () => window.removeEventListener("session-expired", expire);
  }, [refresh]);

  const login = async (email: string, password: string) => {
    const result = await api<{ user: User }>("/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setError("");
    setUser(result.user);
  };
  const logout = async () => {
    await api("/logout", { method: "POST" });
    setUser(null);
  };
  return (
    <AuthContext.Provider
      value={{ user, loading, error, refresh, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
