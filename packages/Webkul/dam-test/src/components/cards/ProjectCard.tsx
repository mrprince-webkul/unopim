import { SmartLink } from "@/components/ui/primitives/SmartLink";

export interface ProjectCardData {
  id?: number | string;
  title: string;
  description: string;
  technologies?: string[];
  liveUrl?: string;
  githubUrl?: string;
  featured?: boolean;
}

const resolveHref = (p: ProjectCardData) => {
  if (p.liveUrl && p.liveUrl !== "#") return p.liveUrl;
  if (p.githubUrl && p.githubUrl !== "#") return p.githubUrl;
  return undefined;
};

const cardClass =
  "group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card transition-all hover:-translate-y-1 hover:border-primary/50 hover:shadow-[0_20px_50px_-30px_hsl(var(--primary)/0.5)] motion-reduce:hover:translate-y-0";

export function ProjectCard({ project, index }: { project: ProjectCardData; index: number }) {
  const href = resolveHref(project);

  const inner = (
    <>
      {/* Gradient cover */}
      <div className="relative h-32 overflow-hidden bg-gradient-to-br from-primary/25 via-primary/10 to-transparent">
        <div className="absolute inset-0 bg-grid opacity-40" />
        <span className="absolute left-4 top-4 font-mono text-xs text-primary">
          {String(index + 1).padStart(2, "0")}
        </span>
        {project.featured ? (
          <span className="absolute right-4 top-4 rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-[10px] text-primary">
            featured
          </span>
        ) : null}
        <span className="absolute -bottom-6 -right-6 text-6xl text-primary/10 transition-transform duration-500 group-hover:scale-110 group-hover:text-primary/20">
          ↗
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-lg text-foreground">{project.title}</h3>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground line-clamp-3">
          {project.description}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {(project.technologies ?? []).slice(0, 4).map((t) => (
            <span key={t} className="rounded-md bg-secondary px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
              {t}
            </span>
          ))}
        </div>
      </div>
    </>
  );

  return href ? (
    <SmartLink href={href} className={cardClass}>
      {inner}
    </SmartLink>
  ) : (
    <div className={cardClass}>{inner}</div>
  );
}
