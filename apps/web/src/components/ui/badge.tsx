import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:     'border-transparent bg-primary text-primary-foreground',
        secondary:   'border-transparent bg-secondary text-secondary-foreground',
        destructive: 'border-transparent bg-destructive/10 text-destructive dark:text-red-400',
        outline:     'text-foreground border border-border',
        success:     'bg-green-500/10 text-green-700 dark:text-green-400',
        warning:     'bg-amber-500/10 text-amber-700 dark:text-amber-400',
        info:        'bg-sky-500/10 text-sky-700 dark:text-sky-400',
        muted:       'bg-muted text-muted-foreground',
        purple:      'bg-purple-500/10 text-purple-700 dark:text-purple-400',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
