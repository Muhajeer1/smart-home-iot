import { useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { RefreshCw, Search } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { ErrorNotice, Loading } from "../../components/Feedback";
import { Modal } from "../../components/Modal";
import { Pagination } from "../../components/Pagination";
import { errorMessage } from "../../lib/api";

export type RecordRow = Record<string, string | number | boolean | null>;
export type Column<T> = { label: string; render: (row: T) => ReactNode };
export function RoleGate({
  admin = false,
  children,
}: {
  admin?: boolean;
  children: ReactNode;
}) {
  const { user } = useAuth();
  if (
    user?.role_name !== "admin" &&
    (admin || user?.role_name !== "technician")
  )
    return (
      <div className="empty-state">
        <h1>Access restricted</h1>
        <p className="muted">
          This workspace is available to{" "}
          {admin ? "administrators" : "administrators and technicians"}.
        </p>
        <Link className="button primary" to="/">
          Back to overview
        </Link>
      </div>
    );
  return children;
}
export function PageHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <header className="ops-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="muted">{description}</p>
      </div>
      {children}
    </header>
  );
}
export function ScopeNote() {
  const { user } = useAuth();
  return (
    <p className="ops-scope">
      {user?.role_name === "user"
        ? "Showing your homes only."
        : "System-wide view · all homes you can access."}
    </p>
  );
}
export function Refresh({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button className="button secondary" onClick={onClick} disabled={disabled}>
      <RefreshCw size={16} />
      Refresh
    </button>
  );
}
export function DataTable<T>({
  rows,
  columns,
  rowKey,
  label,
  loading,
  error,
  reload,
  filters,
  searchText,
}: {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T, index: number) => string | number;
  label: string;
  loading?: boolean;
  error?: string;
  reload?: () => void;
  filters?: ReactNode;
  searchText?: (row: T) => string;
}) {
  const [search, setSearch] = useState("");
  const [requestedPage, setPage] = useState(1);
  const filtered = searchText
    ? rows.filter((row) =>
        searchText(row)
          .toLocaleLowerCase()
          .includes(search.trim().toLocaleLowerCase()),
      )
    : rows;
  const page = Math.max(
    1,
    Math.min(requestedPage, Math.ceil(filtered.length / 15)),
  );
  return (
    <>
      <div className="ops-filters">
        {searchText && (
          <div className="ops-search">
            <Search size={17} />
            <input
              aria-label={`Search ${label}`}
              placeholder={`Search ${label}…`}
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </div>
        )}
        {filters}
      </div>
      {loading ? (
        <Loading label={`Loading ${label}…`} />
      ) : error ? (
        <ErrorNotice message={error} retry={reload} />
      ) : filtered.length === 0 ? (
        <div className="ops-empty">
          <h3>{search || rows.length ? "No matches" : "Nothing here yet"}</h3>
          <p className="muted">
            {search || rows.length
              ? "Try another search or change your filters."
              : `No ${label} to display in this view.`}
          </p>
          {search && (
            <button
              className="button secondary"
              onClick={() => {
                setSearch("");
                setPage(1);
              }}
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
        <>
          {columns.length > 3 && (
            <p className="ops-scroll-hint">
              Scroll sideways to see all columns and actions.
            </p>
          )}
          <div
            className="ops-table-wrap"
            tabIndex={0}
            aria-label={`${label} table`}
          >
            <table className="ops-table">
              <caption className="sr-only">{label}</caption>
              <thead>
                <tr>
                  {columns.map((column) => (
                    <th key={column.label} scope="col">
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.slice((page - 1) * 15, page * 15).map((row, i) => (
                  <tr key={rowKey(row, (page - 1) * 15 + i)}>
                    {columns.map((column) => (
                      <td key={column.label}>{column.render(row)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={page}
            pageSize={15}
            total={filtered.length}
            onChange={setPage}
          />
        </>
      )}
    </>
  );
}
export function ActionDialog({
  title,
  description,
  actionLabel,
  danger = false,
  children,
  onClose,
  onConfirm,
}: {
  title: string;
  description: string;
  actionLabel: string;
  danger?: boolean;
  children?: ReactNode;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  async function submit() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <Modal
      title={title}
      description={description}
      busy={busy}
      onClose={onClose}
    >
      {error && <ErrorNotice message={error} />}
      <fieldset className="ops-fieldset" disabled={busy}>
        {children}
      </fieldset>
      <div className="modal-actions">
        <button
          data-initial-focus
          className="button secondary"
          disabled={busy}
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          className={`button ${danger ? "danger" : "primary"}`}
          disabled={busy}
          onClick={() => void submit()}
        >
          {busy ? "Saving…" : actionLabel}
        </button>
      </div>
    </Modal>
  );
}
export function value(row: RecordRow, key: string) {
  const data = row[key];
  return data === null || data === undefined || data === ""
    ? "—"
    : String(data);
}
export function textColumn(label: string, key: string): Column<RecordRow> {
  return { label, render: (row) => value(row, key) };
}
export function Pill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={`ops-pill tone-${tone}`}>{children}</span>;
}
