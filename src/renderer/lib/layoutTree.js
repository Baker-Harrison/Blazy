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
//
// In plain terms: this file is the "brain" behind the app's split-pane
// layout system (the ability to divide a workspace into multiple resizable
// sections, like splitting a window into quadrants). The layout is stored
// as a tree — a "pane" is one section holding some tabs, and a "split" is
// a section that's been divided into two or more smaller panes/splits
// side-by-side or stacked. Every function here takes a tree (plus some
// change to make) and hands back a brand NEW tree with that change applied
// — none of these functions modify the tree you give them, which is a
// common and safer pattern in React apps (it makes it easy to tell "did
// anything actually change?").
//
// "Pure" (in the very first line of this file) means these functions never
// have side effects — they don't save to a database, talk to the network,
// or change anything outside of what they return. Given the same inputs,
// they always produce the same output.

// Generates a short, (extremely likely) unique id for a new pane or split,
// combining the current time with an ever-increasing counter so that even
// two ids created in the same millisecond don't collide.
let idCounter = 0;
function newId(prefix) {
  return `${prefix}-${Date.now()}-${++idCounter}`;
}

// Creates a new "pane" node — a single section holding one or more tabs.
export function createPane(tabIds = [], activeTabId = null) {
  const ids = tabIds.map(String);
  return {
    id: newId('pane'),
    type: 'pane',
    tabIds: ids,
    // If no active tab was specified, default to the first one in the list
    // (or null if there are no tabs at all).
    activeTabId: activeTabId != null ? String(activeTabId) : ids[0] || null,
  };
}

// Creates a new "split" node — a section divided into multiple
// panes/splits, arranged either side-by-side ("horizontal") or stacked
// ("vertical"), with "sizes" recording what percentage of the space each
// child takes up.
export function createSplit(direction, children, sizes) {
  return { id: newId('split'), type: 'split', direction, children, sizes };
}

// --- queries ---------------------------------------------------------------
// (These functions just look things up in the tree — they don't change
// anything.)

// Searches the whole tree for the pane with a specific id.
export function findPane(node, paneId) {
  if (!node) return null;
  if (node.type === 'pane') return node.id === paneId ? node : null;
  for (const child of node.children) {
    const found = findPane(child, paneId);
    if (found) return found;
  }
  return null;
}

// Finds whichever pane happens to be first in the tree — used as a
// fallback destination when we need "some pane" but don't care exactly
// which one (e.g. the very first tab ever opened in an empty workspace).
export function findFirstPane(node) {
  if (!node) return null;
  if (node.type === 'pane') return node;
  for (const child of node.children) {
    const found = findFirstPane(child);
    if (found) return found;
  }
  return null;
}

// Finds whichever pane currently contains a specific tab.
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

// Walks the whole tree and collects every pane into a flat list — useful
// when you need to loop over "every pane in the workspace" without caring
// about the split structure around them.
export function collectPanes(node, out = []) {
  if (!node) return out;
  if (node.type === 'pane') out.push(node);
  else node.children.forEach((child) => collectPanes(child, out));
  return out;
}

// Collects every tab id across every pane in the tree, into one flat list.
export function collectTabIds(node) {
  return collectPanes(node).flatMap((pane) => pane.tabIds);
}

// --- normalization ----------------------------------------------------------
// "Normalizing" a tree means cleaning it up so it always follows the rules
// listed at the top of this file — for example, removing panes that ended
// up with zero tabs in them, or collapsing unnecessary nested splits. Every
// function below that changes the tree runs its result through normalize()
// before returning it, so the rest of the app can always trust the tree is
// in a valid, tidy shape.

export function normalize(node) {
  const result = normalizeNode(node);
  return result;
}

function normalizeNode(node) {
  if (!node) return null;

  if (node.type === 'pane') {
    // A pane with no tabs left in it serves no purpose — remove it
    // entirely (returning null) rather than leaving an empty section on
    // screen.
    if (node.tabIds.length === 0) return null;
    // Make sure the "active" (currently shown) tab is actually one of this
    // pane's own tabs — if it isn't (e.g. that tab was moved elsewhere),
    // fall back to the first tab instead.
    const activeTabId = node.tabIds.includes(node.activeTabId)
      ? node.activeTabId
      : node.tabIds[0];
    return activeTabId === node.activeTabId ? node : { ...node, activeTabId };
  }

  if (node.type !== 'split') return null;

  // Normalize children, dropping the ones that collapsed to nothing and
  // flattening nested splits of the same direction into this one.
  //
  // In plain terms: if this split contains a CHILD split that goes the
  // same direction (e.g. a horizontal split inside another horizontal
  // split), there's no visible difference between that and just having
  // more items directly in the outer split — so we "flatten" it, merging
  // the inner split's children straight into this one and recalculating
  // their sizes proportionally, to avoid unnecessarily deep, redundant
  // nesting.
  const children = [];
  const sizes = [];
  node.children.forEach((rawChild, index) => {
    const child = normalizeNode(rawChild);
    if (!child) return; // This child collapsed to nothing — skip it.
    const size = node.sizes?.[index] ?? 100 / node.children.length;
    if (child.type === 'split' && child.direction === node.direction) {
      const innerTotal = child.sizes.reduce((a, b) => a + b, 0) || 1;
      child.children.forEach((grandchild, i) => {
        children.push(grandchild);
        // Scale each flattened grandchild's size proportionally, so the
        // combined sizes still make sense relative to the outer split's
        // own share of space.
        sizes.push((size * child.sizes[i]) / innerTotal);
      });
    } else {
      children.push(child);
      sizes.push(size);
    }
  });

  // No children left at all — the whole split collapses to nothing.
  if (children.length === 0) return null;
  // Only one child left — a "split" with just one section isn't really a
  // split anymore, so just return that one child directly instead.
  if (children.length === 1) return children[0];

  // Rescale all the sizes so they add up to exactly 100 (percent), in case
  // some children were dropped or merged above and the numbers no longer
  // sum correctly.
  const total = sizes.reduce((a, b) => a + b, 0) || 1;
  return {
    ...node,
    children,
    sizes: sizes.map((s) => (s * 100) / total),
  };
}

// Drop tab ids that don't exist anymore and add tabs missing from the layout
// to the first pane, so DB and layout can never drift apart.
//
// In plain terms: this is a safety-net "sync" function. The list of tabs
// saved in the database is the real source of truth; this function makes
// sure the on-screen layout tree always matches it exactly — removing any
// tab from the layout that's no longer in the database, and making sure
// any tab that IS in the database but somehow missing from the layout gets
// added back in (into the very first pane), so nothing ever silently
// disappears or gets "orphaned."
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
  // If the whole tree collapsed to nothing (e.g. this was the very first
  // tab ever), just create a fresh single pane containing the orphaned
  // tabs.
  if (!normalized) return createPane(orphans, orphans[0]);
  const first = findFirstPane(normalized);
  return normalize(
    mapPanes(normalized, (pane) =>
      pane.id === first.id ? { ...pane, tabIds: [...pane.tabIds, ...orphans] } : pane
    )
  );
}

// A small helper that applies a transformation function to every PANE in
// the tree (leaving splits' own structure alone), similar to how
// Array.prototype.map transforms every item in a list. Used throughout
// this file to make targeted changes to panes without having to manually
// re-walk the whole tree each time.
function mapPanes(node, fn) {
  if (!node) return null;
  if (node.type === 'pane') return fn(node);
  return { ...node, children: node.children.map((child) => mapPanes(child, fn)) };
}

// --- mutations (all return a normalized tree) --------------------------------
// Everything below this point represents an actual user action — adding a
// tab, closing one, switching to it, reordering it, splitting a pane, or
// resizing a split — translated into "given the old tree, here's the new
// tree after that action."

// Adds a tab into a specific pane (or the first available pane if that one
// doesn't exist), optionally making it the active/visible tab, and
// optionally inserting it at a specific position instead of at the end.
export function addTab(node, paneId, tabId, { activate = true, insertIndex } = {}) {
  const id = String(tabId);
  // No layout exists yet at all — this is the very first tab, so just
  // create a brand-new single pane containing it.
  if (!node) return createPane([id], id);

  const target = findPane(node, paneId) ? paneId : findFirstPane(node)?.id;
  return normalize(
    mapPanes(node, (pane) => {
      if (pane.id !== target) return pane;
      if (pane.tabIds.includes(id)) {
        // This tab is already in this pane — just switch to it if
        // requested, no need to add a duplicate.
        return activate ? { ...pane, activeTabId: id } : pane;
      }
      const tabIds = [...pane.tabIds];
      const at = insertIndex != null ? Math.max(0, Math.min(insertIndex, tabIds.length)) : tabIds.length;
      tabIds.splice(at, 0, id);
      return { ...pane, tabIds, activeTabId: activate ? id : pane.activeTabId };
    })
  );
}

// Removes a tab from wherever it currently lives in the tree (closing it).
// If the closed tab was the active one in its pane, picks a sensible
// replacement to show instead (the tab that took its place, or the one
// before it, or whatever's first).
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

// Switches which tab is the visible/active one within a specific pane.
export function activateTab(node, paneId, tabId) {
  const id = String(tabId);
  return normalize(
    mapPanes(node, (pane) =>
      pane.id === paneId && pane.tabIds.includes(id) ? { ...pane, activeTabId: id } : pane
    )
  );
}

// Moves a tab to a new position within the SAME pane's tab strip (used
// when dragging a tab left/right to reorder it, like reordering browser
// tabs).
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
//
// In plain terms: this is what happens when you drag a tab to the edge of
// a pane to create a new split section (see PaneContainer.jsx's drag/drop
// handling). It takes the tab OUT of wherever it currently is, creates a
// brand new 50/50 split at the target pane's location, and puts the tab
// into the new half.
export function splitWithTab(node, targetPaneId, direction, tabId) {
  const id = String(tabId);
  if (!node) {
    const pane = createPane([id], id);
    return { tree: pane, newPaneId: pane.id };
  }
  // First, remove the tab from wherever it currently lives (it might
  // already be inside the very pane we're about to split).
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

// Finds the target pane inside the tree and replaces it with a new split
// containing the original pane and the new pane, each getting 50% of the
// space.
function splitNode(node, paneId, direction, newPane) {
  if (!node) return newPane;
  if (node.type === 'pane') {
    if (node.id !== paneId) return node;
    return createSplit(direction, [node, newPane], [50, 50]);
  }
  return { ...node, children: node.children.map((c) => splitNode(c, paneId, direction, newPane)) };
}

// Updates the saved percentage sizes of a specific split's children —
// called when the user drags a divider between two panes to resize them.
export function setSplitSizes(node, splitId, sizes) {
  if (!node || node.type !== 'split' || !Array.isArray(sizes)) return node;
  if (node.id === splitId) {
    // Only accept the new sizes if there's exactly one size per child —
    // otherwise silently ignore the (presumably invalid) update.
    return sizes.length === node.children.length ? { ...node, sizes: [...sizes] } : node;
  }
  return { ...node, children: node.children.map((c) => setSplitSizes(c, splitId, sizes)) };
}
