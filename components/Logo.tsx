import Image from "next/image";

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
      className={className}
      priority
    />
  );
}
