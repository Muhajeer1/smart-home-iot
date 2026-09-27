import { useRef, useState, type FormEvent } from "react";
import { DoorOpen } from "lucide-react";
import { Modal } from "../../components/Modal";
import { ErrorNotice } from "../../components/Feedback";
import { api, errorMessage } from "../../lib/api";
import type { Room } from "../../lib/types";
import { useHomeSpace } from "../homes/HomeLayout";
import { useHomes } from "../homes/HomesContext";

export function RoomDialog({
  room,
  onClose,
  onSaved,
}: {
  room?: Room;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { home, setRooms } = useHomeSpace();
  const { refreshSummary } = useHomes();
  const [name, setName] = useState(room?.room_name || "");
  const [floor, setFloor] = useState(String(room?.floor_no ?? 0));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending.current) return;
    const room_name = name.trim();
    const floor_no = Number(floor);
    if (!room_name) {
      setError("Please enter a room name.");
      return;
    }
    if (
      !floor.trim() ||
      !Number.isInteger(floor_no) ||
      floor_no < -2147483648 ||
      floor_no > 2147483647
    ) {
      setError(
        "Please enter a whole floor number. Use 0 for the ground floor.",
      );
      return;
    }
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await api<{ room: Room }>(
        room ? `/rooms/${room.room_id}` : "/rooms",
        {
          method: room ? "PUT" : "POST",
          body: JSON.stringify(
            room
              ? { room_name, floor_no }
              : { home_id: home.home_id, room_name, floor_no },
          ),
        },
      );
      setRooms((current) =>
        room
          ? current.map((item) =>
              item.room_id === room.room_id ? result.room : item,
            )
          : [result.room, ...current],
      );
      if (!room) void refreshSummary();
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <Modal
      title={room ? "Edit room" : "Make room for something new"}
      description={`A space in ${home.home_name}. Give it a name and a place in your home.`}
      busy={busy}
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <fieldset disabled={busy}>
          <label htmlFor="room-name">Room name</label>
          <input
            id="room-name"
            data-initial-focus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Living room"
            required
          />
          <label htmlFor="room-floor">Floor</label>
          <input
            id="room-floor"
            type="number"
            step="1"
            value={floor}
            onChange={(e) => setFloor(e.target.value)}
            required
            aria-describedby="floor-hint"
          />
          <p className="field-hint" id="floor-hint">
            Ground floor is 0. Negative numbers are below ground.
          </p>
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
              <DoorOpen size={17} />
              {busy ? "Saving…" : room ? "Save room" : "Add room"}
            </button>
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}
