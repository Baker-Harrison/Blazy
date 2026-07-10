import { useEffect, useRef, useState } from 'react';
import { CloseIcon, PlusIcon } from '../icons';
import { PANE_TYPES, paneIcon, paneLabel } from '../../lib/paneTypes';

// The row of tabs shown at the top of each pane — like the tab strip in a
// web browser, but for the app's own tabs (browser/terminal/editor).
// This file draws that strip, handles dragging tabs to reorder/move them,
// double-click-to-rename, right-click context menus, and the "+" button
// for adding a new tab.

// Whenever a floating menu (the tab context menu, or the "add tab"
// dropdown) is open, embedded browser panes need to be told to temporarily
// hide themselves — native browser views always render on TOP of regular
// web content, so without this, an open menu could get visually covered by
// a browser tab's page. This tiny reference counter tracks how many menus
// are currently open across the whole app, so overlays only get "turned
// off" once every menu that requested it has actually closed.
let overlayRefCount = 0;
function setBrowserOverlay(open) {
  overlayRefCount += open ? 1 : -1;
  if (overlayRefCount < 0) overlayRefCount = 0;
  window.browser?.setOverlayOpen(overlayRefCount > 0);
}

export default function TabBar({ pane, tabs, workspace }) {
  const { activateTab, closeTab, createTab, reorderTabInPane, moveTabToPane } = workspace;
  const paneId = pane.id;
  // The currently open right-click context menu, if any: which tab it's
  // for and where on screen to draw it.
  const [menu, setMenu] = useState(null); // { tabId, x, y }

  // Handles dropping a tab (dragged from ANOTHER pane) onto empty space in
  // this tab bar — moves it into this pane, appended at the end.
  const handleDrop = (e) => {
    e.preventDefault();
    const tabId = e.dataTransfer.getData('application/blazy-tab');
    const sourcePaneId = e.dataTransfer.getData('application/blazy-source-pane');
    if (!tabId || sourcePaneId === paneId) return;
    moveTabToPane(tabId, paneId);
  };

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      className="flex h-9 shrink-0 items-center gap-px bg-app border-b border-edge px-1"
    >
      <div
        className="scrollbar-none flex flex-1 items-center gap-px overflow-x-auto"
        onWheel={(e) => {
          // Lets you scroll the tab strip horizontally using a normal
          // vertical mouse wheel/trackpad scroll, the same convenience
          // most browsers offer when you have more tabs than fit on
          // screen.
          if (e.deltaY) e.currentTarget.scrollLeft += e.deltaY;
        }}
      >
        {tabs.map((tab, index) => (
          <DraggableTab
            key={tab.id}
            tab={tab}
            index={index}
            paneId={paneId}
            active={String(pane.activeTabId) === String(tab.id)}
            onActivate={() => activateTab(tab.id, paneId)}
            onClose={() => closeTab(tab.id)}
            onRename={(title) => workspace.renameTab(tab.id, title)}
            onContextMenu={(e) => {
              e.preventDefault();
              setMenu({ tabId: String(tab.id), x: e.clientX, y: e.clientY });
            }}
            onReorder={(tabId, newIndex) => reorderTabInPane(paneId, tabId, newIndex)}
            onMoveFromOtherPane={(tabId, insertIndex) =>
              moveTabToPane(tabId, paneId, insertIndex)
            }
          />
        ))}
      </div>
      <TabAddButton onSelect={(type) => createTab(type, paneLabel(type), {}, { paneId })} />
      {menu && (
        <TabContextMenu
          menu={menu}
          paneId={paneId}
          tabCount={tabs.length}
          workspace={workspace}
          onClose={() => setMenu(null)}
        />
      )}
    </div>
  );
}

// One draggable tab "chip" in the tab strip: shows an icon (or the site's
// favicon for browser tabs), the tab's title (double-click to rename it),
// and a small close button. Supports being dragged to reorder within the
// same pane, or dragged into a different pane entirely.
function DraggableTab({
  tab,
  index,
  paneId,
  active,
  onActivate,
  onClose,
  onRename,
  onContextMenu,
  onReorder,
  onMoveFromOtherPane,
}) {
  const Icon = paneIcon(tab.type);
  const ref = useRef(null);
  // Whether another tab is currently being dragged directly over this one
  // (used to draw a small highlight outline as a drop-target indicator).
  const [dragOver, setDragOver] = useState(false);
  // Whether this tab's label is currently being edited inline.
  const [renaming, setRenaming] = useState(false);

  // When a drag starts on this tab, attach the info other drop targets
  // will need: which tab it is, which pane it came from, and its current
  // position — using the browser's built-in drag-and-drop data transfer
  // mechanism (the same one used for dragging files, links, etc.).
  const handleDragStart = (e) => {
    e.dataTransfer.setData('application/blazy-tab', String(tab.id));
    e.dataTransfer.setData('application/blazy-source-pane', paneId);
    e.dataTransfer.setData('application/blazy-source-index', String(index));
    e.dataTransfer.effectAllowed = 'move';
  };

  // Handles another tab being dropped directly onto this one — either
  // reordering it within the same pane, or moving it in from a different
  // pane, landing just before or after this tab depending on which half of
  // it the drop happened on.
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const tabId = e.dataTransfer.getData('application/blazy-tab');
    const sourcePaneId = e.dataTransfer.getData('application/blazy-source-pane');
    if (!tabId) return;

    // Dropping on the left half of this tab inserts before it; dropping on
    // the right half inserts after it — the standard "which side did you
    // drop on" convention for reordering draggable lists.
    let insertIndex = index;
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      insertIndex = e.clientX < rect.left + rect.width / 2 ? index : index + 1;
    }

    if (sourcePaneId === paneId) {
      const sourceIndex = Number(e.dataTransfer.getData('application/blazy-source-index'));
      // If the tab is moving rightward past its own original position, the
      // removal of the tab from its old spot shifts every index after it
      // down by one — this adjustment accounts for that so it lands
      // exactly where visually expected.
      onReorder(tabId, sourceIndex < insertIndex ? insertIndex - 1 : insertIndex);
    } else {
      onMoveFromOtherPane(tabId, insertIndex);
    }
  };

  return (
    <div
      ref={ref}
      draggable={!renaming}
      onDragStart={handleDragStart}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={onActivate}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setRenaming(true);
      }}
      onAuxClick={(e) => {
        // Middle-click (mouse button 1) closes the tab, the same shortcut
        // most browsers support for quickly closing tabs.
        if (e.button === 1) {
          e.preventDefault();
          onClose();
        }
      }}
      onContextMenu={onContextMenu}
      title={renaming ? undefined : `${tab.title} — double-click to rename`}
      className={`group relative flex h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-2 text-[12px] transition-colors ${
        active ? 'bg-surface text-ink' : 'text-ink-dim hover:bg-hover hover:text-ink'
      } ${dragOver ? 'outline outline-1 outline-ink-dim/50' : ''}`}
    >
      {/* Browser tabs show the actual website's favicon if one has loaded;
          every other tab type (and browser tabs without a favicon yet)
          shows its generic type icon instead. */}
      {tab.type === 'browser' && tab.config?.favicon ? (
        <img
          src={tab.config.favicon}
          alt=""
          className="h-3.5 w-3.5 shrink-0 rounded-[2px]"
          draggable={false}
        />
      ) : (
        <Icon />
      )}
      {renaming ? (
        <TabRenameInput
          value={tab.title}
          onCommit={(title) => {
            setRenaming(false);
            if (title && title !== tab.title) onRename(title);
          }}
          onCancel={() => setRenaming(false)}
        />
      ) : (
        <span className="max-w-[120px] truncate">{tab.title}</span>
      )}
      <button
        type="button"
        aria-label={`Close ${tab.title}`}
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className={`ml-1 flex h-3.5 w-3.5 items-center justify-center rounded text-ink-dim transition-opacity hover:bg-hover hover:text-ink ${
          active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
      >
        <CloseIcon />
      </button>
    </div>
  );
}

// The small inline text box shown while renaming a tab, following the same
// commit-on-Enter/blur, cancel-on-Escape pattern used elsewhere in the app
// (see EditableLabel.jsx for the sidebar's equivalent).
function TabRenameInput({ value, onCommit, onCancel }) {
  const [draft, setDraft] = useState(value);
  const cancelled = useRef(false);

  return (
    <input
      type="text"
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onFocus={(e) => e.target.select()}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Enter') e.currentTarget.blur();
        if (e.key === 'Escape') {
          cancelled.current = true;
          e.currentTarget.blur();
        }
      }}
      onBlur={() => {
        if (cancelled.current) onCancel();
        else onCommit(draft.trim());
      }}
      className="w-[110px] rounded border border-edge bg-app px-1 py-px text-[12px] text-ink focus:outline-none"
    />
  );
}

// The right-click menu for a tab, offering Duplicate, Split right/down
// (create a new split section with a copy or move of this tab), and
// various close actions.
function TabContextMenu({ menu, paneId, tabCount, workspace, onClose }) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ x: menu.x, y: menu.y });

  // While this menu is open, tell any browser panes to hide themselves so
  // the menu isn't visually covered (see setBrowserOverlay above).
  useEffect(() => {
    setBrowserOverlay(true);
    return () => setBrowserOverlay(false);
  }, []);

  // Keep the menu on-screen.
  // In plain terms: if the menu was about to open partly off the edge of
  // the window (e.g. you right-clicked a tab near the right edge), nudge
  // its position back so the whole menu stays visible instead of getting
  // cut off.
  useEffect(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setPos({
      x: Math.min(menu.x, window.innerWidth - rect.width - 4),
      y: Math.min(menu.y, window.innerHeight - rect.height - 4),
    });
  }, [menu]);

  // Pressing Escape closes the menu, matching standard menu behavior.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Wraps a menu action so that clicking any item both closes the menu AND
  // runs the action, instead of having to remember to do both every time.
  const run = (fn) => () => {
    onClose();
    fn();
  };

  const items = [
    { label: 'Duplicate', action: run(() => workspace.duplicateTab(menu.tabId)) },
    {
      label: 'Split right',
      action: run(() => workspace.splitPane(paneId, 'horizontal', menu.tabId)),
      // "Split" only makes sense if there's more than one tab in the pane
      // — splitting a pane that only has one tab wouldn't leave anything
      // behind in the original half.
      disabled: tabCount < 2,
    },
    {
      label: 'Split down',
      action: run(() => workspace.splitPane(paneId, 'vertical', menu.tabId)),
      disabled: tabCount < 2,
    },
    { divider: true },
    { label: 'Close', action: run(() => workspace.closeTab(menu.tabId)) },
    {
      label: 'Close others',
      action: run(() => workspace.closeOtherTabs(paneId, menu.tabId)),
      disabled: tabCount < 2,
    },
    { label: 'Close pane', action: run(() => workspace.closePane(paneId)) },
  ];

  return (
    <>
      {/* An invisible full-screen overlay that closes the menu when you
          click (or right-click) anywhere outside of it — the standard way
          context menus dismiss themselves. */}
      <div className="fixed inset-0 z-30" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }} />
      <div
        ref={ref}
        style={{ left: pos.x, top: pos.y }}
        className="fixed z-40 min-w-[150px] rounded-md border border-edge bg-surface py-1 shadow-lg"
      >
        {items.map((item, i) =>
          item.divider ? (
            <div key={i} className="my-1 border-t border-edge" />
          ) : (
            <button
              key={item.label}
              type="button"
              disabled={item.disabled}
              onClick={item.action}
              className="flex w-full items-center px-3 py-1.5 text-left text-[12px] text-ink hover:bg-hover disabled:cursor-default disabled:text-ink-dim/50 disabled:hover:bg-transparent"
            >
              {item.label}
            </button>
          )
        )}
      </div>
    </>
  );
}

// The "+" button on the tab strip, which opens a small dropdown letting you
// pick which type of tab (Browser/Terminal/Editor) to add.
function TabAddButton({ onSelect }) {
  const [open, setOpen] = useState(false);

  // While the dropdown is open, hide browser panes so they don't render
  // over it (same overlay mechanism used by the context menu above).
  useEffect(() => {
    if (open) setBrowserOverlay(true);
    return () => {
      if (open) setBrowserOverlay(false);
    };
  }, [open]);

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        title="New tab"
        onClick={() => setOpen((v) => !v)}
        className="flex h-7 w-7 items-center justify-center rounded text-ink-dim hover:bg-hover hover:text-ink"
      >
        <PlusIcon />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-40 min-w-[140px] rounded-md border border-edge bg-surface py-1 shadow-lg">
            {PANE_TYPES.map(({ type, label, icon: Icon }) => (
              <button
                key={type}
                type="button"
                onClick={() => {
                  onSelect(type);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] text-ink hover:bg-hover"
              >
                <Icon />
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
