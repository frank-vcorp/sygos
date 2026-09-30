import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/cn";

const LOCKUP_SRC = "/brand/sygos-lockup.png";
const LOCKUP_WIDTH = 200;
const LOCKUP_HEIGHT = 93;

type SygosLogoProps = {
  /** Tamaño visual del lockup */
  size?: "sm" | "md" | "lg" | "hero";
  /** Fondo oscuro (sidebar): placa blanca elevada para legibilidad del lockup */
  onDark?: boolean;
  className?: string;
  href?: string;
  priority?: boolean;
};

const sizeClass: Record<NonNullable<SygosLogoProps["size"]>, string> = {
  sm: "h-7 w-auto max-w-[120px]",
  md: "h-9 w-auto max-w-[148px]",
  lg: "h-11 w-auto max-w-[180px]",
  hero: "h-14 w-auto max-w-[220px] sm:h-16 sm:max-w-[260px]",
};

export function SygosLogo({
  size = "md",
  onDark = false,
  className,
  href,
  priority,
}: SygosLogoProps) {
  const image = (
    <Image
      src={LOCKUP_SRC}
      alt="Sygos"
      width={LOCKUP_WIDTH}
      height={LOCKUP_HEIGHT}
      priority={priority}
      className={cn("object-contain object-left", sizeClass[size], className)}
    />
  );

  const shell = cn(
    "inline-flex shrink-0 items-center",
    onDark &&
      "rounded-xl bg-white px-3 py-2 shadow-[0_8px_24px_rgba(0,0,0,.28)] ring-1 ring-white/15",
  );

  if (href) {
    return (
      <Link href={href} className={shell} aria-label="Sygos — inicio">
        {image}
      </Link>
    );
  }

  return <div className={shell}>{image}</div>;
}
