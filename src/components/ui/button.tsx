import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold shadow-sm transition active:translate-y-px disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-accent text-white hover:bg-[#0b2d4e]",
        secondary: "border border-border bg-white text-foreground hover:bg-slate-50",
        ghost: "text-slate-600 shadow-none hover:bg-slate-100 hover:text-foreground",
        danger: "bg-danger text-white hover:bg-[#8f1c13]",
      },
      size: {
        sm: "min-h-8 rounded-md px-3 text-xs",
        md: "min-h-10 px-4",
        lg: "min-h-12 rounded-xl px-5",
        icon: "size-10 p-0",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { buttonVariants };
