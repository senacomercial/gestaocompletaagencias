import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-gold-400/20 text-gold-400',
        secondary: 'border-transparent bg-surface-3 text-foreground',
        destructive: 'border-transparent bg-destructive/20 text-destructive',
        outline: 'border-surface-3 text-foreground',
        success: 'border-transparent bg-status-success/20 text-status-success',
        warning: 'border-transparent bg-status-warning/20 text-status-warning',
        info: 'border-transparent bg-status-info/20 text-status-info',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
