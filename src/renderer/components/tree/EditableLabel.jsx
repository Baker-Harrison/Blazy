import { useRef, useState } from 'react';

/**
 * Truncated label that turns into an inline rename input on double-click.
 * Enter or blur commits (non-empty, changed values only); Escape cancels.
 *
 * In plain terms: this shows a piece of text (like a workspace or file
 * name). Double-click it and it turns into an editable text box right in
 * place — the same "rename in place" behavior you get double-clicking a
 * file name in File Explorer or Finder. Press Enter (or just click away) to
 * save your change, or press Escape to back out without saving.
 *
 * Props:
 * - value: the current name to display.
 * - onRename: called with the new name once the user finishes editing and
 *   the new name is valid (not empty, and actually different).
 */
export default function EditableLabel({ value, onRename }) {
  // Whether we're currently showing the text box (true) or just the plain
  // label (false).
  const [editing, setEditing] = useState(false);
  // The text currently typed into the box while editing — kept separate
  // from "value" so we don't change the real name until the user commits.
  const [draft, setDraft] = useState(value);
  // Tracks whether the user pressed Escape to cancel, so that when the box
  // loses focus right afterward we know NOT to save the (abandoned) draft.
  const cancelled = useRef(false);

  // Not currently editing: just show the name as plain, truncated text.
  if (!editing) {
    return (
      <span
        className="min-w-0 flex-1 truncate text-[13px]"
        title="Double-click to rename"
        onDoubleClick={(e) => {
          // Stop the double-click from also triggering other click
          // behaviors on parent elements (like selecting/opening the item).
          e.stopPropagation();
          cancelled.current = false;
          setDraft(value); // Start editing from the current real name.
          setEditing(true);
        }}
      >
        {value}
      </span>
    );
  }

  // Currently editing: show a text input pre-filled with the current name,
  // fully selected so typing immediately replaces it (similar to how
  // renaming a file in most file browsers auto-selects the whole name).
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
        // Enter confirms the edit — we do this by simply removing focus
        // from the box (blurring it), which triggers the "onBlur" logic
        // below that actually saves the change.
        if (e.key === 'Enter') {
          e.preventDefault();
          e.currentTarget.blur();
        }
        // Escape cancels the edit instead of saving it.
        if (e.key === 'Escape') {
          e.preventDefault();
          cancelled.current = true;
          e.currentTarget.blur();
        }
      }}
      onBlur={() => {
        // Whenever the box loses focus (either by pressing Enter, clicking
        // elsewhere, or Escape), decide whether to actually save the new
        // name. We only save if: the user didn't cancel, the new text
        // isn't just blank/whitespace, and it's actually different from
        // the original name (no point "renaming" something to the same
        // name it already had).
        const next = draft.trim();
        if (!cancelled.current && next && next !== value) onRename(next);
        setEditing(false);
      }}
      className="min-w-0 flex-1 rounded border border-edge bg-app px-[5px] py-px text-[13px] text-white focus:border-[#4a505c] focus:outline-none"
    />
  );
}
