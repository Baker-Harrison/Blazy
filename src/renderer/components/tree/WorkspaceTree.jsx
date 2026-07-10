import { useEffect, useMemo, useState } from 'react';
import { DeleteIcon, FolderIcon, PlusIcon } from '../icons';
import { relativeTime } from '../../lib/time';
import TreeRow from './TreeRow';

/** Workspaces whose name or threads match the query; matching by name keeps all threads. */
function filterTree(tree, query) {
  const q = query.trim().toLowerCase();
  if (!q) return tree;
  return tree
    .map((workspace) => {
      const nameMatches = workspace.name.toLowerCase().includes(q);
      const threads = workspace.threads.filter((t) => t.title.toLowerCase().includes(q));
      if (!nameMatches && threads.length === 0) return null;
      return { ...workspace, threads: nameMatches && threads.length === 0 ? workspace.threads : threads };
    })
    .filter(Boolean);
}

export default function WorkspaceTree({ workspaces, query = '' }) {
  const searching = query.trim().length > 0;
  const visible = useMemo(() => filterTree(workspaces.tree, query), [workspaces.tree, query]);

  // Re-render every minute so relative timestamps ("5m", "3h") stay current.
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
          forceExpanded={searching}
        />
      ))}
    </div>
  );
}

function WorkspaceNode({ workspace, workspaces, forceExpanded = false }) {
  const key = `w:${workspace.id}`;
  const collapsed = !forceExpanded && workspaces.collapsedKeys.has(key);
  const { selection } = workspaces;
  const active = selection.workspaceId === workspace.id && !selection.threadId;

  const handleNewAgent = async () => {
    if (collapsed) workspaces.toggleCollapsed(key);
    await workspaces.createAgent(workspace.id);
  };

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
