import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/surface";
import { cn } from "@/lib/cn";

export function SectionCard({
  icon: Icon,
  title,
  description,
  tone = "default",
  actions,
  children,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  tone?: "default" | "accent" | "muted";
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const iconWrap =
    tone === "accent"
      ? "bg-accent-muted text-accent"
      : tone === "muted"
        ? "bg-slate-100 text-slate-500"
        : "bg-slate-100 text-accent";

  return (
    <Card className={cn("overflow-hidden", className)}>
      <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          {Icon && (
            <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", iconWrap)}>
              <Icon className="size-5" aria-hidden />
            </div>
          )}
          <div>
            <h2 className="text-sm font-semibold">{title}</h2>
            {description && <p className="mt-0.5 max-w-xl text-xs text-slate-500">{description}</p>}
          </div>
        </div>
        {actions}
      </div>
      <div className="p-5">{children}</div>
    </Card>
  );
}
