// This file is the app's icon library — every small icon used throughout
// the interface (plus signs, folders, gear/settings, arrows, browser globe,
// terminal, file, window controls, etc.) is defined here as a tiny SVG
// drawing. SVG (Scalable Vector Graphics) describes a picture using shapes
// and lines rather than a grid of colored dots, which is why these icons
// stay crisp and sharp no matter how large or small they're displayed.
// "currentColor" means each icon automatically matches whatever text color
// is set on it by CSS, so the same icon can appear white, grey, or red
// depending on where it's used, without needing separate icon files.

// A plus/"+" sign, used for "add new" buttons (new tab, new agent, etc.).
export function PlusIcon({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12">
      <rect x="5.25" width="1.5" height="12" fill="currentColor" />
      <rect y="5.25" width="12" height="1.5" fill="currentColor" />
    </svg>
  );
}

// A folder with a small "+" inside it, for "create new folder" actions.
export function FolderPlusIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12">
      <path
        d="M1 3a1 1 0 0 1 1-1h2.5l1 1.2H10a1 1 0 0 1 1 1V9a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V3z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
      />
      <path d="M6 5.2v3M4.5 6.7h3" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

// An open folder icon, used for the "open a workspace folder" button.
export function FolderOpenIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12">
      <path
        d="M1 3a1 1 0 0 1 1-1h2.5l1 1.2H10a1 1 0 0 1 1 1v.8H4.5l-1 1.2H1V3z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
      />
      <path
        d="M1 5h3l1-1.2h6L9.8 9.5a1 1 0 0 1-.9.5H2.1a1 1 0 0 1-1-1.2L1.3 5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
      />
    </svg>
  );
}

// A small gear, the standard "settings/customize" icon.
export function GearIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12">
      <circle cx="6" cy="6" r="1.6" fill="none" stroke="currentColor" strokeWidth="1.1" />
      <path
        d="M6 0.7v1.7M6 9.6v1.7M11.3 6H9.6M2.4 6H0.7M9.6 2.4L8.4 3.6M3.6 8.4L2.4 9.6M9.6 9.6L8.4 8.4M3.6 3.6L2.4 2.4"
        stroke="currentColor"
        strokeWidth="1.1"
      />
    </svg>
  );
}

// A small right-pointing chevron/arrow, used as an expand/collapse
// indicator for tree rows — the "className" is used elsewhere to rotate it
// 90 degrees when the row is expanded, like a folder arrow flipping down.
export function ChevronIcon({ className }) {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" className={className}>
      <path
        d="M2.75 1.75L6.75 5L2.75 8.25"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// A plain closed folder icon (no plus sign), used to represent workspaces
// in the sidebar.
export function FolderIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12">
      <path
        d="M1 3a1 1 0 0 1 1-1h2.5l1 1.2H10a1 1 0 0 1 1 1V9a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V3z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
      />
    </svg>
  );
}

// A small speech-bubble-with-tail icon, representing a conversation thread.
export function ThreadIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12">
      <path
        d="M1.5 2.5h9v5.5h-4.8L3 10V8H1.5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// An "x" made of two crossed diagonal lines, used for delete/remove buttons.
export function DeleteIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10">
      <line
        x1="1.5"
        y1="1.5"
        x2="8.5"
        y2="8.5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <line
        x1="8.5"
        y1="1.5"
        x2="1.5"
        y2="8.5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Another "x" icon (slightly different style/weight than DeleteIcon),
// specifically used for the titlebar's window Close button.
export function CloseIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10">
      <line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" />
      <line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" />
    </svg>
  );
}

// A rectangle with a vertical divider line, representing a collapsible side
// panel — used for the sidebar show/hide toggle button.
export function PanelLeftIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14">
      <rect x="1" y="2" width="12" height="10" rx="1.5" fill="none" stroke="currentColor" />
      <line x1="5.5" y1="2" x2="5.5" y2="12" stroke="currentColor" />
    </svg>
  );
}

// A magnifying glass, the standard "search" icon.
export function SearchIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12">
      <circle cx="5" cy="5" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.1" />
      <path d="M7.5 7.5L10.5 10.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

// A globe icon, representing the "Browser" pane type.
export function BrowserIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12">
      <circle cx="6" cy="6" r="4.5" fill="none" stroke="currentColor" strokeWidth="1" />
      <ellipse cx="6" cy="6" rx="2" ry="4.5" fill="none" stroke="currentColor" strokeWidth="1" />
      <line x1="1.5" y1="6" x2="10.5" y2="6" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

// A little command-line window icon (a ">" prompt with a cursor line),
// representing the "Terminal" pane type.
export function TerminalIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12">
      <rect x="1" y="2" width="10" height="8" rx="1" fill="none" stroke="currentColor" strokeWidth="1" />
      <path d="M3 5l2 1-2 1" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="6" y1="7" x2="9" y2="7" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

// A page-with-folded-corner icon, representing a plain file (used both for
// the "Editor" pane type and for files in the Explorer tree).
export function FileIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12">
      <path
        d="M2 1.5h5l3 3V10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V2.5a1 1 0 0 1 1-1z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
      />
      <path d="M7 1.5v3h3" fill="none" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

// A single horizontal line, the standard "minimize window" icon.
export function MinimizeIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10">
      <rect width="10" height="1" y="4.5" fill="currentColor" />
    </svg>
  );
}

// An empty square outline, the standard "maximize window" icon.
export function MaximizeIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10">
      <rect x="0.5" y="0.5" width="9" height="9" fill="none" stroke="currentColor" />
    </svg>
  );
}
