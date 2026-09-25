type IconProps = { className?: string };

export function ChevronIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M7 4l6 6-6 6" />
    </svg>
  );
}

export function GripIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className={className}>
      <circle cx="7.5" cy="5" r="1.4" />
      <circle cx="12.5" cy="5" r="1.4" />
      <circle cx="7.5" cy="10" r="1.4" />
      <circle cx="12.5" cy="10" r="1.4" />
      <circle cx="7.5" cy="15" r="1.4" />
      <circle cx="12.5" cy="15" r="1.4" />
    </svg>
  );
}

export function TrashIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M3.5 5.5h13M8 5.5V4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1.5M5 5.5l.7 10a1.5 1.5 0 0 0 1.5 1.4h5.6a1.5 1.5 0 0 0 1.5-1.4l.7-10" />
    </svg>
  );
}

/** Used for the "add to visualisation" toggle on a work item. */
export function ChartIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M3 16.5h14" />
      <rect x="4.5" y="10" width="3" height="5" rx="0.6" />
      <rect x="9" y="6.5" width="3" height="8.5" rx="0.6" />
      <rect x="13.5" y="3.5" width="3" height="11.5" rx="0.6" />
    </svg>
  );
}

export function PlusIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M10 4.5v11M4.5 10h11" />
    </svg>
  );
}
