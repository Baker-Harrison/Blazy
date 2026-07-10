import { PANE_TYPES } from '../../lib/paneTypes';

// This is what you see when you open a workspace that doesn't have any
// panes (tabs) in it yet — an empty state screen, similar to how a new,
// empty folder might show "This folder is empty" with a button to add
// something. It shows a friendly message plus one button for each type of
// pane you could add (Browser, Terminal, Editor), so you can get started
// with a single click.
export default function EmptyWorkspace({ workspace }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 select-none">
      <span className="text-[20px] font-light text-ink">This workspace is empty</span>
      <span className="text-[13px] text-ink-dim">Add your first pane to get started.</span>
      <div className="flex gap-2">
        {/* Loop over every known pane type and draw one button per type.
            Clicking a button tells the workspace to create a new tab of
            that type (e.g. clicking "Terminal" opens a new terminal tab). */}
        {PANE_TYPES.map(({ type, label, icon: Icon }) => (
          <button
            key={type}
            type="button"
            onClick={() => workspace.createTab(type, label)}
            className="flex items-center gap-2 rounded-md border border-edge bg-surface px-3 py-2 text-[13px] text-ink transition-colors hover:bg-hover"
          >
            <Icon />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
