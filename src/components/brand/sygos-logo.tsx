import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/cn";

const LOCKUP_SRC = "/brand/sygos-lockup.png";
const ICON_SRC = "/brand/sygos-icon.png";

const LOCKUP_WIDTH = 200;
const LOCKUP_HEIGHT = 93;
const ICON_WIDTH = 57;
const ICON_HEIGHT = 50;

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
  /** Centra el lockup en contenedores de ancho completo (sidebar). */
  centered?: boolean;
};

const lockupClass: Record<NonNullable<SygosLogoProps["size"]>, string> = {
  sm: "h-8 w-auto max-w-[140px]",
  md: "h-10 w-auto max-w-[168px]",
  lg: "h-12 w-auto max-w-[200px]",
  hero: "h-[3.25rem] w-auto max-w-[240px] sm:h-14 sm:max-w-[280px]",
};

const iconClass: Record<NonNullable<SygosLogoProps["size"]>, string> = {
  sm: "size-8",
  md: "size-9",
  lg: "size-10",
  hero: "size-12 sm:size-14",
};

const titleClass: Record<NonNullable<SygosLogoProps["size"]>, string> = {
  sm: "text-[15px]",
  md: "text-lg",
  lg: "text-xl",
  hero: "text-2xl sm:text-[1.75rem]",
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

function BrandIcon({
  size,
  priority,
}: Pick<SygosLogoProps, "size" | "priority">) {
  const s = size ?? "md";
  return (
    <Image
      src={ICON_SRC}
      alt=""
      width={ICON_WIDTH}
      height={ICON_HEIGHT}
      priority={priority}
      aria-hidden
      className={cn("shrink-0 object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,.25)]", iconClass[s])}
    />
  );
}

function Brand({
  size,
  className,
  priority,
}: Pick<SygosLogoProps, "size" | "className" | "priority">) {
  const s = size ?? "md";
  const showTagline = s === "hero";

  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <BrandIcon size={s} priority={priority} />
      <div className="min-w-0">
        <span
          className={cn(
            "block font-semibold tracking-[-0.03em] text-white",
            titleClass[s],
          )}
        >
          Sygos
        </span>
        {showTagline && (
          <span className="mt-1 block text-[13px] font-medium tracking-wide text-slate-400">
            Monitoreo inteligente
          </span>
        )}
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
  centered,
}: SygosLogoProps) {
  const content =
    variant === "brand" ? (
      <Brand size={size} priority={priority} />
    ) : (
      <Lockup
        size={size}
        priority={priority}
        className={cn(centered && "mx-auto object-center")}
      />
    );

  const shell = cn("inline-flex max-w-full shrink-0 items-center", className);

  if (href) {
    return (
      <Link href={href} className={shell} aria-label="Sygos — inicio">
        {content}
      </Link>
    );
  }

  return <div className={shell}>{content}</div>;
}
