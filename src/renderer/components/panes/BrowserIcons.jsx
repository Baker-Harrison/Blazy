// This file is just a collection of small icon components used inside the
// Browser pane's toolbar — back/forward arrows, refresh, a plus sign for a
// new tab, an "x" for close, a stop sign, a speaker (for "this tab is
// playing audio"), a globe (generic website icon), and a padlock (secure
// connection icon), similar to icons you'd see in Chrome or Edge's address
// bar and tab strip. Each one is drawn using SVG (Scalable Vector Graphics
// — a way of describing a picture with lines/shapes/paths instead of a
// grid of pixels, so it stays crisp at any size).

// A left-pointing chevron/arrow for "go back" — fades out (30% opacity)
// when "disabled" is true, i.e. when there's no earlier page to go back to.
export function BackIcon({ disabled }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" className={disabled ? 'opacity-30' : ''}>
      <path
        d="M9 2L4 7l5 5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// A right-pointing chevron/arrow for "go forward," same disabled behavior
// as BackIcon above.
export function ForwardIcon({ disabled }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" className={disabled ? 'opacity-30' : ''}>
      <path
        d="M5 2l5 5-5 5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// A circular arrow, the standard "reload this page" icon.
export function RefreshIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14">
      <path
        d="M7 1.5A5.5 5.5 0 0 1 12.5 7 5.5 5.5 0 0 1 7 12.5 5.5 5.5 0 0 1 1.5 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M1.5 7V3.5M1.5 3.5H5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// A simple "+" used for the "open a new tab" button.
export function PlusIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12">
      <path d="M6 1.5v9M1.5 6h9" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

// An "x" used for closing a tab.
export function CloseIcon() {
  return (
    <svg width="8" height="8" viewBox="0 0 8 8">
      <path d="M1 1l6 6M7 1L1 7" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

// A larger "x" used for the "stop loading this page" button, shown while a
// page is actively loading (replacing the refresh button, the same way
// browsers swap the refresh icon for a stop icon mid-load).
export function StopIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14">
      <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// A small speaker/audio icon, shown on a browser tab to indicate it's
// currently playing sound — like the little speaker icon Chrome shows on a
// tab playing a YouTube video.
export function AudioIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10">
      <path d="M1 3.5h1.8L5.5 1v8L2.8 6.5H1z" fill="currentColor" />
      <path d="M7 3a3 3 0 0 1 0 4" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

// A simple globe icon used as a generic placeholder favicon for websites
// that don't have their own icon loaded yet.
export function GlobeIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12">
      <circle cx="6" cy="6" r="4.5" fill="none" stroke="currentColor" strokeWidth="1" />
      <ellipse cx="6" cy="6" rx="2" ry="4.5" fill="none" stroke="currentColor" strokeWidth="1" />
      <path d="M1.5 6h9" fill="none" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

// A padlock icon, used to indicate a page was loaded over a secure (https)
// connection — the same lock icon shown in a browser's address bar.
export function LockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12">
      <rect x="1.5" y="5.5" width="9" height="5" rx="1" fill="none" stroke="currentColor" strokeWidth="1" />
      <path
        d="M3 5.5V3.5a3 3 0 0 1 6 0v2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
      />
    </svg>
  );
}
