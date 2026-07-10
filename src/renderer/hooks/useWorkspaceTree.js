import { useCallback, useEffect, useState } from 'react';
import { nextDefaultName } from '../lib/names';

const EMPTY_SELECTION = { workspaceId: null, threadId: null };

export function useWorkspaceTree() {
  const [tree, setTree] = useState([]);
  const [ready, setReady] = useState(false);
  const [selection, setSelection] = useState(EMPTY_SELECTION);
  const [collapsedKeys, setCollapsedKeys] = useState(() => new Set());

  const refresh = useCallback(async () => {
    setTree(await window.agentDB.getTree());
    setReady(true);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const toggleCollapsed = useCallback((key) => {
    setCollapsedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const selectWorkspace = useCallback((workspaceId) => {
    setSelection({ workspaceId, threadId: null });
  }, []);

  const selectThread = useCallback((workspaceId, threadId) => {
    setSelection({ workspaceId, threadId });
  }, []);

  const createAgent = useCallback(
    async (targetWorkspaceId) => {
      const workspaceId = targetWorkspaceId ?? selection.workspaceId ?? tree[0]?.id ?? null;
      if (!workspaceId) return;

      const thread = await window.agentDB.createThread(workspaceId, 'New Agent');
      await refresh();
      setSelection({ workspaceId, threadId: thread.id });
    },
    [selection.workspaceId, tree, refresh]
  );

  const createWorkspace = useCallback(async () => {
    const folder = await window.dialogs.openFolder();
    if (!folder) return;
    await window.agentDB.createWorkspace(folder.name, folder.path);
    await refresh();
  }, [refresh]);

  const renameWorkspace = useCallback(
    async (id, name) => {
      await window.agentDB.renameWorkspace(id, name);
      await refresh();
    },
    [refresh]
  );

  const renameThread = useCallback(
    async (id, title) => {
      await window.agentDB.renameThread(id, title);
      await refresh();
    },
    [refresh]
  );

  const deleteWorkspace = useCallback(
    async (id) => {
      await window.agentDB.deleteWorkspace(id);
      setSelection((prev) => (prev.workspaceId === id ? EMPTY_SELECTION : prev));
      await refresh();
    },
    [refresh]
  );

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
