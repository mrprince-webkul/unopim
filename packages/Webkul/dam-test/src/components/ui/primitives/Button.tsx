import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-mono text-[13px] px-4 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "rounded-lg bg-foreground text-background hover:bg-foreground/90",
        link: "rounded-none border-b-2 border-primary px-0 py-0.5 text-primary hover:text-primary/80",
        ghost: "rounded-lg border border-border bg-card hover:bg-accent",
      },
    },
    defaultVariants: {
      variant: "primary",
    },
  },
);

// `onDrag`/`onDragStart`/`onDragEnd`/`onAnimation*` conflict between React's DOM
// event typings and framer-motion's gesture/animation typings on the same prop
// names — omit the DOM versions so the props resolve to framer-motion's.
type ConflictingMotionProps =
  | "onDrag"
  | "onDragStart"
  | "onDragEnd"
  | "onAnimationStart"
  | "onAnimationEnd"
  | "onAnimationIteration";

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, ConflictingMotionProps>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, asChild = false, children, ...props }, ref) => {
    const prefersReducedMotion = useReducedMotion();

    if (asChild) {
      return (
        <Slot className={cn(buttonVariants({ variant, className }))} ref={ref} {...props}>
          {children}
        </Slot>
      );
    }

    return (
      <motion.button
        ref={ref}
        className={cn(buttonVariants({ variant, className }))}
        whileHover={prefersReducedMotion ? undefined : { y: -2 }}
        whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
        {...props}
      >
        {children}
      </motion.button>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
