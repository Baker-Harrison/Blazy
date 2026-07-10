import { useEffect, useRef } from 'react';
import { DeleteIcon, SearchIcon } from './icons';

// The little search box that appears in the sidebar so you can filter your
// list of chat threads/workspaces by typing part of their name — similar to
// the search bar at the top of your phone's contacts or messages app.
//
// Props:
// - query: the text currently typed into the search box.
// - onChange: called with the new text every time you type a character.
// - onClose: called when you want to close/cancel the search (e.g. by
//   pressing Escape).
export default function SidebarSearch({ query, onChange, onClose }) {
  // A reference to the actual <input> element on screen, so we can tell it
  // to grab keyboard focus programmatically (like clicking into it for the
  // user automatically).
  const inputRef = useRef(null);

  // As soon as this search box appears, automatically put the cursor in it
  // so the user can start typing right away without having to click first.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="px-2 pb-2">
      <div className="flex items-center gap-1.5 rounded-md border border-edge bg-app px-2 py-1 transition-colors duration-100 focus-within:border-[#4a505c]">
        <span className="shrink-0 text-ink-dim">
          <SearchIcon />
        </span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          placeholder="Search threads…"
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            // Pressing the Escape key is a shortcut to close the search box
            // entirely, the same way Escape closes a lot of search bars and
            // dialogs across most apps.
            if (e.key === 'Escape') {
              e.preventDefault();
              onClose();
            }
          }}
          className="min-w-0 flex-1 bg-transparent text-[13px] text-ink placeholder:text-ink-dim focus:outline-none"
        />
        {/* Only show the little "x" clear button once there's actually
            something typed in the box — no point showing a clear button on
            an already-empty search field. */}
        {query && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              onChange('');
              inputRef.current?.focus();
            }}
            className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-ink-dim hover:text-white"
          >
            <DeleteIcon />
          </button>
        )}
      </div>
    </div>
  );
}
