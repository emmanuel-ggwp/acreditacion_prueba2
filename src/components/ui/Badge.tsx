import React from 'react';
import { tv, type VariantProps } from 'tailwind-variants';

const badgeVariants = tv({
  base: 'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
  variants: {
    variant: {
      default: 'border-transparent bg-indigo-100 text-indigo-800',
      success: 'border-transparent bg-green-100 text-green-800',
      danger: 'border-transparent bg-red-100 text-red-800',
      warning: 'border-transparent bg-yellow-100 text-yellow-800',
      outline: 'text-gray-700',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={badgeVariants({ variant, className })} {...props} />;
}

export { Badge, badgeVariants };
