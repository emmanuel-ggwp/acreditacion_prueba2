import React from 'react';
import { tv, type VariantProps } from 'tailwind-variants';
import { Slot } from '@radix-ui/react-slot';
import { Loader2 } from 'lucide-react';

const buttonVariants = tv({
  base: 'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
  variants: {
    variant: {
      primary: 'bg-indigo-600 text-white hover:bg-indigo-700',
      secondary: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200',
      danger: 'bg-red-600 text-white hover:bg-red-700',
      ghost: 'hover:bg-gray-100',
      link: 'text-indigo-600 underline-offset-4 hover:underline',
    },
    size: {
      sm: 'h-9 px-3',
      md: 'h-10 px-4 py-2',
      lg: 'h-11 px-8 rounded-md',
      icon: 'h-10 w-10',
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
});

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, isLoading = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={buttonVariants({ variant, size, className })}
        ref={ref}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {children}
      </Comp>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
