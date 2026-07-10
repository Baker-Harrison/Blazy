import { PANE_TYPES } from '../../lib/paneTypes';

export default function EmptyWorkspace({ workspace }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 select-none">
      <span className="text-[20px] font-light text-ink">This workspace is empty</span>
      <span className="text-[13px] text-ink-dim">Add your first pane to get started.</span>
      <div className="flex gap-2">
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
