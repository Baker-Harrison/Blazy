import IconButton from '../IconButton';
import { ChevronIcon } from '../icons';
import EditableLabel from './EditableLabel';

/**
 * Shared shell for workspace / thread rows: hover + active styling,
 * optional collapse toggle and icon, inline-renamable label, right-aligned
 * meta text (e.g. a timestamp) that gives way to hover actions.
 */
export default function TreeRow({
  label,
  active = false,
  indentClass = 'pl-1.5',
  icon = null,
  collapsed,
  onToggle,
  onSelect,
  onRename,
  meta,
  actions = [],
}) {
  return (
    <div
      onClick={onSelect}
      data-active={active ? 'true' : undefined}
      className={`group relative flex h-7 cursor-pointer items-center gap-1.5 rounded-md pr-1.5 text-[13px] transition-colors duration-100 hover:bg-hover hover:text-white ${
        active ? 'bg-hover text-white' : 'text-ink-dim'
      } ${indentClass}`}
    >
      {onToggle && (
        <button
          type="button"
          aria-label="Toggle"
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-ink-dim transition-colors duration-100 hover:bg-white/10 hover:text-white focus:outline-none"
        >
          <ChevronIcon
            className={`origin-center transition-transform duration-150 ease-out ${
              collapsed ? 'rotate-0' : 'rotate-90'
            }`}
          />
        </button>
      )}
      {icon && <span className="shrink-0 opacity-85">{icon}</span>}
      <EditableLabel value={label} onRename={onRename} />
      {meta && (
        <span className="shrink-0 text-[11px] tabular-nums text-ink-dim transition-opacity duration-100 group-hover:hidden group-data-[active]:hidden">
          {meta}
        </span>
      )}
      {actions.length > 0 && (
        <div className="ml-auto hidden shrink-0 items-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover:flex group-hover:opacity-100 group-data-[active]:flex group-data-[active]:opacity-100">
          {actions.map((action) => (
            <IconButton
              key={action.label}
              label={action.label}
              danger={action.danger}
              onClick={action.onClick}
            >
              {action.icon}
            </IconButton>
          ))}
        </div>
      )}
    </div>
  );
}
