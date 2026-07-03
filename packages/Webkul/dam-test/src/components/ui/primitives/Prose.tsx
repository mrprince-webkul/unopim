import * as React from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";

import { cn } from "@/lib/utils";

export interface ProseProps {
  markdown: string;
  className?: string;
}

/**
 * Safe markdown renderer: `marked.parse` -> `DOMPurify.sanitize` -> innerHTML.
 * Never pass raw/unsanitized HTML through `dangerouslySetInnerHTML` elsewhere —
 * this is the one sanctioned place, and only after sanitization.
 */
export function Prose({ markdown, className }: ProseProps) {
  const html = React.useMemo(() => {
    const rawHtml = marked.parse(markdown, { async: false });
    return DOMPurify.sanitize(rawHtml);
  }, [markdown]);

  return (
    <div
      className={cn("prose prose-neutral max-w-none dark:prose-invert", className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
