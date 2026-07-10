import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createPane,
  findPane,
  findFirstPane,
  findPaneWithTab,
  reconcile,
  addTab,
  removeTab,
  activateTab as activateTabInTree,
  reorderTab,
  splitWithTab,
  setSplitSizes,
} from '../lib/layoutTree';

// Older builds persisted a different layout shape ({ type: 'tabs' } nodes, or
// panes without a tabIds array). Convert on load; reconcile() cleans up the rest.
function migrateLegacyLayout(node) {
  if (!node || !node.type) return null;
  if (node.type === 'tabs') {
    return createPane(node.tabs || [], node.activeTabId);
  }
  if (node.type === 'pane') {
    if (Array.isArray(node.tabIds)) return node;
    return createPane(node.activeTabId ? [node.activeTabId] : [], node.activeTabId);
  }
  if (node.type === 'split') {
    return { ...node, children: (node.children || []).map(migrateLegacyLayout) };
  }
  return null;
}

export function useWorkspace(workspaceId) {
  const [tabs, setTabs] = useState([]);
  const [layout, setLayout] = useState(null);
  const [ready, setReady] = useState(false);
  const [focusedPaneId, setFocusedPaneId] = useState(null);

  const layoutRef = useRef(layout);
  const focusedPaneRef = useRef(focusedPaneId);
  layoutRef.current = layout;
  focusedPaneRef.current = focusedPaneId;

  // Keep the focused pane pointing at a pane that actually exists.
  useEffect(() => {
    if (!layout) {
      if (focusedPaneId) setFocusedPaneId(null);
      return;
    }
    if (!focusedPaneId || !findPane(layout, focusedPaneId)) {
      setFocusedPaneId(findFirstPane(layout)?.id || null);
    }
  }, [layout, focusedPaneId]);

  const persistLayout = useCallback(
    async (tree) => {
      if (!workspaceId) return;
      await window.agentDB.saveLayout(workspaceId, tree);
    },
    [workspaceId]
  );

  // Apply a layout mutation, persist it, and return the new tree.
  const applyLayout = useCallback(
    (updater) => {
      const next = updater(layoutRef.current);
      layoutRef.current = next;
      setLayout(next);
      persistLayout(next);
      return next;
    },
    [persistLayout]
  );

  const refreshTabs = useCallback(async () => {
    if (!workspaceId) {
      setTabs([]);
      setLayout(null);
      setFocusedPaneId(null);
      setReady(true);
      return;
    }
    const rows = await window.agentDB.getTabs(workspaceId);
    const savedLayout = await window.agentDB.getLayout(workspaceId);
    setTabs(rows);

    const allTabIds = rows.map((t) => String(t.id));
    const tree = reconcile(migrateLegacyLayout(savedLayout), allTabIds);
    layoutRef.current = tree;
    setLayout(tree);
    setFocusedPaneId(findFirstPane(tree)?.id || null);
    await window.agentDB.saveLayout(workspaceId, tree);
    setReady(true);
  }, [workspaceId]);

  useEffect(() => {
    setReady(false);
    refreshTabs();
  }, [refreshTabs]);

  const tabsById = useMemo(() => {
    const map = new Map();
    for (const tab of tabs) map.set(String(tab.id), tab);
    return map;
  }, [tabs]);

  // Create a tab in the focused pane (or a given pane / a new split).
  const createTab = useCallback(
    async (type, title, config = {}, { paneId, direction } = {}) => {
      if (!workspaceId) return null;
      const tab = await window.agentDB.createTab(workspaceId, type, title, config);
      setTabs((prev) => [...prev, tab]);

      const tabId = String(tab.id);
      if (direction) {
        const target = paneId || focusedPaneRef.current || findFirstPane(layoutRef.current)?.id;
        let newPaneId = null;
        applyLayout((prev) => {
          const result = splitWithTab(prev, target, direction, tabId);
          newPaneId = result.newPaneId;
          return result.tree;
        });
        if (newPaneId) setFocusedPaneId(newPaneId);
      } else {
        const target =
          paneId || focusedPaneRef.current || findFirstPane(layoutRef.current)?.id;
        const next = applyLayout((prev) => addTab(prev, target, tabId));
        setFocusedPaneId(findPaneWithTab(next, tabId)?.id || null);
      }
      return tab;
    },
    [workspaceId, applyLayout]
  );

  const updateTab = useCallback(async (id, updates) => {
    await window.agentDB.updateTab(id, updates);
    setTabs((prev) =>
      prev.map((t) =>
        String(t.id) === String(id)
          ? { ...t, ...updates, config: { ...t.config, ...(updates.config || {}) } }
          : t
      )
    );
  }, []);

  const renameTab = useCallback(
    (tabId, title) => updateTab(tabId, { title }),
    [updateTab]
  );

  // Duplicate a tab and place the copy: into `paneId`, into a new split, or
  // right after the original in its own pane.
  const duplicateTab = useCallback(
    async (tabId, { paneId, direction } = {}) => {
      if (!workspaceId) return null;
      const original = tabsById.get(String(tabId));
      if (!original) return null;
      // The copy must not share owned resources with the original.
      const { terminalId: _terminalId, ...configCopy } = original.config || {};
      const copy = await window.agentDB.createTab(
        workspaceId,
        original.type,
        original.title,
        configCopy
      );
      setTabs((prev) => [...prev, copy]);

      const copyId = String(copy.id);
      if (direction) {
        const target = paneId || findPaneWithTab(layoutRef.current, tabId)?.id;
        let newPaneId = null;
        applyLayout((prev) => {
          const result = splitWithTab(prev, target, direction, copyId);
          newPaneId = result.newPaneId;
          return result.tree;
        });
        if (newPaneId) setFocusedPaneId(newPaneId);
      } else if (paneId) {
        applyLayout((prev) => addTab(prev, paneId, copyId));
        setFocusedPaneId(paneId);
      } else {
        const home = findPaneWithTab(layoutRef.current, tabId);
        const index = home ? home.tabIds.indexOf(String(tabId)) + 1 : undefined;
        applyLayout((prev) => addTab(prev, home?.id, copyId, { insertIndex: index }));
        if (home) setFocusedPaneId(home.id);
      }
      return copy;
    },
    [workspaceId, tabsById, applyLayout]
  );

  // Release anything a tab owns outside the DB (currently: its pty).
  const releaseTabResources = useCallback(
    (tabId) => {
      const tab = tabsById.get(String(tabId));
      if (tab?.type === 'terminal' && tab.config?.terminalId) {
        window.terminals.kill(tab.config.terminalId);
      }
      if (tab?.type === 'browser') {
        window.browser.destroyPane(String(tabId));
      }
    },
    [tabsById]
  );

  const closeTabs = useCallback(
    async (tabIds) => {
      for (const id of tabIds) {
        releaseTabResources(id);
        await window.agentDB.deleteTab(id);
      }
      const closed = new Set(tabIds.map(String));
      setTabs((prev) => prev.filter((t) => !closed.has(String(t.id))));
      applyLayout((prev) => tabIds.reduce((tree, id) => removeTab(tree, id), prev));
    },
    [applyLayout, releaseTabResources]
  );

  // Closing a tab deletes it (and its data) permanently.
  const closeTab = useCallback((tabId) => closeTabs([tabId]), [closeTabs]);

  const closeOtherTabs = useCallback(
    (paneId, keepTabId) => {
      const pane = findPane(layoutRef.current, paneId);
      if (!pane) return;
      return closeTabs(pane.tabIds.filter((id) => id !== String(keepTabId)));
    },
    [closeTabs]
  );

  const closePane = useCallback(
    (paneId) => {
      const pane = findPane(layoutRef.current, paneId);
      if (!pane) return;
      return closeTabs([...pane.tabIds]);
    },
    [closeTabs]
  );

  const activateTab = useCallback(
    (tabId, paneId) => {
      const target = paneId || findPaneWithTab(layoutRef.current, tabId)?.id;
      if (!target) return;
      applyLayout((prev) => activateTabInTree(prev, target, tabId));
      setFocusedPaneId(target);
    },
    [applyLayout]
  );

  const reorderTabInPane = useCallback(
    (paneId, tabId, newIndex) => {
      applyLayout((prev) => reorderTab(prev, paneId, tabId, newIndex));
    },
    [applyLayout]
  );

  // Move a tab into another pane. The source pane collapses automatically if
  // it becomes empty.
  const moveTabToPane = useCallback(
    (tabId, targetPaneId, insertIndex) => {
      applyLayout((prev) => {
        const stripped = removeTab(prev, tabId);
        return addTab(stripped, targetPaneId, tabId, { insertIndex });
      });
      setFocusedPaneId(findPaneWithTab(layoutRef.current, tabId)?.id || targetPaneId);
    },
    [applyLayout]
  );

  // Split a pane, moving the tab into the new half.
  const splitPane = useCallback(
    (targetPaneId, direction, tabId) => {
      let newPaneId = null;
      applyLayout((prev) => {
        const result = splitWithTab(prev, targetPaneId, direction, tabId);
        newPaneId = result.newPaneId;
        return result.tree;
      });
      const landed = findPaneWithTab(layoutRef.current, tabId)?.id;
      setFocusedPaneId(landed || newPaneId || targetPaneId);
    },
    [applyLayout]
  );

  const focusPane = useCallback((paneId) => {
    setFocusedPaneId(paneId);
  }, []);

  // Cycle the active tab within the focused pane (Ctrl+Tab / Ctrl+Shift+Tab).
  const cycleTab = useCallback(
    (delta) => {
      const pane = findPane(layoutRef.current, focusedPaneRef.current);
      if (!pane || pane.tabIds.length < 2) return;
      const index = pane.tabIds.indexOf(pane.activeTabId);
      const next = pane.tabIds[(index + delta + pane.tabIds.length) % pane.tabIds.length];
      applyLayout((prev) => activateTabInTree(prev, pane.id, next));
    },
    [applyLayout]
  );

  // Persist new sizes for a (possibly nested) split after a resize drag.
  const resizeSplit = useCallback(
    (splitId, sizes) => {
      applyLayout((prev) => setSplitSizes(prev, splitId, sizes));
    },
    [applyLayout]
  );

  const activeTabId = useMemo(() => {
    if (!layout || !focusedPaneId) return null;
    return findPane(layout, focusedPaneId)?.activeTabId || null;
  }, [layout, focusedPaneId]);

  return {
    workspaceId,
    tabs,
    tabsById,
    layout,
    ready,
    focusedPaneId,
    activeTabId,
    refreshTabs,
    createTab,
    updateTab,
    renameTab,
    duplicateTab,
    closeTab,
    closeOtherTabs,
    closePane,
    activateTab,
    reorderTabInPane,
    moveTabToPane,
    splitPane,
    focusPane,
    cycleTab,
    resizeSplit,
  };
}
