import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/cn";

const LOCKUP_SRC = "/brand/sygos-lockup.png";
const MARK_SRC = "/brand/sygos-mark.png";

const LOCKUP_WIDTH = 200;
const LOCKUP_HEIGHT = 93;
const MARK_WIDTH = 64;
const MARK_HEIGHT = 76;

type SygosLogoProps = {
  /**
   * lockup — imagen completa (fondos claros: login móvil, landing).
   * brand — ícono + tipografía (sidebar, paneles oscuros).
   */
  variant?: "lockup" | "brand";
  size?: "sm" | "md" | "lg" | "hero";
  className?: string;
  href?: string;
  priority?: boolean;
};

const lockupClass: Record<NonNullable<SygosLogoProps["size"]>, string> = {
  sm: "h-8 w-auto max-w-[140px]",
  md: "h-10 w-auto max-w-[168px]",
  lg: "h-12 w-auto max-w-[200px]",
  hero: "h-[3.25rem] w-auto max-w-[240px] sm:h-14 sm:max-w-[280px]",
};

const brandMarkClass: Record<NonNullable<SygosLogoProps["size"]>, string> = {
  sm: "size-8",
  md: "size-10",
  lg: "size-11",
  hero: "size-14 sm:size-[3.75rem]",
};

const brandTitleClass: Record<NonNullable<SygosLogoProps["size"]>, string> = {
  sm: "text-sm",
  md: "text-[1.05rem]",
  lg: "text-xl",
  hero: "text-2xl sm:text-[1.65rem]",
};

function Lockup({
  size,
  className,
  priority,
}: Pick<SygosLogoProps, "size" | "className" | "priority">) {
  const s = size ?? "md";
  return (
    <Image
      src={LOCKUP_SRC}
      alt="Sygos"
      width={LOCKUP_WIDTH}
      height={LOCKUP_HEIGHT}
      priority={priority}
      className={cn("object-contain object-left", lockupClass[s], className)}
    />
  );
}

function BrandMark({
  size,
  className,
  priority,
}: Pick<SygosLogoProps, "size" | "className" | "priority">) {
  const s = size ?? "md";
  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-white/[0.14] to-white/[0.04] ring-1 ring-inset ring-white/12",
        s === "sm" && "size-9 rounded-xl",
        s === "md" && "size-11",
        s === "lg" && "size-12",
        s === "hero" && "size-[4.25rem] sm:size-[4.75rem]",
      )}
    >
      <Image
        src={MARK_SRC}
        alt=""
        width={MARK_WIDTH}
        height={MARK_HEIGHT}
        priority={priority}
        aria-hidden
        className={cn("object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,.35)]", brandMarkClass[s], className)}
      />
    </div>
  );
}

function Brand({
  size,
  className,
  priority,
}: Pick<SygosLogoProps, "size" | "className" | "priority">) {
  const s = size ?? "md";
  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <BrandMark size={s} priority={priority} />
      <div className="min-w-0 leading-none">
        <span
          className={cn(
            "block font-semibold tracking-[-0.02em] text-white",
            brandTitleClass[s],
          )}
        >
          Sygos
        </span>
        <span
          className={cn(
            "mt-1.5 block truncate font-medium text-[var(--brand-teal)]",
            s === "hero" ? "text-xs sm:text-[13px]" : "text-[10px] tracking-[0.04em]",
          )}
        >
          Monitoreo inteligente
        </span>
      </div>
    </div>
  );
}

export function SygosLogo({
  variant = "lockup",
  size = "md",
  className,
  href,
  priority,
}: SygosLogoProps) {
  const content =
    variant === "brand" ? (
      <Brand size={size} priority={priority} className={className} />
    ) : (
      <Lockup size={size} priority={priority} className={className} />
    );

  const shell = "inline-flex max-w-full shrink-0 items-center";

  if (href) {
    return (
      <Link href={href} className={shell} aria-label="Sygos — inicio">
        {content}
      </Link>
    );
  }

  return <div className={shell}>{content}</div>;
}
