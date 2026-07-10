import { useRef, useState } from 'react';
import PaneContent from './PaneContent';
import TabBar from './TabBar';

export default function PaneContainer({ pane, workspace }) {
  const { tabsById, focusPane, focusedPaneId, moveTabToPane, splitPane, duplicateTab } = workspace;
  const { id, activeTabId, tabIds } = pane;
  const containerRef = useRef(null);
  const [dropRegion, setDropRegion] = useState(null);
  const isFocused = focusedPaneId === id;

  const paneTabs = tabIds.map((tabId) => tabsById.get(String(tabId))).filter(Boolean);
  const activeTab = activeTabId ? tabsById.get(String(activeTabId)) : null;

  const regionFromEvent = (e) => {
    if (!containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const edge = 0.15;
    if (x < edge) return 'left';
    if (x > 1 - edge) return 'right';
    if (y < edge) return 'top';
    if (y > 1 - edge) return 'bottom';
    return 'center';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDropRegion(regionFromEvent(e));
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    const region = dropRegion;
    setDropRegion(null);

    const tabId = e.dataTransfer.getData('application/blazy-tab');
    const sourcePaneId = e.dataTransfer.getData('application/blazy-source-pane');
    if (!tabId) return;

    const isCopy = e.ctrlKey || e.altKey || e.metaKey;
    const splitting = region && region !== 'center';

    // Dropping a tab onto the middle of its own pane is a no-op.
    if (!splitting && !isCopy && sourcePaneId === id) return;

    const direction = splitting
      ? region === 'left' || region === 'right'
        ? 'horizontal'
        : 'vertical'
      : null;

    if (isCopy) {
      await duplicateTab(tabId, splitting ? { paneId: id, direction } : { paneId: id });
    } else if (splitting) {
      splitPane(id, direction, tabId);
    } else {
      moveTabToPane(tabId, id);
    }
  };

  return (
    <div
      ref={containerRef}
      onClick={() => {
        if (!isFocused) focusPane(id);
      }}
      className={`relative flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden ${
        isFocused ? 'ring-1 ring-inset ring-danger/40' : ''
      }`}
    >
      <TabBar pane={pane} tabs={paneTabs} workspace={workspace} />
      <div
        onDragOver={handleDragOver}
        onDragLeave={() => setDropRegion(null)}
        onDrop={handleDrop}
        className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
      >
        {/* All tabs stay mounted so their state (shell, page, editor) survives
            switching; inactive ones are hidden but keep their size. */}
        {paneTabs.map((t) => {
          const isActive = activeTab && String(t.id) === String(activeTab.id);
          return (
            <div
              key={t.id}
              className={`absolute inset-0 flex min-h-0 min-w-0 flex-col overflow-hidden ${
                isActive ? 'visible z-[1]' : 'invisible pointer-events-none'
              }`}
            >
              <PaneContent tab={t} workspace={workspace} />
            </div>
          );
        })}

        {dropRegion && <DropIndicator region={dropRegion} />}
      </div>
    </div>
  );
}

function DropIndicator({ region }) {
  const classes = {
    center: 'inset-0 bg-ink/5',
    left: 'left-0 top-0 bottom-0 w-1/2 bg-ink/10',
    right: 'right-0 top-0 bottom-0 w-1/2 bg-ink/10',
    top: 'left-0 right-0 top-0 h-1/2 bg-ink/10',
    bottom: 'left-0 right-0 bottom-0 h-1/2 bg-ink/10',
  };

  return (
    <div className={`pointer-events-none absolute z-20 ${classes[region]}`}>
      {region !== 'center' && (
        <div className="flex h-full w-full items-center justify-center">
          <div className="rounded-md border border-ink-dim bg-surface/80 px-2 py-1 text-[11px] text-ink">
            Split {region}
          </div>
        </div>
      )}
    </div>
  );
}
