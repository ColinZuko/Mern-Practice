import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Bookmark,
  ChevronDown,
  LogOut,
  Menu,
  Search,
  SquarePen,
  Users,
  X,
} from "lucide-react";
import { Logo } from "./Logo";
import { useAuth } from "../useAuth";
import { initials, ROLE_LABELS } from "../lib/recipes";

const NAV_LINKS = [
  { name: "Home", path: "/home" },
  { name: "Recipes", path: "/recipes" },
  { name: "About", path: "/about" },
];

function navClass({ isActive }) {
  return `text-sm font-medium transition-colors hover:text-primary ${
    isActive ? "text-primary" : "text-foreground/70"
  }`;
}

export function Navbar() {
  const { user, isLoggedIn, role, canWrite, isAdmin, logout } = useAuth();
  const { pathname } = useLocation();
  // Each menu remembers the page it was opened on, so it closes by itself after navigating
  const [openMenu, setOpenMenu] = useState(null);
  const [query, setQuery] = useState("");
  const accountRef = useRef(null);
  const navigate = useNavigate();

  const isOpen = (name) => openMenu?.name === name && openMenu.path === pathname;
  const setOpen = (name, open) => setOpenMenu(open ? { name, path: pathname } : null);
  const menuOpen = isOpen("mobile");
  const accountOpen = isOpen("account");
  const searchOpen = isOpen("search");
  const setMenuOpen = (open) => setOpen("mobile", open);
  const setAccountOpen = (open) => setOpen("account", open);
  const setSearchOpen = (open) => setOpen("search", open);

  // Close the account dropdown when clicking elsewhere
  useEffect(() => {
    function handleClick(e) {
      if (accountRef.current && !accountRef.current.contains(e.target)) {
        setOpenMenu((current) => (current?.name === "account" ? null : current));
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSearch(e) {
    e.preventDefault();
    navigate(`/recipes?q=${encodeURIComponent(query.trim())}`);
    setQuery("");
  }

  function handleLogout() {
    logout();
    navigate("/home");
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b print:hidden bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
        <Link to="/home" className="flex shrink-0 items-center gap-2.5">
          <Logo className="h-9 w-9" />
          <span className="font-serif text-xl font-semibold tracking-tight">
            Pickle &amp; Pan
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map((link) => (
            <NavLink key={link.path} to={link.path} className={navClass}>
              {link.name}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {searchOpen ? (
            <form onSubmit={handleSearch} className="hidden sm:block">
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onBlur={() => !query && setSearchOpen(false)}
                placeholder="Search recipes…"
                className="h-9 w-56 rounded-full border bg-card px-4 text-sm outline-none focus:ring-2 focus:ring-ring/30"
              />
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Search recipes"
              className="hidden h-9 w-9 items-center justify-center rounded-full text-foreground/70 hover:bg-muted hover:text-foreground sm:flex cursor-pointer"
            >
              <Search className="h-4 w-4" />
            </button>
          )}

          {canWrite && (
            <Link
              to="/createblog"
              className="hidden items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 sm:flex"
            >
              <SquarePen className="h-4 w-4" />
              Write
            </Link>
          )}

          {isLoggedIn ? (
            <div className="relative hidden md:block" ref={accountRef}>
              <button
                type="button"
                onClick={() => setAccountOpen(!accountOpen)}
                className="flex items-center gap-1.5 rounded-full p-1 pr-2 hover:bg-muted cursor-pointer"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {initials(user.name)}
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </button>

              {accountOpen && (
                <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border bg-popover shadow-lg">
                  <div className="border-b px-4 py-3">
                    <p className="truncate text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {ROLE_LABELS[role]}
                    </p>
                  </div>
                  <div className="py-1 text-sm">
                    <Link to="/profile" className="flex items-center gap-2 px-4 py-2 hover:bg-muted">
                      <Bookmark className="h-4 w-4" /> Saved & account
                    </Link>
                    {isAdmin && (
                      <Link to="/admin" className="flex items-center gap-2 px-4 py-2 hover:bg-muted">
                        <Users className="h-4 w-4" /> Manage users
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-muted cursor-pointer"
                    >
                      <LogOut className="h-4 w-4" /> Log out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/login"
              className="hidden rounded-full border px-4 py-2 text-sm font-medium transition hover:bg-muted md:block"
            >
              Sign in
            </Link>
          )}

          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Open menu"
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted md:hidden cursor-pointer"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="border-t bg-background px-4 pb-6 pt-4 md:hidden">
          <form onSubmit={handleSearch} className="mb-4">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search recipes…"
              className="h-10 w-full rounded-full border bg-card px-4 text-sm outline-none"
            />
          </form>
          <nav className="flex flex-col text-base">
            {NAV_LINKS.map((link) => (
              <NavLink key={link.path} to={link.path} className="border-b py-3">
                {link.name}
              </NavLink>
            ))}
            {canWrite && (
              <Link to="/createblog" className="border-b py-3">Write a recipe</Link>
            )}
            {isLoggedIn ? (
              <>
                <Link to="/profile" className="border-b py-3">Saved & account</Link>
                {isAdmin && <Link to="/admin" className="border-b py-3">Manage users</Link>}
                <button type="button" onClick={handleLogout} className="py-3 text-left cursor-pointer">
                  Log out
                </button>
              </>
            ) : (
              <Link to="/login" className="py-3 font-medium text-primary">Sign in</Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
