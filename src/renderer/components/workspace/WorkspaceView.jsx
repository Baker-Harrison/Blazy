import { useEffect } from 'react';
import { useWorkspace } from '../../hooks/useWorkspace';
import { PANE_TYPES, paneLabel } from '../../lib/paneTypes';
import EmptyWorkspace from './EmptyWorkspace';
import SplitLayout from './SplitLayout';

// This is the big content area that fills most of the app window: whatever
// tabs/panes belong to the currently selected workspace. It also listens
// for a handful of keyboard shortcuts (like Ctrl+T for a new tab) while a
// workspace is open.
export default function WorkspaceView({ workspace }) {
  // Load all the live data/actions for this specific workspace (its tabs,
  // layout, etc.) — see useWorkspace.js for the details.
  const workspaceState = useWorkspace(workspace?.id);
  const { ready, layout } = workspaceState;
  // Combine the workspace's basic info (name, id, etc.) with all its live
  // state/actions into one object that gets passed down to child
  // components, so they don't need two separate props for "the workspace"
  // and "the workspace's current state."
  const state = { ...workspaceState, workspace };

  // Tab keyboard shortcuts, scoped to the focused pane:
  //   Ctrl+T new browser tab · Ctrl+W close active tab · Ctrl+(Shift+)Tab cycle
  //
  // In plain terms: this sets up a few familiar keyboard shortcuts, similar
  // to the ones in a web browser — Ctrl+T opens a new tab, Ctrl+W closes
  // the current one, and Ctrl+Tab / Ctrl+Shift+Tab jump between tabs.
  useEffect(() => {
    // If there's no workspace open, there's nothing to attach shortcuts to.
    if (!workspace) return undefined;
    const onKeyDown = (e) => {
      // Only react to Ctrl-held shortcuts, and ignore them if Alt is also
      // held (to avoid clashing with other OS-level shortcuts like Alt+Tab).
      if (!e.ctrlKey || e.altKey) return;
      if (e.key === 'Tab') {
        e.preventDefault();
        // Ctrl+Shift+Tab cycles backward (-1), plain Ctrl+Tab cycles
        // forward (+1) through the open tabs.
        workspaceState.cycleTab(e.shiftKey ? -1 : 1);
      } else if (e.key.toLowerCase() === 'w' && !e.shiftKey) {
        e.preventDefault();
        if (workspaceState.activeTabId) workspaceState.closeTab(workspaceState.activeTabId);
      } else if (e.key.toLowerCase() === 't' && !e.shiftKey) {
        e.preventDefault();
        const defaultType = PANE_TYPES[0].type;
        workspaceState.createTab(defaultType, paneLabel(defaultType));
      }
    };
    // Listen for key presses anywhere in the window (not just inside one
    // particular element), and make sure to remove that listener again
    // when this component goes away or the workspace changes, so we don't
    // end up with multiple overlapping shortcut handlers.
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [workspace, workspaceState]);

  // No workspace selected at all — show the app's welcome/empty screen.
  if (!workspace) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 select-none">
        <span className="text-[26px] font-light text-ink">Blazy</span>
        <span className="text-[13px] text-ink-dim">Select or create a workspace to get started.</span>
      </div>
    );
  }

  // A workspace is selected, but its data hasn't finished loading from disk
  // yet — show a brief loading message rather than a flash of empty content.
  if (!ready) {
    return (
      <div className="flex flex-1 items-center justify-center text-[13px] text-ink-dim">
        Loading workspace…
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      {/* If this workspace has a saved tab/split layout, draw it; otherwise
          this workspace has no tabs yet, so show the "add your first pane"
          empty state instead. */}
      {layout ? (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <SplitLayout node={layout} workspace={state} />
        </div>
      ) : (
        <EmptyWorkspace workspace={state} />
      )}
    </div>
  );
}
