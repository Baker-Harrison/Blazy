import { useCallback, useEffect, useState } from 'react';

export function useWorkspaces() {
  const [workspaces, setWorkspaces] = useState([]);
  const [ready, setReady] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const refresh = useCallback(async () => {
    const rows = await window.agentDB.getWorkspaces();
    setWorkspaces(rows);
    setReady(true);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createWorkspace = useCallback(async () => {
    const folder = await window.dialogs.openFolder();
    if (!folder) return;
    // Windows paths are case-insensitive; treat trailing separators as noise.
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

  const renameWorkspace = useCallback(
    async (id, name) => {
      await window.agentDB.renameWorkspace(id, name);
      await refresh();
    },
    [refresh]
  );

  const deleteWorkspace = useCallback(
    async (id) => {
      const workspace = workspaces.find((w) => w.id === id);
      if (!workspace) return;
      if (!window.confirm(`Delete workspace "${workspace.name}"?`)) return;
      await window.agentDB.deleteWorkspace(id);
      if (selectedId === id) setSelectedId(null);
      await refresh();
    },
    [refresh, workspaces, selectedId]
  );

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
