import { useCallback, useEffect, useState } from 'react';
import { useConfirm } from '../contexts/ConfirmContext';

// This hook manages the top-level list of workspaces — the folders you've
// opened in the app, shown in the sidebar. It's the "manager" for creating,
// renaming, and deleting whole workspaces (as opposed to the tabs/panes
// inside a single workspace, which is handled elsewhere by useWorkspace.js).
export function useWorkspaces() {
  // The function that pops up our custom "Are you sure?" dialog and lets us
  // "await" the user's answer (see contexts/ConfirmContext.jsx).
  const confirm = useConfirm();
  // Every workspace the app knows about.
  const [workspaces, setWorkspaces] = useState([]);
  // Whether we've finished loading the initial list from the database yet.
  const [ready, setReady] = useState(false);
  // The id of whichever workspace is currently selected/open (or null if
  // none is selected).
  const [selectedId, setSelectedId] = useState(null);

  // Re-fetches the full workspace list from the database. Used both on
  // first load and any time we make a change (create/rename/delete) so the
  // on-screen list stays in sync with what's actually saved.
  const refresh = useCallback(async () => {
    const rows = await window.agentDB.getWorkspaces();
    setWorkspaces(rows);
    setReady(true);
  }, []);

  // Load the workspace list once when the app first starts up.
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Opens a folder picker (a system dialog like the one you get from
  // "File > Open") and creates a new workspace pointing at whatever folder
  // the user chose. If they pick a folder that's already open as a
  // workspace, we just switch to that existing one instead of creating a
  // duplicate.
  const createWorkspace = useCallback(async () => {
    const folder = await window.dialogs.openFolder();
    if (!folder) return; // User cancelled the folder picker.

    // Windows paths are case-insensitive; treat trailing separators as noise.
    // In other words: on Windows, "C:\Projects" and "c:\projects\" refer to
    // the exact same folder even though they're written differently, so we
    // need to standardize the text before comparing two paths for equality.
    const normalize = (p) => p?.replace(/[\\/]+$/, '').replace(/\//g, '\\').toLowerCase();
    const existing = workspaces.find((w) => w.path && normalize(w.path) === normalize(folder.path));
    if (existing) {
      setSelectedId(existing.id);
      return;
    }
    const workspace = await window.agentDB.createWorkspace(folder.name, folder.path);
    await refresh();
    setSelectedId(workspace.id);
  }, [refresh, workspaces]);

  // Changes a workspace's display name and reloads the list to reflect it.
  const renameWorkspace = useCallback(
    async (id, name) => {
      await window.agentDB.renameWorkspace(id, name);
      await refresh();
    },
    [refresh]
  );

  // Deletes a workspace, after first asking the user to confirm (since this
  // can't be undone) using our custom on-brand confirmation popup.
  const deleteWorkspace = useCallback(
    async (id) => {
      const workspace = workspaces.find((w) => w.id === id);
      if (!workspace) return;
      const ok = await confirm({
        title: `Delete workspace "${workspace.name}"?`,
        description: 'This cannot be undone.',
        confirmLabel: 'Delete',
      });
      if (!ok) return;
      await window.agentDB.deleteWorkspace(id);
      // If the workspace we just deleted was the one currently selected,
      // clear the selection so we don't end up "viewing" a workspace that
      // no longer exists.
      if (selectedId === id) setSelectedId(null);
      await refresh();
    },
    [confirm, refresh, workspaces, selectedId]
  );

  // Hand back everything a component needs to display and manage the
  // workspace list.
  return {
    workspaces,
    ready,
    selectedId,
    setSelectedId,
    refresh,
    createWorkspace,
    renameWorkspace,
    deleteWorkspace,
  };
}
