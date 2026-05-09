import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: number;
  className?: string;
}

export function Logo({ size = 40, className }: LogoProps) {
  return (
    <Image
      src="/assets/icons/clover-logo.svg"
      alt="Clover logo"
      width={size}
      height={size}
      className={cn(
        "transition-transform duration-150 ease-out hover:scale-105 active:scale-100 motion-reduce:transition-none motion-reduce:hover:scale-100",
        className
      )}
      priority
    />
  );
}
