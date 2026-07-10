import { useEffect } from 'react';
import { useWorkspace } from '../../hooks/useWorkspace';
import { paneLabel } from '../../lib/paneTypes';
import EmptyWorkspace from './EmptyWorkspace';
import SplitLayout from './SplitLayout';

export default function WorkspaceView({ workspace }) {
  const workspaceState = useWorkspace(workspace?.id);
  const { ready, layout } = workspaceState;
  const state = { ...workspaceState, workspace };

  // Tab keyboard shortcuts, scoped to the focused pane:
  //   Ctrl+T new chat tab · Ctrl+W close active tab · Ctrl+(Shift+)Tab cycle
  useEffect(() => {
    if (!workspace) return undefined;
    const onKeyDown = (e) => {
      if (!e.ctrlKey || e.altKey) return;
      if (e.key === 'Tab') {
        e.preventDefault();
        workspaceState.cycleTab(e.shiftKey ? -1 : 1);
      } else if (e.key.toLowerCase() === 'w' && !e.shiftKey) {
        e.preventDefault();
        if (workspaceState.activeTabId) workspaceState.closeTab(workspaceState.activeTabId);
      } else if (e.key.toLowerCase() === 't' && !e.shiftKey) {
        e.preventDefault();
        workspaceState.createTab('chat', paneLabel('chat'));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [workspace, workspaceState]);

  if (!workspace) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 select-none">
        <span className="text-[26px] font-light text-ink">Blazy</span>
        <span className="text-[13px] text-ink-dim">Select or create a workspace to get started.</span>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="flex flex-1 items-center justify-center text-[13px] text-ink-dim">
        Loading workspace…
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
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
