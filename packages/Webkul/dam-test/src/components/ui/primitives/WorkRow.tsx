import { cn } from "@/lib/utils";
import { SmartLink } from "./SmartLink";

export interface WorkRowProps {
  index: string;
  title: string;
  description: string;
  tags: string[];
  href?: string;
}

export function WorkRow({ index, title, description, tags, href }: WorkRowProps) {
  const rowClassName = cn(
    "group grid grid-cols-[auto,1fr,auto] items-center gap-4 border-b border-border py-6 no-underline transition-[padding] motion-reduce:transition-none md:gap-6",
    href && "hover:pl-3",
  );

  const inner = (
    <>
      <span className="font-mono text-sm text-muted-foreground">{index}</span>
      <div className="min-w-0">
        <h3 className="font-display text-xl text-foreground md:text-2xl">{title}</h3>
        <p className="mt-2 text-muted-foreground">{description}</p>
        {tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span key={tag} className="font-mono text-xs text-muted-foreground">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
      <span
        aria-hidden="true"
        className="font-display text-xl text-muted-foreground transition-transform motion-reduce:transition-none group-hover:translate-x-1 group-hover:-translate-y-1"
      >
        ↗
      </span>
    </>
  );

  if (href) {
    return (
      <SmartLink href={href} className={rowClassName}>
        {inner}
      </SmartLink>
    );
  }

  return <div className={rowClassName}>{inner}</div>;
}
