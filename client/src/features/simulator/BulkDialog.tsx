import { useRef, useState, type FormEvent } from "react";
import { Sparkles } from "lucide-react";
import { Modal } from "../../components/Modal";
import { ErrorNotice } from "../../components/Feedback";
import { api, errorMessage } from "../../lib/api";

export function BulkDialog({
  sensorCount,
  onClose,
  onComplete,
}: {
  sensorCount: number;
  onClose: () => void;
  onComplete: (message: string) => void;
}) {
  const [count, setCount] = useState("100");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending.current) return;
    const value = Number(count);
    if (!Number.isInteger(value) || value < 1 || value > 50000) {
      setError("Enter a whole number between 1 and 50,000.");
      return;
    }
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await api<{
        inserted_count: number;
        sensor_count: number;
        alert_sensor_count: number;
      }>("/readings/simulate-bulk", {
        method: "POST",
        body: JSON.stringify({ count: value }),
      });
      onComplete(
        `${result.inserted_count.toLocaleString()} readings generated across ${result.sensor_count} sensors. ${result.alert_sensor_count} sensors were considered for abnormal-reading alerts.`,
      );
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <Modal
      title="Generate a dataset"
      description="This adds simulated history across all homes in the system. The search and sensor filters on the page do not limit this action."
      busy={busy}
      onClose={onClose}
    >
      <div className="bulk-scope">
        <strong>System-wide operation</strong>
        <p>
          {sensorCount} sensors currently listed. New measurements are
          distributed over the last 30 days and may create alerts.
        </p>
      </div>
      <form onSubmit={submit}>
        <fieldset disabled={busy}>
          <label htmlFor="bulk-count">Number of readings</label>
          <input
            id="bulk-count"
            data-initial-focus
            type="number"
            min="1"
            max="50000"
            step="1"
            required
            value={count}
            onChange={(e) => setCount(e.target.value)}
          />
          <p className="field-hint">
            1–50,000 records. Larger datasets take longer to generate.
          </p>
          {error && <ErrorNotice message={error} />}
          <div className="modal-actions">
            <button
              className="button secondary"
              type="button"
              onClick={onClose}
            >
              Cancel
            </button>
            <button className="button primary" type="submit">
              <Sparkles size={17} />
              {busy ? "Generating…" : "Generate across all homes"}
            </button>
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}
