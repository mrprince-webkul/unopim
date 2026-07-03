import * as React from "react";

import { cn } from "@/lib/utils";

export type TagProps = React.HTMLAttributes<HTMLSpanElement>;

const Tag = React.forwardRef<HTMLSpanElement, TagProps>(({ className, children, ...props }, ref) => (
  <span
    ref={ref}
    className={cn(
      "inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 font-mono text-[11px] text-primary",
      className,
    )}
    {...props}
  >
    {children}
  </span>
));
Tag.displayName = "Tag";

export { Tag };
