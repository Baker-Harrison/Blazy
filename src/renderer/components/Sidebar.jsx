import IconButton from './IconButton';
import SidebarToggle from './SidebarToggle';
import { FolderOpenIcon, FolderIcon, DeleteIcon } from './icons';
import EditableLabel from './tree/EditableLabel';

// The panel along the left edge of the app window that lists all your open
// workspaces (folders), similar to the sidebar in VS Code or Finder/File
// Explorer's favorites list. You can open new folders, rename workspaces,
// switch between them, and delete them from here.
export default function Sidebar({ workspaces, open = true, onToggle }) {
  const { ready, workspaces: items, selectedId, setSelectedId, createWorkspace, renameWorkspace, deleteWorkspace } = workspaces;

  return (
    // The whole sidebar smoothly slides open/shut by animating its width
    // between 0 (fully hidden) and 15rem/240px (w-60) — that's what creates
    // the collapse/expand animation when you click the toggle button.
    <aside
      className={`flex h-full shrink-0 flex-col overflow-hidden bg-surface transition-[width] duration-200 ${
        open ? 'w-60' : 'w-0'
      }`}
    >
      {/* Inner content is kept at a fixed width even while the outer
          <aside> is animating narrower, so the contents don't visibly
          squish/reflow during the collapse animation — they just get
          clipped off by the shrinking outer container instead. */}
      <div className="flex h-full w-60 flex-col overflow-hidden">
        <div className="flex h-[34px] shrink-0 select-none items-center px-2 [-webkit-app-region:drag]">
          <SidebarToggle open onToggle={onToggle} />
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center justify-between px-4 pb-2 pt-1">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-dim">
                Workspaces
              </span>
              {ready && items.length > 0 && (
                <span className="text-[10.5px] tabular-nums text-ink-dim/60">{items.length}</span>
              )}
            </div>
            <IconButton label="Open folder" className="h-5 w-5" onClick={() => createWorkspace()}>
              <FolderOpenIcon />
            </IconButton>
          </div>

          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-2">
            {!ready && (
              <div className="px-2 py-1 text-[12.5px] text-ink-dim">Loading…</div>
            )}
            {/* Show a friendly "nothing here yet" message with an "open a
                folder" call-to-action if there are no workspaces at all. */}
            {ready && items.length === 0 && <EmptyState onOpen={() => createWorkspace()} />}
            {items.map((workspace) => (
              <WorkspaceRow
                key={workspace.id}
                workspace={workspace}
                active={selectedId === workspace.id}
                onSelect={() => setSelectedId(workspace.id)}
                onRename={(name) => renameWorkspace(workspace.id, name)}
                onDelete={() => deleteWorkspace(workspace.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}

// One row in the workspace list. Shows a folder icon, the workspace's
// (renamable) name, and — only on hover, or when it's the selected/active
// workspace — a delete button.
function WorkspaceRow({ workspace, active, onSelect, onRename, onDelete }) {
  return (
    <div
      onClick={onSelect}
      data-active={active ? 'true' : undefined}
      className={`group relative flex h-8 cursor-pointer items-center gap-2 rounded-md border px-2 text-[13px] transition-all duration-150 ${
        active
          ? 'border-danger/45 bg-danger/[0.07] text-white shadow-[0_0_14px_rgba(242,67,79,0.28),inset_0_0_10px_rgba(242,67,79,0.05)]'
          : 'border-transparent text-ink-dim hover:border-edge hover:bg-hover/50 hover:text-white'
      }`}
    >
      {/* A thin glowing vertical accent bar on the left edge of the row,
          only visible when this workspace is the selected one — it's a
          purely decorative "you are here" indicator. */}
      <span
        className={`absolute inset-y-1.5 left-0 w-[2px] rounded-full bg-danger transition-opacity duration-150 ${
          active ? 'opacity-100 shadow-[0_0_6px_rgba(242,67,79,0.8)]' : 'opacity-0'
        }`}
      />
      <span className={`shrink-0 transition-colors duration-150 ${active ? 'text-danger' : 'opacity-70'}`}>
        <FolderIcon />
      </span>
      <EditableLabel value={workspace.name} onRename={onRename} />
      <div className="ml-auto hidden shrink-0 items-center opacity-0 transition-opacity duration-150 group-hover:flex group-hover:opacity-100 group-data-[active]:flex group-data-[active]:opacity-100">
        <IconButton label="Delete workspace" danger onClick={onDelete}>
          <DeleteIcon />
        </IconButton>
      </div>
    </div>
  );
}

// The "no workspaces yet" placeholder shown before the user has opened any
// folders — a dashed box with an icon, short message, and a button that
// opens the same folder picker as the "+" icon in the header.
function EmptyState({ onOpen }) {
  return (
    <div className="flex flex-col items-center gap-2.5 rounded-md border border-dashed border-edge px-4 py-6 text-center">
      <span className="text-ink-dim opacity-60">
        <FolderOpenIcon />
      </span>
      <p className="m-0 text-[12.5px] leading-snug text-ink-dim">
        No workspaces yet.
      </p>
      <button
        type="button"
        onClick={onOpen}
        className="rounded border border-edge bg-hover/40 px-2.5 py-1 text-[12px] text-ink transition-colors duration-100 hover:bg-hover focus:outline-none focus-visible:ring-1 focus-visible:ring-white/30"
      >
        Open a folder
      </button>
    </div>
  );
}
