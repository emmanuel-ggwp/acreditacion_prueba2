import React from 'react';
import { Loader2, type LucideProps } from 'lucide-react';
import { tv, type VariantProps } from 'tailwind-variants';

const spinnerVariants = tv({
  base: 'animate-spin text-indigo-600',
  variants: {
    size: {
      sm: 'h-4 w-4',
      md: 'h-6 w-6',
      lg: 'h-10 w-10',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

interface SpinnerProps extends LucideProps, VariantProps<typeof spinnerVariants> {}

const LoadingSpinner: React.FC<SpinnerProps> = ({ size, className, ...props }) => {
  return <Loader2 className={spinnerVariants({ size, className })} {...props} />;
};

export { LoadingSpinner };
