import IconButton from '../IconButton';
import { ChevronIcon } from '../icons';
import EditableLabel from './EditableLabel';

/**
 * Shared shell for workspace / thread rows: hover + active styling,
 * optional collapse toggle and icon, inline-renamable label, right-aligned
 * meta text (e.g. a timestamp) that gives way to hover actions.
 *
 * In plain terms: this is one reusable "row" building block used to build
 * both the workspace list and the conversation-thread list in the sidebar,
 * so both look and behave consistently instead of each having their own
 * separately-coded row. It's like a template for a single list item.
 *
 * Props:
 * - label: the text shown for this row (name of the workspace/thread).
 * - active: true if this row is the one currently selected/highlighted.
 * - indentClass: extra left padding, used to visually nest rows (e.g.
 *   threads indented under their parent workspace).
 * - icon: a small icon shown before the label.
 * - collapsed / onToggle: if provided, shows an expand/collapse arrow (for
 *   rows that can be expanded to reveal child rows underneath them).
 * - onSelect: called when the row itself is clicked.
 * - onRename: called with a new name when the user renames this row.
 * - meta: small extra text shown on the right (e.g. "3d" for "3 days ago"),
 *   which automatically hides itself and gets replaced by the hover actions
 *   below when you mouse over the row.
 * - actions: a list of small icon buttons (like Delete) that appear only
 *   when hovering over the row or when it's the active/selected row.
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
      {/* The little expand/collapse arrow, only shown if this row is
          collapsible (i.e. an onToggle function was actually passed in). */}
      {onToggle && (
        <button
          type="button"
          aria-label="Toggle"
          onClick={(e) => {
            // Stop this click from also "selecting" the row underneath it —
            // clicking the arrow should only expand/collapse, not navigate.
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
      {/* The name itself, which becomes an editable text box on
          double-click (see EditableLabel.jsx for how that works). */}
      <EditableLabel value={label} onRename={onRename} />
      {/* Small right-aligned info text (like a timestamp), which
          automatically disappears when you hover the row or when the row
          is active, making room for the action buttons to appear instead. */}
      {meta && (
        <span className="shrink-0 text-[11px] tabular-nums text-ink-dim transition-opacity duration-100 group-hover:hidden group-data-[active]:hidden">
          {meta}
        </span>
      )}
      {/* The hover-only action buttons (like a trash-can icon to delete). */}
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
