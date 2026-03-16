'use client';

import React from 'react';

interface IconProps {
  style?: React.CSSProperties;
  className?: string;
}

const svgBase: React.SVGAttributes<SVGSVGElement> = {
  xmlns: 'http://www.w3.org/2000/svg',
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

export const GripVerticalIcon: React.FC<IconProps> = ({ style, className }) => (
  <svg {...svgBase} style={style} className={className}>
    <circle cx="9" cy="12" r="1" />
    <circle cx="9" cy="5" r="1" />
    <circle cx="9" cy="19" r="1" />
    <circle cx="15" cy="12" r="1" />
    <circle cx="15" cy="5" r="1" />
    <circle cx="15" cy="19" r="1" />
  </svg>
);

export const ChevronDownIcon: React.FC<IconProps> = ({ style, className }) => (
  <svg {...svgBase} style={style} className={className}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export const ChevronLeftIcon: React.FC<IconProps> = ({ style, className }) => (
  <svg {...svgBase} style={style} className={className}>
    <path d="m15 18-6-6 6-6" />
  </svg>
);

export const ChevronRightIcon: React.FC<IconProps> = ({ style, className }) => (
  <svg {...svgBase} style={style} className={className}>
    <path d="m9 18 6-6-6-6" />
  </svg>
);

export const ChevronsLeftIcon: React.FC<IconProps> = ({ style, className }) => (
  <svg {...svgBase} style={style} className={className}>
    <path d="m11 17-5-5 5-5" />
    <path d="m18 17-5-5 5-5" />
  </svg>
);

export const ChevronsRightIcon: React.FC<IconProps> = ({
  style,
  className,
}) => (
  <svg {...svgBase} style={style} className={className}>
    <path d="m6 17 5-5-5-5" />
    <path d="m13 17 5-5-5-5" />
  </svg>
);

export const ArrowUpAZIcon: React.FC<IconProps> = ({ style, className }) => (
  <svg {...svgBase} style={style} className={className}>
    <path d="m3 8 4-4 4 4" />
    <path d="M7 4v16" />
    <path d="M20 8h-5" />
    <path d="M15 10V6.5a2.5 2.5 0 0 1 5 0V10" />
    <path d="M15 14h5l-5 6h5" />
  </svg>
);

export const ArrowDownAZIcon: React.FC<IconProps> = ({ style, className }) => (
  <svg {...svgBase} style={style} className={className}>
    <path d="m3 16 4 4 4-4" />
    <path d="M7 20V4" />
    <path d="M20 8h-5" />
    <path d="M15 10V6.5a2.5 2.5 0 0 1 5 0V10" />
    <path d="M15 14h5l-5 6h5" />
  </svg>
);

export const FilterIcon: React.FC<IconProps> = ({ style, className }) => (
  <svg {...svgBase} style={style} className={className}>
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);

export const FilterXIcon: React.FC<IconProps> = ({ style, className }) => (
  <svg {...svgBase} style={style} className={className}>
    <path d="M13.013 3H2l8 9.46V19l4 2v-8.54l.9-1.055" />
    <path d="m22 3-5 5" />
    <path d="m17 3 5 5" />
  </svg>
);

export const PinIcon: React.FC<IconProps> = ({ style, className }) => (
  <svg {...svgBase} style={style} className={className}>
    <line x1="12" x2="12" y1="17" y2="22" />
    <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
  </svg>
);

export const PinOffIcon: React.FC<IconProps> = ({ style, className }) => (
  <svg {...svgBase} style={style} className={className}>
    <line x1="2" x2="22" y1="2" y2="22" />
    <line x1="12" x2="12" y1="17" y2="22" />
    <path d="M9 9v1.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4" />
  </svg>
);

export const CopyIcon: React.FC<IconProps> = ({ style, className }) => (
  <svg {...svgBase} style={style} className={className}>
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
  </svg>
);

export const EyeOffIcon: React.FC<IconProps> = ({ style, className }) => (
  <svg {...svgBase} style={style} className={className}>
    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
    <line x1="2" x2="22" y1="2" y2="22" />
  </svg>
);

/** Customizable icon overrides for BoltTable. */
export interface BoltTableIcons {
  gripVertical?: React.ReactNode;
  sortAsc?: React.ReactNode;
  sortDesc?: React.ReactNode;
  filter?: React.ReactNode;
  filterClear?: React.ReactNode;
  pin?: React.ReactNode;
  pinOff?: React.ReactNode;
  eyeOff?: React.ReactNode;
  chevronDown?: React.ReactNode;
  chevronLeft?: React.ReactNode;
  chevronRight?: React.ReactNode;
  chevronsLeft?: React.ReactNode;
  chevronsRight?: React.ReactNode;
  copy?: React.ReactNode;
}
