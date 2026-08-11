/**
 * Inline stroke icons at a single 16px grid. Hand-drawn rather than pulled from
 * an icon package: eight glyphs is not worth a dependency, and drawing them here
 * keeps the stroke weight consistent with the hairline borders elsewhere.
 */

type IconProps = { className?: string };

function Icon({ children, className }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {children}
    </svg>
  );
}

export function DashboardIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="2" y="2" width="5" height="5" rx="1" />
      <rect x="9" y="2" width="5" height="8" rx="1" />
      <rect x="2" y="9" width="5" height="5" rx="1" />
      <rect x="9" y="12" width="5" height="2" rx="1" />
    </Icon>
  );
}

export function PropertyIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2 14V6.5L8 2l6 4.5V14" />
      <path d="M6 14v-4h4v4" />
    </Icon>
  );
}

export function UnitIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="2.5" y="2" width="11" height="12" rx="1" />
      <path d="M2.5 6h11M8 6v8" />
    </Icon>
  );
}

export function TenantIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="8" cy="5.5" r="2.5" />
      <path d="M3 13.5a5 5 0 0 1 10 0" />
    </Icon>
  );
}

export function LeaseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3.5 2h6l3 3v9a1 1 0 0 1-1 1h-8a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z" />
      <path d="M9.5 2v3.5H13M6 9h4M6 11.5h4" />
    </Icon>
  );
}

export function PaymentIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="2" y="4" width="12" height="8" rx="1.5" />
      <path d="M2 7h12" />
      <path d="M4.5 9.75h2" />
    </Icon>
  );
}

export function ExpenseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 2v12" />
      <path d="M11 4.5H6.5a2 2 0 0 0 0 4h3a2 2 0 0 1 0 4H5" />
    </Icon>
  );
}

export function MaintenanceIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9.5 3.5a3 3 0 0 0 4 4l-6 6a2 2 0 0 1-3-3l6-6Z" />
      <path d="M11 2.5 13.5 5" />
    </Icon>
  );
}

export function SunIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="8" cy="8" r="3" />
      <path d="M8 1v1.5M8 13.5V15M15 8h-1.5M2.5 8H1M12.9 3.1l-1 1M4.1 11.9l-1 1M12.9 12.9l-1-1M4.1 4.1l-1-1" />
    </Icon>
  );
}

export function MoonIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M13.5 9.5A5.5 5.5 0 0 1 6.5 2.5a5.5 5.5 0 1 0 7 7Z" />
    </Icon>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 3.5v9M3.5 8h9" />
    </Icon>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 3.5 10.5 8 6 12.5" />
    </Icon>
  );
}

export function AlertIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 2.5 14.5 13.5h-13L8 2.5Z" />
      <path d="M8 6.5v3M8 11.5v.01" />
    </Icon>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="8" cy="8" r="6" />
      <path d="M8 4.5V8l2.5 1.5" />
    </Icon>
  );
}
