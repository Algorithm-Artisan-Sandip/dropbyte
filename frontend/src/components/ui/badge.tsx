import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium", {
  variants: {
    variant: {
      green: "border-transparent bg-emerald-600 text-white",
      yellow: "border-transparent bg-amber-500 text-black",
      red: "border-transparent bg-red-600 text-white",
      outline: "text-foreground",
    },
  },
  defaultVariants: { variant: "outline" },
});

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
