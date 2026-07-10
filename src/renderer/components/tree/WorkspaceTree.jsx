import { useEffect, useMemo, useState } from 'react';
import { DeleteIcon, FolderIcon, PlusIcon } from '../icons';
import { relativeTime } from '../../lib/time';
import TreeRow from './TreeRow';

/**
 * Workspaces whose name or threads match the query; matching by name keeps all threads.
 *
 * In plain terms: given the search box's text, this filters down the list
 * of workspaces and their conversation threads to only what matches — the
 * same idea as typing into a search bar and watching a list narrow down.
 * If a WORKSPACE's own name matches, we keep ALL of its threads visible
 * (since the user is probably looking for that whole workspace); otherwise
 * we only keep the individual threads whose own titles match.
 */
function filterTree(tree, query) {
  const q = query.trim().toLowerCase();
  if (!q) return tree; // No search text — show everything, unfiltered.
  return tree
    .map((workspace) => {
      const nameMatches = workspace.name.toLowerCase().includes(q);
      const threads = workspace.threads.filter((t) => t.title.toLowerCase().includes(q));
      // Drop this workspace entirely from the results if neither its own
      // name nor any of its threads match the search.
      if (!nameMatches && threads.length === 0) return null;
      return { ...workspace, threads: nameMatches && threads.length === 0 ? workspace.threads : threads };
    })
    .filter(Boolean); // Remove the "null" entries for workspaces we dropped above.
}

// Renders the whole tree of workspaces and their nested conversation
// threads in the sidebar, and supports live text search filtering.
export default function WorkspaceTree({ workspaces, query = '' }) {
  const searching = query.trim().length > 0;
  // Only recompute the filtered tree when the underlying data or the
  // search text actually changes, rather than on every re-render.
  const visible = useMemo(() => filterTree(workspaces.tree, query), [workspaces.tree, query]);

  // Re-render every minute so relative timestamps ("5m", "3h") stay current.
  // In plain terms: a thread's "3m" (3 minutes ago) label needs to become
  // "4m" once enough real time passes, even if nothing else about the app
  // changed — this timer forces a fresh render once a minute just so those
  // little labels stay accurate, similar to how a "5 minutes ago" label on
  // a social media post keeps updating itself while you're looking at it.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  if (visible.length === 0) {
    if (searching) {
      return (
        <div className="px-2 py-1 text-[12.5px] leading-normal text-ink-dim">
          No matches.
        </div>
      );
    }
    return null;
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
      {visible.map((workspace) => (
        <WorkspaceNode
          key={workspace.id}
          workspace={workspace}
          workspaces={workspaces}
          // While actively searching, force every workspace open so
          // matching threads are always visible, ignoring whatever
          // collapsed/expanded state the user had set manually.
          forceExpanded={searching}
        />
      ))}
    </div>
  );
}

// One workspace row in the tree, plus its collapsible list of threads
// nested underneath it.
function WorkspaceNode({ workspace, workspaces, forceExpanded = false }) {
  const key = `w:${workspace.id}`;
  const collapsed = !forceExpanded && workspaces.collapsedKeys.has(key);
  const { selection } = workspaces;
  // This row is "active" (highlighted) if the whole workspace is selected
  // and no specific thread inside it is separately selected.
  const active = selection.workspaceId === workspace.id && !selection.threadId;

  // Creates a new conversation thread in this workspace, expanding the
  // workspace first if it was collapsed so the new thread is visible.
  const handleNewAgent = async () => {
    if (collapsed) workspaces.toggleCollapsed(key);
    await workspaces.createAgent(workspace.id);
  };

  // Deletes the whole workspace, warning the user first if it contains any
  // threads (since deleting it deletes those too).
  const handleDelete = async () => {
    const threadCount = workspace.threads.length;
    const detail = threadCount > 0 ? ` This deletes ${threadCount} thread(s).` : '';
    if (!window.confirm(`Delete workspace "${workspace.name}"?${detail}`)) return;
    await workspaces.deleteWorkspace(workspace.id);
  };

  return (
    <div>
      <TreeRow
        label={workspace.name}
        active={active}
        icon={<FolderIcon />}
        collapsed={collapsed}
        onToggle={() => workspaces.toggleCollapsed(key)}
        onSelect={() => workspaces.selectWorkspace(workspace.id)}
        onRename={(name) => workspaces.renameWorkspace(workspace.id, name)}
        actions={[
          { label: 'New agent', icon: <PlusIcon size={11} />, onClick: handleNewAgent },
          { label: 'Delete workspace', icon: <DeleteIcon />, onClick: handleDelete, danger: true },
        ]}
      />
      {/* This wrapper animates its height between 0 (fully collapsed) and
          its natural height (fully expanded) using a CSS grid trick — the
          "grid-rows-[0fr]" vs "grid-rows-[1fr]" toggle — which lets us
          smoothly animate to/from "auto" height, something plain CSS can't
          normally do directly. */}
      <div
        className={`grid transition-[grid-template-rows] duration-200 ease-out ${
          collapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          {workspace.threads.map((thread, i) => (
            <ThreadNode
              key={thread.id}
              thread={thread}
              workspace={workspace}
              workspaces={workspaces}
              collapsed={collapsed}
              index={i}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// One conversation-thread row, nested under its parent workspace.
function ThreadNode({ thread, workspace, workspaces, collapsed, index = 0 }) {
  const active = workspaces.selection.threadId === thread.id;

  const handleDelete = async () => {
    if (!window.confirm(`Delete thread "${thread.title}"?`)) return;
    await workspaces.deleteThread(thread.id);
  };

  return (
    <div
      className={`transition-all duration-200 ease-out ${
        collapsed ? 'opacity-0 -translate-y-1' : 'opacity-100 translate-y-0'
      }`}
      // Each thread fades/slides in slightly later than the one above it
      // (25ms further delayed per position), creating a subtle cascading
      // "stagger" animation when a workspace is expanded, rather than all
      // threads popping in at once.
      style={{ transitionDelay: collapsed ? '0ms' : `${index * 25}ms` }}
    >
      <TreeRow
        label={thread.title}
        active={active}
        indentClass="pl-[26px]"
        meta={relativeTime(thread.updated_at)}
        onSelect={() => workspaces.selectThread(workspace.id, thread.id)}
        onRename={(title) => workspaces.renameThread(thread.id, title)}
        actions={[
          { label: 'Delete thread', icon: <DeleteIcon />, onClick: handleDelete, danger: true },
        ]}
      />
    </div>
  );
}
