import * as React from "react";
import { Link } from "react-router-dom";

export interface SmartLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  children: React.ReactNode;
}

// Internal routes (starting with "/") use client-side routing so navigation
// never triggers a full page reload; external URLs (and "#") render a plain
// anchor that opens in a new tab.
export const SmartLink = React.forwardRef<HTMLAnchorElement, SmartLinkProps>(
  ({ href, children, ...props }, ref) => {
    if (href.startsWith("/")) {
      return (
        <Link to={href} ref={ref} {...props}>
          {children}
        </Link>
      );
    }
    return (
      <a href={href} target="_blank" rel="noreferrer" ref={ref} {...props}>
        {children}
      </a>
    );
  },
);
SmartLink.displayName = "SmartLink";
