import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/utils/cn"

const badgeVariants = cva(
  "inline-flex items-center rounded-lg px-3 py-1 label-small transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "bg-primary-container text-on-primary-container",
        secondary:
          "bg-secondary-container text-on-secondary-container",
        destructive:
          "bg-error-container text-on-error-container",
        outline: "border border-outline text-foreground bg-transparent",
        success:
          "bg-success text-success-foreground",
        warning:
          "bg-warning text-warning-foreground",
        info:
          "bg-info text-info-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
