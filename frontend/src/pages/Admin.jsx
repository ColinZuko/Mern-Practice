import { useEffect, useState } from "react";
import { getUsers, setUserRole } from "../api";
import { useAuth } from "../useAuth";
import { formatDate, initials, ROLE_LABELS } from "../lib/recipes";

const ROLE_OPTIONS = ["user", "editor", "admin"];

export function Admin() {
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
          Editors can publish recipes and manage their own posts. Admins can also edit any post
          and change roles. New sign-ups start as readers.
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
                    <option key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </option>
                  ))}
                </select>
              </li>
            );
          })}
          {visible.length === 0 && (
            <li className="px-5 py-8 text-center text-sm text-muted-foreground">No users match.</li>
          )}
        </ul>
      )}
    </div>
  );
}
