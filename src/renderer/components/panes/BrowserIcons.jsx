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

export function PlusIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12">
      <path d="M6 1.5v9M1.5 6h9" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function CloseIcon() {
  return (
    <svg width="8" height="8" viewBox="0 0 8 8">
      <path d="M1 1l6 6M7 1L1 7" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function StopIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14">
      <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function AudioIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10">
      <path d="M1 3.5h1.8L5.5 1v8L2.8 6.5H1z" fill="currentColor" />
      <path d="M7 3a3 3 0 0 1 0 4" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

export function GlobeIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12">
      <circle cx="6" cy="6" r="4.5" fill="none" stroke="currentColor" strokeWidth="1" />
      <ellipse cx="6" cy="6" rx="2" ry="4.5" fill="none" stroke="currentColor" strokeWidth="1" />
      <path d="M1.5 6h9" fill="none" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

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
