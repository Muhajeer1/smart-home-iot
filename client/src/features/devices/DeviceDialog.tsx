import { useRef, useState, type FormEvent } from "react";
import { Cpu, Leaf } from "lucide-react";
import { Modal } from "../../components/Modal";
import { ErrorNotice } from "../../components/Feedback";
import { api, errorMessage } from "../../lib/api";
import type { Device, DeviceType, DeviceStatus } from "../../lib/types";
import { useRoomSpace } from "../rooms/RoomLayout";
import { useHomes } from "../homes/HomesContext";
import { useAuth } from "../auth/AuthContext";
import {
  canEditDevice,
  deviceInfo,
  deviceStatuses,
  deviceTypes,
} from "./deviceOptions";

export function DeviceDialog({
  device,
  onClose,
  onSaved,
}: {
  device?: Device;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const { room, setDevices } = useRoomSpace();
  const { refreshSummary } = useHomes();
  const { user } = useAuth();
  const [type, setType] = useState<DeviceType>(
    device?.device_type || "thermostat",
  );
  const [model, setModel] = useState(device?.brand_model || "");
  const [serial, setSerial] = useState(device?.serial_no || "");
  const [status, setStatus] = useState<DeviceStatus>(
    device?.status || "active",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending.current) return;
    if (device && !canEditDevice(user)) {
      setError("Only an admin or technician can update devices.");
      return;
    }
    if (!model.trim() || (!device && !serial.trim())) {
      setError("Please enter a brand / model and serial number.");
      return;
    }
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await api<{ device: Device; message: string }>(
        device ? `/devices/${device.device_id}` : "/devices",
        {
          method: device ? "PUT" : "POST",
          body: JSON.stringify(
            device
              ? {
                  device_type: device.device_type,
                  brand_model: model.trim(),
                  status,
                }
              : {
                  room_id: room.room_id,
                  device_type: type,
                  brand_model: model.trim(),
                  serial_no: serial.trim(),
                  status,
                },
          ),
        },
      );
      setDevices((current) =>
        device
          ? current.map((item) =>
              item.device_id === device.device_id ? result.device : item,
            )
          : [result.device, ...current],
      );
      if (!device) void refreshSummary();
      onSaved(
        result.message ||
          (device ? "Device updated successfully." : "Your device is ready."),
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
      title={device ? "Edit device" : "Connect a new device"}
      description={
        device
          ? "Update the model or state. The device type and serial number stay the same."
          : `A new addition to ${room.room_name}. Its default sensors will be created automatically.`
      }
      busy={busy}
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <fieldset disabled={busy}>
          <label htmlFor="device-type">Device type</label>
          <select
            id="device-type"
            value={type}
            disabled={!!device}
            onChange={(e) => setType(e.target.value as DeviceType)}
          >
            {deviceTypes.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          {!device && (
            <div className="sensor-hint">
              <Leaf size={17} />
              <span>{deviceInfo(type).sensors} sensors included</span>
            </div>
          )}
          <label htmlFor="device-model">Brand / model</label>
          <input
            id="device-model"
            data-initial-focus
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="e.g. Nest Learning Thermostat"
            required
          />
          <label htmlFor="device-serial">Serial number</label>
          <input
            id="device-serial"
            value={serial}
            onChange={(e) => setSerial(e.target.value)}
            placeholder="Unique device serial"
            required
            disabled={!!device}
          />
          <label htmlFor="device-status">
            {device ? "Device state" : "Initial state"}
          </label>
          <select
            id="device-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as DeviceStatus)}
          >
            {deviceStatuses.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          {error && <ErrorNotice message={error} />}
          <div className="modal-actions">
            <button
              type="button"
              className="button secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button className="button primary" type="submit">
              <Cpu size={17} />
              {busy ? "Saving…" : device ? "Save device" : "Add device"}
            </button>
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}
