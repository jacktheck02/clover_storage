"use client";

import { useEffect, useState } from "react";

interface StorageUsageRingProps {
  percentage: number;
}

const radius = 42;
const circumference = 2 * Math.PI * radius;

export function StorageUsageRing({ percentage }: StorageUsageRingProps) {
  const [mounted, setMounted] = useState(false);
  const targetOffset =
    circumference - (Math.min(Math.max(percentage, 0), 100) / 100) * circumference;

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <svg viewBox="0 0 100 100" className="size-full -rotate-90">
      <circle
        cx="50"
        cy="50"
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth="8"
        className="text-[#f8f2f0] dark:text-[#4d453e]"
      />
      <circle
        cx="50"
        cy="50"
        r={radius}
        fill="none"
        stroke="#056e7d"
        strokeLinecap="round"
        strokeWidth="8"
        strokeDasharray={circumference}
        strokeDashoffset={mounted ? targetOffset : circumference}
        className="transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none"
      />
    </svg>
  );
}
