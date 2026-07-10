/** Small square icon-only button used in section headers and tree-row hover actions. */
// A reusable small square button that shows just an icon (no text label),
// used all over the sidebar for things like "delete," "open folder," and
// other quick actions. Having one shared component keeps every small icon
// button in the app looking and behaving the same way.
export default function IconButton({ label, danger = false, onClick, className = '', children }) {
  return (
    <button
      type="button"
      // "label" doubles as both the accessible name (read by screen
      // readers) and the tooltip text shown on hover.
      aria-label={label}
      title={label}
      onClick={(e) => {
        // Stops the click from also triggering whatever click behavior the
        // surrounding row has (like selecting a workspace) — clicking the
        // delete icon, for example, should only delete, not also select.
        e.stopPropagation();
        onClick?.(e);
      }}
      className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded text-ink-dim transition-all duration-100 hover:text-white active:scale-95 ${
        danger ? 'hover:bg-danger' : 'hover:bg-white/10'
      } focus:outline-none focus-visible:ring-1 focus-visible:ring-white/30 ${className}`}
    >
      {children}
    </button>
  );
}
