import { useEffect, useState } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import * as Dialog from "@radix-ui/react-dialog";
import * as Dropdown from "@radix-ui/react-dropdown-menu";
import {
  LayoutDashboard,
  Files,
  Building2,
  History,
  Database,
  Search,
  ChevronDown,
  ArrowUpRight,
  LogOut,
  HelpCircle,
  X,
  Menu,
  Check,
  MapPin,
  PanelLeftClose,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useWorkspace } from "./WorkspaceContext";
import { Brand, ErrorState, LoadingState } from "./UI";
import { shortId, workUrl } from "./model";

const navigation = [
  { to: "/app", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/app/works", label: "Work register", icon: Files },
  { to: "/app/agencies", label: "Agency lens", icon: Building2 },
  { to: "/app/activity", label: "Audit trail", icon: History },
  { to: "/app/sources", label: "Data & sources", icon: Database },
];
const roles = {
  ministry: "Ministry workspace",
  state: "State workspace",
  district: "District workspace",
  mp: "MP workspace",
};

function SidebarContent({ onNavigate, onHelp }) {
  const { user } = useAuth();
  const { works, latest } = useWorkspace();
  const pending = works.filter(
    (w) => w.score > 0 && latest[w.id]?.decision !== "explained",
  ).length;
  return (
    <>
      <Link
        to="/app"
        className="brand-link"
        onClick={onNavigate}
        aria-label="Sentinel home"
      >
        <Brand />
      </Link>
      <div className="workspace-switch">
        <span className="workspace-monogram">M</span>
        <div>
          <strong>MPLADS</strong>
          <span>{roles[user.roleId]}</span>
        </div>
        <span className="workspace-dot" />
      </div>
      <div className="nav-label">WORKSPACE</div>
      <nav aria-label="Main navigation">
        {navigation.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
          >
            <Icon size={18} strokeWidth={1.65} />
            <span>{label}</span>
            {to === "/app/works" && pending > 0 && (
              <span className="nav-count">{pending}</span>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <div className="sidebar-note">
          <span className="tiny-label">THE SENTINEL PRINCIPLE</span>
          <p>
            Every flag needs
            <br />
            <em>a reason.</em>
          </p>
          <span>Every decision needs a record.</span>
        </div>
        <button className="nav-link" onClick={onHelp}>
          <HelpCircle size={18} />
          How Sentinel works
          <ArrowUpRight size={14} />
        </button>
        <div className="sidebar-foot">
          SIH26102 <span>Research prototype</span>
        </div>
      </div>
    </>
  );
}

export default function Shell() {
  const { user, logout } = useAuth();
  const { works, loading, error, reload, notice } = useWorkspace();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const location = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
  const navigate = useNavigate();
  const title = location.pathname.startsWith("/app/works/")
    ? "Work dossier"
    : navigation.find((n) => n.to === location.pathname)?.label || "Overview";
  const matches = works
    .filter((w) =>
      `${w.name} ${w.id} ${w.contractor}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    )
    .slice(0, 6);
  useEffect(() => {
    function keydown(e) {
      if (
        e.key === "/" &&
        !["INPUT", "TEXTAREA", "SELECT"].includes(
          document.activeElement?.tagName,
        )
      ) {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, []);
  useEffect(() => {
    document.title = `${title} · Sentinel`;
  }, [title]);
  return (
    <div className="workspace-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <aside className="desktop-sidebar">
        <SidebarContent onHelp={() => setHelpOpen(true)} />
      </aside>
      <div className="workspace-main">
        <header className="workspace-header">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
            >
              <Menu size={20} />
            </button>
            <span>MPLADS</span>
            <span className="breadcrumb-slash">/</span>
            <strong>{title}</strong>
          </div>
          <div className="header-actions">
            <button
              className="global-search"
              aria-label="Find a work"
              onClick={() => setSearchOpen(true)}
            >
              <Search size={16} />
              <span>Find a work</span>
              <kbd>/</kbd>
            </button>
            <span className="header-divider" />
            <Dropdown.Root>
              <Dropdown.Trigger asChild>
                <button className="profile-button" aria-label="Account menu">
                  <span className="avatar">
                    {user.name.trim().slice(0, 2).toUpperCase()}
                  </span>
                  <ChevronDown size={14} />
                </button>
              </Dropdown.Trigger>
              <Dropdown.Portal>
                <Dropdown.Content
                  className="dropdown-content"
                  sideOffset={10}
                  align="end"
                >
                  <Dropdown.Label className="dropdown-label">
                    {user.name}
                    <small>Local demo session</small>
                  </Dropdown.Label>
                  <Dropdown.Separator className="dropdown-separator" />
                  <Dropdown.Item
                    className="dropdown-item"
                    onSelect={() => {
                      logout();
                      navigate("/login");
                    }}
                  >
                    <LogOut size={15} />
                    Switch role or sign out
                  </Dropdown.Item>
                </Dropdown.Content>
              </Dropdown.Portal>
            </Dropdown.Root>
          </div>
        </header>
        <div className="data-context-strip">
          <span>
            <MapPin size={13} />
            {user.jurisdiction || "All available jurisdictions"}
          </span>
          <span className="data-context-note">
            <i />
            Historical sample / user imports
          </span>
        </div>
        <main id="main-content" tabIndex={-1} className="workspace-content">
          {error ? (
            <ErrorState message={error} onRetry={reload} />
          ) : loading && !works.length ? (
            <LoadingState />
          ) : (
            <Outlet />
          )}
        </main>
        <footer className="workspace-footer">
          <span>Public purpose. Documented decisions.</span>
          <span>Advisory screening · Human review required</span>
        </footer>
      </div>
      {notice && (
        <div className="toast" role="status">
          <Check size={17} />
          {notice}
        </div>
      )}
      <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="modal-overlay" />
          <Dialog.Content className="mobile-sidebar">
            <Dialog.Title className="sr-only">
              Workspace navigation
            </Dialog.Title>
            <Dialog.Description className="sr-only">
              Choose a workspace page.
            </Dialog.Description>
            <Dialog.Close
              className="drawer-close"
              aria-label="Close navigation"
            >
              <PanelLeftClose size={20} />
            </Dialog.Close>
            <SidebarContent
              onNavigate={() => setMobileOpen(false)}
              onHelp={() => {
                setMobileOpen(false);
                setHelpOpen(true);
              }}
            />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <Dialog.Root open={searchOpen} onOpenChange={setSearchOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="modal-overlay" />
          <Dialog.Content className="search-dialog">
            <Dialog.Title className="sr-only">Find a work</Dialog.Title>
            <Dialog.Description className="sr-only">
              Search by work name, reference or implementing agency.
            </Dialog.Description>
            <div className="command-input">
              <Search size={19} />
              <input
                aria-label="Search all works"
                placeholder="Search by work, reference or agency…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <Dialog.Close className="icon-button" aria-label="Close search">
                <X size={18} />
              </Dialog.Close>
            </div>
            <div className="command-results">
              <span className="tiny-label">
                {query ? "MATCHING WORKS" : "AVAILABLE WORKS"}
              </span>
              {matches.map((w) => (
                <Link
                  key={w.id}
                  to={workUrl(w.id)}
                  onClick={() => setSearchOpen(false)}
                >
                  <Files size={17} />
                  <span>
                    {w.name}
                    <small>
                      {shortId(w.id)} · {w.constituency}
                    </small>
                  </span>
                  <ArrowUpRight size={15} />
                </Link>
              ))}
              {!matches.length && (
                <p className="command-empty">
                  No results. Try a shorter name or work reference.
                </p>
              )}
            </div>
            <div className="command-footer">
              Searches the records in your jurisdiction <kbd>esc to close</kbd>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <Dialog.Root open={helpOpen} onOpenChange={setHelpOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="modal-overlay" />
          <Dialog.Content className="standard-dialog">
            <Dialog.Close
              className="dialog-close icon-button"
              aria-label="Close help"
            >
              <X size={18} />
            </Dialog.Close>
            <span className="eyebrow">A NOTE ON THE METHOD</span>
            <Dialog.Title>Evidence before conclusions.</Dialog.Title>
            <Dialog.Description>
              Sentinel helps you decide what to examine. It does not determine
              whether fraud occurred.
            </Dialog.Description>
            <ol className="method-steps">
              <li>
                <strong>Screen the available records</strong>
                <p>
                  Compare sanctions, approval batches and matching descriptions.
                  Limited data means limited checks.
                </p>
              </li>
              <li>
                <strong>Inspect the evidence</strong>
                <p>
                  Open a dossier to see observations, peer comparisons and
                  information that is still missing.
                </p>
              </li>
              <li>
                <strong>Record a reasoned decision</strong>
                <p>
                  Request evidence, document an explanation or escalate for
                  investigation. Every review joins the audit trail.
                </p>
              </li>
            </ol>
            <Link
              className="button primary"
              to="/app/sources"
              onClick={() => setHelpOpen(false)}
            >
              View data & methodology
              <ArrowUpRight size={16} />
            </Link>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
