import { useCallback, useEffect, useState } from 'react';
import { nextDefaultName } from '../lib/names';

// A "nothing is selected" starting point — no workspace and no thread
// (conversation) currently chosen.
const EMPTY_SELECTION = { workspaceId: null, threadId: null };

// This hook manages an alternate, tree-shaped view of workspaces and their
// conversation "threads" nested underneath them (as opposed to
// useWorkspaces.js, which manages a flat list of workspaces, and
// useWorkspace.js, which manages one workspace's tabs/panes). It tracks
// which workspace/thread is currently selected, which ones are
// collapsed/expanded in the tree view, and provides actions for creating,
// renaming, and deleting both workspaces and threads.
//
// Note: this hook expects window.agentDB to expose tree/thread-oriented
// functions (getTree, createThread, renameThread, deleteThread) that
// aren't present in the current preload.js bridge — that file only exposes
// flat workspace/tab functions. This hook may be from an earlier or
// alternate version of the sidebar's data model.
export function useWorkspaceTree() {
  // The nested tree of workspaces (each containing its own threads).
  const [tree, setTree] = useState([]);
  // Whether the tree has finished loading from the database yet.
  const [ready, setReady] = useState(false);
  // Which workspace and (optionally) which thread inside it are currently
  // selected/highlighted in the sidebar.
  const [selection, setSelection] = useState(EMPTY_SELECTION);
  // The set of tree-row "keys" that are currently collapsed (hiding their
  // children), similar to collapsed folders in a file tree.
  const [collapsedKeys, setCollapsedKeys] = useState(() => new Set());

  // Reloads the whole tree from the database.
  const refresh = useCallback(async () => {
    setTree(await window.agentDB.getTree());
    setReady(true);
  }, []);

  // Load the tree once when this hook is first used.
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Expands or collapses one row in the tree by flipping whether its key is
  // present in the collapsedKeys set.
  const toggleCollapsed = useCallback((key) => {
    setCollapsedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // Marks a workspace as selected (and clears any selected thread, since
  // selecting a whole workspace means you're not viewing one specific
  // conversation inside it).
  const selectWorkspace = useCallback((workspaceId) => {
    setSelection({ workspaceId, threadId: null });
  }, []);

  // Marks a specific thread (conversation) inside a workspace as selected.
  const selectThread = useCallback((workspaceId, threadId) => {
    setSelection({ workspaceId, threadId });
  }, []);

  // Creates a brand-new conversation thread inside a workspace, then
  // selects it. If no target workspace is explicitly given, it falls back
  // to whichever workspace is currently selected, or the very first
  // workspace in the tree if nothing is selected at all.
  const createAgent = useCallback(
    async (targetWorkspaceId) => {
      const workspaceId = targetWorkspaceId ?? selection.workspaceId ?? tree[0]?.id ?? null;
      if (!workspaceId) return; // No workspace exists at all — nothing to create a thread in.

      const thread = await window.agentDB.createThread(workspaceId, 'New Agent');
      await refresh();
      setSelection({ workspaceId, threadId: thread.id });
    },
    [selection.workspaceId, tree, refresh]
  );

  // Opens the folder picker and adds the chosen folder as a new workspace.
  const createWorkspace = useCallback(async () => {
    const folder = await window.dialogs.openFolder();
    if (!folder) return; // User cancelled the dialog.
    await window.agentDB.createWorkspace(folder.name, folder.path);
    await refresh();
  }, [refresh]);

  // Renames a workspace and reloads the tree so the new name shows up.
  const renameWorkspace = useCallback(
    async (id, name) => {
      await window.agentDB.renameWorkspace(id, name);
      await refresh();
    },
    [refresh]
  );

  // Renames a single conversation thread.
  const renameThread = useCallback(
    async (id, title) => {
      await window.agentDB.renameThread(id, title);
      await refresh();
    },
    [refresh]
  );

  // Deletes a workspace. If it happened to be the currently selected one,
  // clear the selection so we're not left "pointing at" something that no
  // longer exists.
  const deleteWorkspace = useCallback(
    async (id) => {
      await window.agentDB.deleteWorkspace(id);
      setSelection((prev) => (prev.workspaceId === id ? EMPTY_SELECTION : prev));
      await refresh();
    },
    [refresh]
  );

  // Deletes a single thread. If it was the selected thread, clear just the
  // thread part of the selection (keeping the parent workspace selected).
  const deleteThread = useCallback(
    async (id) => {
      await window.agentDB.deleteThread(id);
      setSelection((prev) =>
        prev.threadId === id ? { workspaceId: prev.workspaceId, threadId: null } : prev
      );
      await refresh();
    },
    [refresh]
  );

  return {
    tree,
    ready,
    refresh,
    selection,
    collapsedKeys,
    toggleCollapsed,
    selectWorkspace,
    selectThread,
    createAgent,
    createWorkspace,
    renameWorkspace,
    renameThread,
    deleteWorkspace,
    deleteThread,
  };
}
