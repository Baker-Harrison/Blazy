import { useEffect, useRef } from 'react';
import { DeleteIcon, SearchIcon } from './icons';

export default function SidebarSearch({ query, onChange, onClose }) {
  const inputRef = useRef(null);

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
            if (e.key === 'Escape') {
              e.preventDefault();
              onClose();
            }
          }}
          className="min-w-0 flex-1 bg-transparent text-[13px] text-ink placeholder:text-ink-dim focus:outline-none"
        />
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
