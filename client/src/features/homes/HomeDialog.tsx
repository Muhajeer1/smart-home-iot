import { useRef, useState, type FormEvent } from "react";
import { House, Trash2 } from "lucide-react";
import { Modal } from "../../components/Modal";
import { ErrorNotice } from "../../components/Feedback";
import { errorMessage } from "../../lib/api";
import type { Home } from "../../lib/types";
import { useHomes } from "./HomesContext";

export function HomeDialog({
  home,
  onClose,
  onSaved,
}: {
  home?: Home;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const { save } = useHomes();
  const [name, setName] = useState(home?.home_name || "");
  const [address, setAddress] = useState(home?.address_text || "");
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending.current) return;
    const home_name = name.trim();
    const address_text = address.trim();
    if (!home_name || !address_text) {
      setError("Please enter a home name and address.");
      return;
    }
    if (
      Array.from(home_name).length > 60 ||
      Array.from(address_text).length > 200
    ) {
      setError(
        "Use up to 60 characters for the home name and 200 for the address.",
      );
      return;
    }
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      await save({ home_name, address_text }, home?.home_id);
      onSaved(home ? "Home updated successfully." : "Your new home is ready.");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <Modal
      title={home ? "Edit your home" : "A new place to call home"}
      description={
        home
          ? "Update the details. Your rooms, devices, and history stay with your home."
          : "Give your space a name and an address. You can always change these later."
      }
      busy={busy}
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <fieldset disabled={busy}>
          <label htmlFor="home-name">Home name</label>
          <input
            id="home-name"
            data-initial-focus
            name="home_name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Our city apartment"
            required
            aria-describedby="name-hint"
          />
          <p id="name-hint" className="field-hint">
            A name that feels like home. Up to 60 characters.
          </p>
          <label htmlFor="home-address">Address</label>
          <textarea
            id="home-address"
            name="address_text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Street, building, city"
            required
            rows={3}
            aria-describedby="address-hint"
          />
          <p id="address-hint" className="field-hint">
            Up to 200 characters.
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
              <House size={17} />
              {busy ? "Saving…" : home ? "Save changes" : "Add home"}
            </button>
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}

export function DeleteHomeDialog({
  home,
  onClose,
  onDeleted,
}: {
  home: Home;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const { remove } = useHomes();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  async function confirm() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      await remove(home.home_id);
      onDeleted();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <Modal
      title="Delete this home?"
      description={`You’re about to delete “${home.home_name}”. Deleting a home may also remove its linked rooms and devices. This cannot be undone.`}
      busy={busy}
      onClose={onClose}
    >
      {error && <ErrorNotice message={error} />}
      <div className="modal-actions">
        <button
          data-initial-focus
          className="button secondary"
          onClick={onClose}
          disabled={busy}
        >
          Keep home
        </button>
        <button
          className="button danger"
          onClick={() => void confirm()}
          disabled={busy}
        >
          <Trash2 size={17} />
          {busy ? "Deleting…" : "Delete home"}
        </button>
      </div>
    </Modal>
  );
}
