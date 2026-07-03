import { skillCategories, learningTech } from "@/data/portfolioData";
import { useResource } from "@/hooks/useResource";
import { SectionHeader } from "@/components/ui/primitives/SectionHeader";
import { Chip } from "@/components/ui/primitives/Chip";
import { Skeleton } from "@/components/ui/primitives/Skeleton";
import { Reveal } from "@/components/ui/primitives/Reveal";

interface RawSkill {
  name: string;
  color?: string;
}
interface RawCategory {
  name: string;
  description?: string;
  skills?: RawSkill[];
  skillsList?: RawSkill[];
}

// The API returns categories with `skillsList`; the local fallback uses `skills`.
const normalize = (categories: RawCategory[]) =>
  categories.map((c) => ({
    name: c.name,
    description: c.description ?? "",
    skills: (c.skills ?? c.skillsList ?? []).map((s) => ({ name: s.name, color: s.color })),
  }));

const SkillsSection = () => {
  const { data, isLoading } = useResource<RawCategory[]>(
    ["skills"],
    import.meta.env.VITE_SKILL_URL,
    { fallback: skillCategories, timeoutMs: 2000 },
  );
  const categories = normalize(data);

  return (
    <section id="skills-section" className="py-20">
      <div className="container mx-auto px-6">
        <SectionHeader index="03" title="Stack" />
      </div>

      <div className="container mx-auto mt-8 px-6">
        {isLoading ? (
          <Skeleton variant="card" count={3} />
        ) : (
          <div className="grid gap-x-8 gap-y-10 md:grid-cols-2">
            {categories.map((category, i) => (
              <Reveal key={category.name} delay={(i % 2) * 0.06}>
                <div>
                  <h3 className="font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground">
                    {category.name}
                  </h3>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {category.skills.map((skill) => (
                      <Chip
                        key={skill.name}
                        className="text-foreground transition-colors hover:border-primary/50 hover:text-primary"
                      >
                        <span
                          aria-hidden="true"
                          className="mr-2 inline-block h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: skill.color ?? "hsl(var(--primary))" }}
                        />
                        {skill.name}
                      </Chip>
                    ))}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        )}

        <div className="mt-12">
          <h3 className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary motion-reduce:animate-none" />
            Currently exploring
          </h3>
          <div className="mt-4 flex flex-wrap gap-2">
            {learningTech.map((tech) => (
              <Chip key={tech} className="text-primary">
                {tech}
              </Chip>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default SkillsSection;
