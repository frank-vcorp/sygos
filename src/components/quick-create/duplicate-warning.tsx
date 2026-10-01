import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export function DuplicateWarning({
  title,
  items,
  selectHref,
}: {
  title: string;
  items: { id: string; label: string }[];
  /** Si el usuario elige un existente (p. ej. returnTo con entity id). */
  selectHref?: (id: string) => string;
}) {
  if (items.length === 0) return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <p className="font-semibold">{title}</p>
      <ul className="mt-2 space-y-1">
        {items.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center justify-between gap-2">
            <span>{item.label}</span>
            {selectHref && (
              <Link href={selectHref(item.id)} className={buttonVariants({ variant: "secondary", size: "sm" })}>
                Usar este
              </Link>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-amber-800">
        Si ninguno coincide, confirma abajo para crear uno nuevo (no se fusionan automáticamente).
      </p>
    </div>
  );
}
