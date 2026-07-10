import { useRef, useState } from 'react';

/**
 * Truncated label that turns into an inline rename input on double-click.
 * Enter or blur commits (non-empty, changed values only); Escape cancels.
 */
export default function EditableLabel({ value, onRename }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const cancelled = useRef(false);

  if (!editing) {
    return (
      <span
        className="min-w-0 flex-1 truncate text-[13px]"
        title="Double-click to rename"
        onDoubleClick={(e) => {
          e.stopPropagation();
          cancelled.current = false;
          setDraft(value);
          setEditing(true);
        }}
      >
        {value}
      </span>
    );
  }

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
        if (e.key === 'Enter') {
          e.preventDefault();
          e.currentTarget.blur();
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          cancelled.current = true;
          e.currentTarget.blur();
        }
      }}
      onBlur={() => {
        const next = draft.trim();
        if (!cancelled.current && next && next !== value) onRename(next);
        setEditing(false);
      }}
      className="min-w-0 flex-1 rounded border border-edge bg-app px-[5px] py-px text-[13px] text-white focus:border-[#4a505c] focus:outline-none"
    />
  );
}
