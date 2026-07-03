import { experiences } from "@/data/portfolioData";
import { SectionHeader } from "@/components/ui/primitives/SectionHeader";
import { Reveal } from "@/components/ui/primitives/Reveal";

const ExperienceSection = () => (
  <section id="experience" className="container mx-auto px-6 py-20">
    <SectionHeader index="02" title="Experience" />
    <div className="mt-10">
      {experiences.map((exp, i) => (
        <Reveal key={exp.company} delay={i * 0.05}>
          <div className="group relative grid gap-4 border-l border-border py-8 pl-8 md:grid-cols-[190px_1fr] md:gap-10">
            <span className="absolute -left-[5px] top-9 h-2.5 w-2.5 rounded-full border-2 border-background bg-border transition-colors group-hover:bg-primary" />
            <div>
              <p className="font-mono text-xs text-primary">{exp.period}</p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">{exp.location}</p>
            </div>
            <div>
              <h3 className="font-display text-xl text-foreground md:text-2xl">{exp.title}</h3>
              <p className="mt-0.5 font-mono text-sm text-muted-foreground">{exp.company}</p>
              <p className="mt-3 max-w-2xl text-muted-foreground">{exp.description}</p>
              <ul className="mt-4 space-y-1.5">
                {exp.achievements.slice(0, 3).map((a) => (
                  <li key={a} className="flex gap-2.5 text-sm text-foreground/80">
                    <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-primary" />
                    {a}
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1">
                {exp.technologies.map((t) => (
                  <span key={t} className="font-mono text-[11px] text-muted-foreground">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      ))}
    </div>
  </section>
);

export default ExperienceSection;
