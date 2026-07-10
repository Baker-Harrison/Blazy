/** Small square icon-only button used in section headers and tree-row hover actions. */
export default function IconButton({ label, danger = false, onClick, className = '', children }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={(e) => {
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
