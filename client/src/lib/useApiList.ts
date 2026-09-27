import { useCallback, useEffect, useState } from "react";
import { api, errorMessage } from "./api";

// Every request belongs to one URL. Aborted or superseded requests must never
// populate a different home's or room's view.
export function useApiList<T>(path: string) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    api<T[]>(path, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setItems(data);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(errorMessage(err));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [path, attempt]);
  const reload = useCallback(() => setAttempt((value) => value + 1), []);
  return { items, setItems, loading, error, reload };
}
