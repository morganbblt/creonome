import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  viewBox: "0 0 20 20",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function RefreshIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M15.8 6.5A6 6 0 0 0 4.3 8.5" />
      <path d="M4.2 13.5a6 6 0 0 0 11.5-2" />
      <path d="M4 4.5v4h4" />
      <path d="M16 15.5v-4h-4" />
    </svg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="9" cy="9" r="5.5" />
      <path d="M16.5 16.5 13 13" />
    </svg>
  );
}

export function ExternalLinkIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M8.5 5H15v6.5" />
      <path d="M15 5 5 15" />
    </svg>
  );
}

export function SunIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="10" cy="10" r="3.5" />
      <path d="M10 2.5v2M10 15.5v2M17.5 10h-2M4.5 10h-2M15.3 4.7l-1.4 1.4M6.1 13.9l-1.4 1.4M15.3 15.3l-1.4-1.4M6.1 6.1 4.7 4.7" />
    </svg>
  );
}

export function MoonIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M16.5 12.3A6.8 6.8 0 1 1 7.7 3.5a5.4 5.4 0 0 0 8.8 8.8Z" />
    </svg>
  );
}
