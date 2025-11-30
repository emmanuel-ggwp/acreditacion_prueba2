import React from 'react';
import { tv, type VariantProps } from 'tailwind-variants';

const cardVariants = tv({
  base: 'rounded-lg shadow-md',
  variants: {
    variant: {
      default: 'bg-white',
      outline: 'bg-transparent border border-gray-200',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={`p-4 border-b ${className}`} {...props} />
));
CardHeader.displayName = 'CardHeader';

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={`p-4 ${className}`} {...props} />
));
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={`p-4 border-t ${className}`} {...props} />
));
CardFooter.displayName = 'CardFooter';

interface CardProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(({ className, variant, ...props }, ref) => (
  <div ref={ref} className={cardVariants({ variant, className })} {...props} />
));
Card.displayName = 'Card';

export { Card, CardHeader, CardContent, CardFooter };
