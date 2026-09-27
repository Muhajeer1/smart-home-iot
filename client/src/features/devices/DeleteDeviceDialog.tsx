import { useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { Modal } from "../../components/Modal";
import { ErrorNotice } from "../../components/Feedback";
import { api, errorMessage } from "../../lib/api";
import type { Device } from "../../lib/types";
import { useRoomSpace } from "../rooms/RoomLayout";
import { useHomes } from "../homes/HomesContext";

export function DeleteDeviceDialog({
  device,
  onClose,
  onDeleted,
}: {
  device: Device;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const { setDevices } = useRoomSpace();
  const { refreshSummary } = useHomes();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  async function remove() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      await api(`/devices/${device.device_id}`, { method: "DELETE" });
      // Navigate before removing a device that may currently be the route's subject.
      onDeleted();
      setDevices((current) =>
        current.filter((item) => item.device_id !== device.device_id),
      );
      void refreshSummary();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <Modal
      title="Delete this device?"
      description={`Remove “${device.brand_model}” from this room? Its linked sensors and readings may also be removed. This cannot be undone.`}
      busy={busy}
      onClose={onClose}
    >
      {error && <ErrorNotice message={error} />}
      <div className="modal-actions">
        <button
          data-initial-focus
          className="button secondary"
          disabled={busy}
          onClick={onClose}
        >
          Keep device
        </button>
        <button
          className="button danger"
          disabled={busy}
          onClick={() => void remove()}
        >
          <Trash2 size={17} />
          {busy ? "Deleting…" : "Delete device"}
        </button>
      </div>
    </Modal>
  );
}
