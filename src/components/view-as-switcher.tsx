"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye } from "lucide-react";
import type { ViewAsOption } from "@/lib/impersonation";
import { clearViewAsAction, setViewAsAction } from "@/app/app/view-as/actions";
import { cn } from "@/lib/cn";

export function ViewAsSwitcher({
  options,
  effectiveUserId,
  impersonating,
}: {
  options: ViewAsOption[];
  effectiveUserId: string;
  impersonating: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onChange(value: string) {
    startTransition(async () => {
      if (!value) {
        await clearViewAsAction();
      } else {
        await setViewAsAction(value);
      }
      router.refresh();
    });
  }

  return (
    <div
      className={cn(
        "flex max-w-[min(100%,280px)] items-center gap-1.5 rounded-xl border bg-white p-1 shadow-sm",
        impersonating ? "border-amber-300 ring-1 ring-amber-200" : "border-border",
      )}
    >
      <span className="flex shrink-0 items-center gap-1 px-1.5 text-[11px] font-medium text-slate-500">
        <Eye className="size-3.5" />
        Ver como
      </span>
      <select
        aria-label="Ver como otro usuario"
        disabled={pending}
        value={impersonating ? effectiveUserId : ""}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-8 min-w-0 flex-1 truncate rounded-lg bg-transparent px-1.5 text-xs font-semibold text-slate-700 outline-none disabled:opacity-60"
      >
        <option value="">Yo (admin)</option>
        {options.map((user) => (
          <option key={user.id} value={user.id}>
            {user.displayName} · {user.roleLabel}
          </option>
        ))}
      </select>
    </div>
  );
}
