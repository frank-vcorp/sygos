import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

export type WorkflowStep = {
  id: string;
  label: string;
  detail?: string;
  done: boolean;
  current?: boolean;
};

export function WorkflowStrip({ steps }: { steps: WorkflowStep[] }) {
  return (
    <ol className="flex flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-0">
      {steps.map((step, index) => (
        <li
          key={step.id}
          className={cn(
            "relative flex flex-1 flex-col rounded-xl border px-4 py-3 sm:rounded-none sm:border-0 sm:border-t-4 sm:px-3 sm:pt-4",
            step.done && "border-success/30 bg-success-muted/40 sm:border-t-success",
            step.current && !step.done && "border-accent/40 bg-accent-muted/30 sm:border-t-accent",
            !step.done && !step.current && "border-border bg-slate-50/80 sm:border-t-slate-200",
          )}
        >
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                step.done ? "bg-success text-white" : step.current ? "bg-accent text-white" : "bg-slate-200 text-slate-600",
              )}
            >
              {step.done ? <Check className="size-3.5" /> : index + 1}
            </span>
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">{step.label}</span>
          </div>
          {step.detail && <p className="mt-2 text-xs text-slate-500 sm:pl-8">{step.detail}</p>}
        </li>
      ))}
    </ol>
  );
}
