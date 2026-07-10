import { GearIcon, PlusIcon, SearchIcon } from './icons';

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

export default function SidebarActions({ workspaces, searchOpen, onToggleSearch }) {
  const { ready, tree } = workspaces;
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

      <SidebarActionButton disabled={!ready} icon={<GearIcon />}>
        Customize
      </SidebarActionButton>
    </div>
  );
}
