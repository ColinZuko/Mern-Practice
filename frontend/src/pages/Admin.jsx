import { useEffect, useState } from "react";
import { DatabaseBackup, Trash2 } from "lucide-react";
import { createBackupNow, deleteUser, getBackups, getUsers, setUserRole } from "../api";
import { useAuth } from "../useAuth";
import { formatDate, initials, ROLE_LABELS } from "../lib/recipes";
import { useSeo } from "../useSeo";

const ROLE_OPTIONS = ["user", "editor", "admin"];

function BackupsPanel() {
  const [backups, setBackups] = useState(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getBackups()
      .then(setBackups)
      .catch(() => setStatus("Couldn't load the backups."));
  }, []);

  async function handleBackupNow() {
    setBusy(true);
    setStatus("");
    try {
      await createBackupNow();
      setBackups(await getBackups());
      setStatus("Backup saved.");
    } catch (error) {
      setStatus(error.response?.data?.message || "The backup failed.");
    } finally {
      setBusy(false);
    }
  }

  const latest = backups?.[0];
  const hoursAgo = latest ? (Date.now() - new Date(latest.lastModified).getTime()) / 36e5 : null;

  return (
    <section className="mt-12 rounded-2xl border bg-card p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <DatabaseBackup className="h-5 w-5 text-primary" /> Database backups
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            A copy of all recipes, accounts and comments is saved every day and kept for 30 days.
          </p>
        </div>
        <button
          type="button"
          onClick={handleBackupNow}
          disabled={busy}
          className="shrink-0 self-start rounded-full border px-4 py-2 text-sm font-medium transition hover:bg-muted disabled:opacity-60 cursor-pointer"
        >
          {busy ? "Backing up…" : "Back up now"}
        </button>
      </div>

      <div className="mt-5 text-sm">
        {backups === null && !status && <p className="text-muted-foreground">Loading…</p>}
        {backups && backups.length === 0 && (
          <p className="font-medium text-amber-700">No backups yet. The first one is made shortly after the server starts.</p>
        )}
        {latest && (
          <p className={hoursAgo > 26 ? "font-medium text-amber-700" : ""}>
            Latest backup: {new Date(latest.lastModified).toLocaleString("en-GB")} ({Math.round(latest.size / 1024)} KB)
            {hoursAgo > 26 && " — older than a day, check the server logs"}
          </p>
        )}
        {backups && backups.length > 1 && (
          <p className="mt-1 text-muted-foreground">{backups.length} recent backups stored.</p>
        )}
        {status && <p className="mt-2 font-medium">{status}</p>}
      </div>
    </section>
  );
}

export function Admin() {
  useSeo({ title: "Manage users", noindex: true });
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setUsers(await getUsers());
      } catch (error) {
        console.error("Failed to load users:", error);
        setMessage("Couldn't load users.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleRoleChange(target, role) {
    const previous = target.role;
    setUsers((list) => list.map((u) => (u._id === target._id ? { ...u, role } : u)));
    try {
      await setUserRole(target._id, role);
      setMessage(`${target.name} is now ${ROLE_LABELS[role].toLowerCase()}.`);
    } catch (error) {
      setUsers((list) => list.map((u) => (u._id === target._id ? { ...u, role: previous } : u)));
      setMessage(error.response?.data?.message || "Couldn't change that role.");
    }
  }

  async function handleRemove(target) {
    const confirmed = window.confirm(
      `Remove ${target.name} (${target.email})?

` +
        "Their account is deleted and they can no longer log in. " +
        "Any recipes they published stay on the site under their name. This can't be undone.",
    );
    if (!confirmed) return;
    try {
      await deleteUser(target._id);
      setUsers((list) => list.filter((u) => u._id !== target._id));
      setMessage(`${target.name} has been removed.`);
    } catch (error) {
      setMessage(error.response?.data?.message || "Couldn't remove that user.");
    }
  }

  const term = filter.trim().toLowerCase();
  const visible = users.filter(
    (u) => !term || u.name?.toLowerCase().includes(term) || u.email?.toLowerCase().includes(term),
  );
  const counts = ROLE_OPTIONS.reduce(
    (acc, role) => ({ ...acc, [role]: users.filter((u) => u.role === role).length }),
    {},
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
      <header className="border-b pb-8">
        <h1 className="text-4xl font-semibold">Manage users</h1>
        <p className="mt-2 text-muted-foreground">
          Editors can publish recipes and manage their own posts. Admins can also edit any post,
          change roles and remove accounts. New sign-ups start as readers.
        </p>
        <div className="mt-6 flex flex-wrap gap-3 text-sm">
          {ROLE_OPTIONS.map((role) => (
            <span key={role} className="rounded-full border bg-card px-3 py-1">
              {counts[role] || 0} {ROLE_LABELS[role].toLowerCase()}
              {counts[role] === 1 ? "" : "s"}
            </span>
          ))}
        </div>
      </header>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by name or email"
          className="h-10 w-full rounded-full border bg-card px-4 text-sm outline-none focus:ring-2 focus:ring-ring/30 sm:w-72"
        />
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
      </div>

      {loading ? (
        <p className="mt-10 text-muted-foreground">Loading…</p>
      ) : (
        <ul className="mt-6 divide-y rounded-2xl border bg-card">
          {visible.map((u) => {
            const isMe = u._id === me._id;
            return (
              <li key={u._id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {initials(u.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {u.name} {isMe && <span className="text-xs text-muted-foreground">(you)</span>}
                    {!u.emailVerified && (
                      <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                        Email not confirmed
                      </span>
                    )}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {u.email} · joined {formatDate(u.joinDate)}
                  </p>
                </div>
                <select
                  value={u.role}
                  disabled={isMe}
                  onChange={(e) => handleRoleChange(u, e.target.value)}
                  title={isMe ? "You can't change your own role" : undefined}
                  className="h-9 rounded-full border bg-background px-3 text-sm disabled:opacity-60 cursor-pointer"
                >
                  {ROLE_OPTIONS.map((role) => (
                    // People need a confirmed email before they can be given publishing rights
                    <option key={role} value={role} disabled={role !== "user" && !u.emailVerified}>
                      {ROLE_LABELS[role]}
                    </option>
                  ))}
                </select>
                {!isMe && (
                  <button
                    type="button"
                    onClick={() => handleRemove(u)}
                    title={`Remove ${u.name}`}
                    className="inline-flex h-9 items-center gap-1.5 self-start rounded-full border border-destructive/30 px-3 text-sm font-medium text-destructive transition hover:bg-destructive/5 sm:self-auto cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" /> Remove
                  </button>
                )}
              </li>
            );
          })}
          {visible.length === 0 && (
            <li className="px-5 py-8 text-center text-sm text-muted-foreground">No users match.</li>
          )}
        </ul>
      )}

      <BackupsPanel />
    </div>
  );
}
