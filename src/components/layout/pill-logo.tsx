"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

export function PillLogo({ className }: { className?: string }) {
  const clipId = useId();

  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("h-7 w-7 text-primary", className)}
      aria-hidden="true"
    >
      <g transform="rotate(45 12 12)">
        <clipPath id={clipId}>
          <rect x="3" y="7.5" width="18" height="9" rx="4.5" />
        </clipPath>
        <g clipPath={`url(#${clipId})`}>
          {/* Colored half */}
          <rect x="3" y="7.5" width="9" height="9" fill="currentColor" />
          {/* White half */}
          <rect x="12" y="7.5" width="9" height="9" fill="#ffffff" />
        </g>
        {/* Capsule outline */}
        <rect
          x="3"
          y="7.5"
          width="18"
          height="9"
          rx="4.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        {/* Divider between the two halves */}
        <line
          x1="12"
          y1="7.5"
          x2="12"
          y2="16.5"
          stroke="currentColor"
          strokeWidth="1.2"
        />
      </g>
    </svg>
  );
}
