import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export const fieldInputClass =
  "mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20";

export const fieldSelectClass = fieldInputClass;

export function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={cn("block text-sm", className)}>
      <span className="font-medium text-foreground">{label}</span>
      {hint && <span className="mt-0.5 block text-xs font-normal text-slate-500">{hint}</span>}
      {children}
    </label>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldInputClass, className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(fieldSelectClass, className)} {...props}>
      {children}
    </select>
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(fieldInputClass, className)} {...props} />;
}

export function FormActions({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex flex-wrap items-center gap-2 pt-1", className)}>{children}</div>;
}
