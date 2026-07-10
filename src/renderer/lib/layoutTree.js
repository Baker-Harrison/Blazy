// Pure operations on a workspace layout tree.
//
// A tree is either null (no tabs open) or a node:
//   pane:  { id, type: 'pane', tabIds: string[], activeTabId: string|null }
//   split: { id, type: 'split', direction: 'horizontal'|'vertical',
//            children: node[], sizes: number[] }
//
// Every mutation goes through normalize(), which enforces the invariants
// the rest of the app relies on:
//   - tab ids are strings and appear in exactly one pane
//   - no empty panes, no splits with fewer than two children
//   - no split nested directly inside a split of the same direction
//   - a pane's activeTabId always points at one of its own tabs
//   - sizes always sum to 100 and match children length

let idCounter = 0;
function newId(prefix) {
  return `${prefix}-${Date.now()}-${++idCounter}`;
}

export function createPane(tabIds = [], activeTabId = null) {
  const ids = tabIds.map(String);
  return {
    id: newId('pane'),
    type: 'pane',
    tabIds: ids,
    activeTabId: activeTabId != null ? String(activeTabId) : ids[0] || null,
  };
}

export function createSplit(direction, children, sizes) {
  return { id: newId('split'), type: 'split', direction, children, sizes };
}

// --- queries ---------------------------------------------------------------

export function findPane(node, paneId) {
  if (!node) return null;
  if (node.type === 'pane') return node.id === paneId ? node : null;
  for (const child of node.children) {
    const found = findPane(child, paneId);
    if (found) return found;
  }
  return null;
}

export function findFirstPane(node) {
  if (!node) return null;
  if (node.type === 'pane') return node;
  for (const child of node.children) {
    const found = findFirstPane(child);
    if (found) return found;
  }
  return null;
}

export function findPaneWithTab(node, tabId) {
  if (!node) return null;
  const id = String(tabId);
  if (node.type === 'pane') return node.tabIds.includes(id) ? node : null;
  for (const child of node.children) {
    const found = findPaneWithTab(child, tabId);
    if (found) return found;
  }
  return null;
}

export function collectPanes(node, out = []) {
  if (!node) return out;
  if (node.type === 'pane') out.push(node);
  else node.children.forEach((child) => collectPanes(child, out));
  return out;
}

export function collectTabIds(node) {
  return collectPanes(node).flatMap((pane) => pane.tabIds);
}

// --- normalization ----------------------------------------------------------

export function normalize(node) {
  const result = normalizeNode(node);
  return result;
}

function normalizeNode(node) {
  if (!node) return null;

  if (node.type === 'pane') {
    if (node.tabIds.length === 0) return null;
    const activeTabId = node.tabIds.includes(node.activeTabId)
      ? node.activeTabId
      : node.tabIds[0];
    return activeTabId === node.activeTabId ? node : { ...node, activeTabId };
  }

  if (node.type !== 'split') return null;

  // Normalize children, dropping the ones that collapsed to nothing and
  // flattening nested splits of the same direction into this one.
  const children = [];
  const sizes = [];
  node.children.forEach((rawChild, index) => {
    const child = normalizeNode(rawChild);
    if (!child) return;
    const size = node.sizes?.[index] ?? 100 / node.children.length;
    if (child.type === 'split' && child.direction === node.direction) {
      const innerTotal = child.sizes.reduce((a, b) => a + b, 0) || 1;
      child.children.forEach((grandchild, i) => {
        children.push(grandchild);
        sizes.push((size * child.sizes[i]) / innerTotal);
      });
    } else {
      children.push(child);
      sizes.push(size);
    }
  });

  if (children.length === 0) return null;
  if (children.length === 1) return children[0];

  const total = sizes.reduce((a, b) => a + b, 0) || 1;
  return {
    ...node,
    children,
    sizes: sizes.map((s) => (s * 100) / total),
  };
}

// Drop tab ids that don't exist anymore and add tabs missing from the layout
// to the first pane, so DB and layout can never drift apart.
export function reconcile(node, allTabIds) {
  const valid = new Set(allTabIds.map(String));
  const pruned = mapPanes(node, (pane) => ({
    ...pane,
    tabIds: pane.tabIds.filter((id) => valid.has(id)),
  }));

  const present = new Set(collectTabIds(pruned));
  const orphans = [...valid].filter((id) => !present.has(id));
  if (orphans.length === 0) return normalize(pruned);

  const normalized = normalize(pruned);
  if (!normalized) return createPane(orphans, orphans[0]);
  const first = findFirstPane(normalized);
  return normalize(
    mapPanes(normalized, (pane) =>
      pane.id === first.id ? { ...pane, tabIds: [...pane.tabIds, ...orphans] } : pane
    )
  );
}

function mapPanes(node, fn) {
  if (!node) return null;
  if (node.type === 'pane') return fn(node);
  return { ...node, children: node.children.map((child) => mapPanes(child, fn)) };
}

// --- mutations (all return a normalized tree) --------------------------------

export function addTab(node, paneId, tabId, { activate = true, insertIndex } = {}) {
  const id = String(tabId);
  if (!node) return createPane([id], id);

  const target = findPane(node, paneId) ? paneId : findFirstPane(node)?.id;
  return normalize(
    mapPanes(node, (pane) => {
      if (pane.id !== target) return pane;
      if (pane.tabIds.includes(id)) {
        return activate ? { ...pane, activeTabId: id } : pane;
      }
      const tabIds = [...pane.tabIds];
      const at = insertIndex != null ? Math.max(0, Math.min(insertIndex, tabIds.length)) : tabIds.length;
      tabIds.splice(at, 0, id);
      return { ...pane, tabIds, activeTabId: activate ? id : pane.activeTabId };
    })
  );
}

export function removeTab(node, tabId) {
  const id = String(tabId);
  return normalize(
    mapPanes(node, (pane) => {
      if (!pane.tabIds.includes(id)) return pane;
      const index = pane.tabIds.indexOf(id);
      const tabIds = pane.tabIds.filter((t) => t !== id);
      const activeTabId =
        pane.activeTabId === id
          ? tabIds[index] || tabIds[index - 1] || tabIds[0] || null
          : pane.activeTabId;
      return { ...pane, tabIds, activeTabId };
    })
  );
}

export function activateTab(node, paneId, tabId) {
  const id = String(tabId);
  return normalize(
    mapPanes(node, (pane) =>
      pane.id === paneId && pane.tabIds.includes(id) ? { ...pane, activeTabId: id } : pane
    )
  );
}

export function reorderTab(node, paneId, tabId, newIndex) {
  const id = String(tabId);
  return normalize(
    mapPanes(node, (pane) => {
      if (pane.id !== paneId || !pane.tabIds.includes(id)) return pane;
      const tabIds = pane.tabIds.filter((t) => t !== id);
      tabIds.splice(Math.max(0, Math.min(newIndex, tabIds.length)), 0, id);
      return { ...pane, tabIds };
    })
  );
}

// Split targetPaneId in `direction`, moving tabId into the new pane.
// The tab is removed from wherever it currently lives first, so splitting a
// pane with its own tab behaves correctly (and splitting a single-tab pane
// with that tab is a clean no-op after normalization).
export function splitWithTab(node, targetPaneId, direction, tabId) {
  const id = String(tabId);
  if (!node) {
    const pane = createPane([id], id);
    return { tree: pane, newPaneId: pane.id };
  }
  const stripped = mapPanes(node, (pane) => {
    if (!pane.tabIds.includes(id)) return pane;
    const tabIds = pane.tabIds.filter((t) => t !== id);
    const index = pane.tabIds.indexOf(id);
    const activeTabId =
      pane.activeTabId === id
        ? tabIds[index] || tabIds[index - 1] || tabIds[0] || null
        : pane.activeTabId;
    return { ...pane, tabIds, activeTabId };
  });

  const newPane = createPane([id], id);
  const tree = normalize(splitNode(stripped, targetPaneId, direction, newPane));
  return { tree, newPaneId: newPane.id };
}

function splitNode(node, paneId, direction, newPane) {
  if (!node) return newPane;
  if (node.type === 'pane') {
    if (node.id !== paneId) return node;
    return createSplit(direction, [node, newPane], [50, 50]);
  }
  return { ...node, children: node.children.map((c) => splitNode(c, paneId, direction, newPane)) };
}

export function setSplitSizes(node, splitId, sizes) {
  if (!node || node.type !== 'split' || !Array.isArray(sizes)) return node;
  if (node.id === splitId) {
    return sizes.length === node.children.length ? { ...node, sizes: [...sizes] } : node;
  }
  return { ...node, children: node.children.map((c) => setSplitSizes(c, splitId, sizes)) };
}
