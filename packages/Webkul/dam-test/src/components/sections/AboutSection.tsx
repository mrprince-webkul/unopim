import { Link } from "react-router-dom";
import { personalInfo, interests, education } from "@/data/portfolioData";
import { SectionHeader } from "@/components/ui/primitives/SectionHeader";
import { Chip } from "@/components/ui/primitives/Chip";
import { Button } from "@/components/ui/primitives/Button";
import { Reveal } from "@/components/ui/primitives/Reveal";
import portrait from "@/assets/princesahni2.jpg";

const AboutSection = () => (
  <section id="about-section" className="container mx-auto px-6 py-20">
    <SectionHeader index="06" title="About" />

    <div className="mt-8 grid gap-10 md:grid-cols-[1fr_320px] md:gap-16">
      <Reveal>
        <div>
          <p className="text-lg leading-relaxed text-foreground/90">{personalInfo.bio}</p>
          <p className="mt-4 leading-relaxed text-muted-foreground">{personalInfo.bioExtended}</p>

          {/* Education */}
          <div className="mt-8">
            <h3 className="font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground">Education</h3>
            <div className="mt-4 space-y-4">
              {education.map((edu) => (
                <div key={edu.institution} className="border-l border-border pl-4">
                  <p className="font-mono text-xs text-primary">{edu.period}</p>
                  <h4 className="mt-1 font-display text-lg text-foreground">{edu.degree}</h4>
                  <p className="font-mono text-sm text-muted-foreground">
                    {edu.institution} · GPA {edu.gpa}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Interests */}
          <div className="mt-8">
            <h3 className="font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground">Beyond code</h3>
            <div className="mt-4 flex flex-wrap gap-2">
              {interests.map((interest) => (
                <Chip key={interest} className="transition-colors hover:border-primary/50 hover:text-primary">
                  {interest}
                </Chip>
              ))}
            </div>
          </div>

          <div className="mt-8">
            <Button asChild variant="ghost">
              <Link to="/about">Read the full story →</Link>
            </Button>
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="order-first md:order-last">
          <div className="group overflow-hidden rounded-xl border border-border">
            <img
              src={portrait}
              alt={personalInfo.name}
              width={640}
              height={800}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          </div>
        </div>
      </Reveal>
    </div>
  </section>
);

export default AboutSection;
