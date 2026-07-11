import { cn } from "@/lib/utils";

/**
 * A small rounded chip/badge. Consolidates the near-duplicate badge styles that had
 * drifted across the app (the "Archived" badge, tag chips, the cover "Current"/
 * "Cover" markers) into two variants and two sizes. Not for the tree-card status
 * badges — those stay bespoke inside the uniform-card layout.
 */
const pillVariants = {
  outline: "border-border text-muted-foreground border",
  primary: "bg-primary text-primary-foreground",
} as const;

const pillSizes = {
  sm: "text-[0.65rem]",
  md: "text-xs",
} as const;

export function Pill({
  variant = "outline",
  size = "md",
  className,
  ...props
}: React.ComponentProps<"span"> & {
  variant?: keyof typeof pillVariants;
  size?: keyof typeof pillSizes;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium whitespace-nowrap",
        pillVariants[variant],
        pillSizes[size],
        className,
      )}
      {...props}
    />
  );
}
