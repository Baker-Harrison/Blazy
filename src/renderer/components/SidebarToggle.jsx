import { PanelLeftIcon } from './icons';

/** Panel toggle for the sidebar; lives in the sidebar strip when open and in the titlebar when collapsed. */
export default function SidebarToggle({ open, onToggle }) {
  return (
    <button
      type="button"
      aria-label={open ? 'Collapse sidebar' : 'Open sidebar'}
      title={open ? 'Collapse sidebar' : 'Open sidebar'}
      onClick={onToggle}
      className="flex h-6 w-6 items-center justify-center rounded-md text-ink-dim transition-colors duration-100 hover:bg-hover hover:text-white [-webkit-app-region:no-drag]"
    >
      <PanelLeftIcon />
    </button>
  );
}
