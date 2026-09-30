import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/surface";
import { cn } from "@/lib/cn";

export function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  href,
  tone = "blue",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  href?: string;
  tone?: "blue" | "green" | "amber";
}) {
  const content = (
    <Card className="group h-full p-5 transition hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(15,23,42,.08)]">
      <div className="flex items-start justify-between">
        <span
          className={cn(
            "inline-flex size-10 items-center justify-center rounded-xl",
            tone === "blue" && "bg-accent-muted text-accent",
            tone === "green" && "bg-success-muted text-success",
            tone === "amber" && "bg-warning-muted text-warning",
          )}
        >
          <Icon className="size-5" />
        </span>
        {href && <ArrowUpRight className="size-4 text-slate-300 transition group-hover:text-accent" />}
      </div>
      <p className="mt-5 text-3xl font-bold tracking-tight text-foreground">{value}</p>
      <p className="mt-1 text-sm font-medium text-slate-700">{label}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </Card>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}
