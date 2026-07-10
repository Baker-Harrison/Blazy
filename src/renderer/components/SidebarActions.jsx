import { GearIcon, PlusIcon, SearchIcon } from './icons';

// One reusable row-shaped button used for the actions at the top of the
// sidebar ("New Agent", "Search", "Customize"). Rather than writing the
// same button markup three separate times, we define it once here and
// reuse it with different icons/labels/behavior below.
//
// Props:
// - primary: makes the text brighter/more prominent (used for "New Agent").
// - active: highlights the button as "currently toggled on" (used for
//   Search when the search box is open).
// - disabled: greys out the button and makes it unclickable.
// - onClick: what happens when clicked.
// - icon: the small icon to show on the left.
// - children: the button's text label.
function SidebarActionButton({ primary = false, active = false, disabled = false, onClick, icon, children }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex h-7 w-full items-center gap-2 rounded-md px-2 text-left text-[13px] transition-colors duration-100 hover:bg-hover hover:text-white disabled:pointer-events-none disabled:opacity-50 ${
        active ? 'bg-hover text-white' : primary ? 'text-ink' : 'text-ink-dim'
      }`}
    >
      <span className="flex w-3.5 shrink-0 justify-center">{icon}</span>
      {children}
    </button>
  );
}

// The small strip of quick-action buttons at the top of the sidebar.
export default function SidebarActions({ workspaces, searchOpen, onToggleSearch }) {
  const { ready, tree } = workspaces;
  // "ready" means the workspace data has finished loading from disk.
  // We only enable buttons that operate on workspaces (like New Agent or
  // Search) once there's actually at least one workspace to act on.
  const hasWorkspaces = ready && tree.length > 0;

  return (
    <div className="flex flex-col gap-px px-2 pb-3 pt-1">
      <SidebarActionButton
        primary
        disabled={!hasWorkspaces}
        onClick={() => workspaces.createAgent()}
        icon={<PlusIcon />}
      >
        New Agent
      </SidebarActionButton>

      <SidebarActionButton
        disabled={!hasWorkspaces}
        active={searchOpen}
        onClick={onToggleSearch}
        icon={<SearchIcon />}
      >
        Search
      </SidebarActionButton>

      {/* "Customize" doesn't do anything yet (no onClick), it's just
          reserved for a future settings/customization feature. It's only
          enabled once the app has finished loading ("ready"). */}
      <SidebarActionButton disabled={!ready} icon={<GearIcon />}>
        Customize
      </SidebarActionButton>
    </div>
  );
}
