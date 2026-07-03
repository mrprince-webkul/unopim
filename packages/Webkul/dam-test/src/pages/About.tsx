import { Seo } from "@/components/seo";
import { Link } from "react-router-dom";
import { MapPin, Briefcase, Sparkles } from "lucide-react";
import {
  personalInfo,
  experiences,
  education,
  interests,
  stats,
} from "@/data/portfolioData";
import { SectionHeader } from "@/components/ui/primitives/SectionHeader";
import { Chip } from "@/components/ui/primitives/Chip";
import { Button } from "@/components/ui/primitives/Button";
import { StatStrip } from "@/components/ui/primitives/StatStrip";
import { Reveal } from "@/components/ui/primitives/Reveal";
import portrait from "@/assets/princesahni.jpg";
import portrait2 from "@/assets/princesahni2.jpg";
import introVideo from "@/assets/princesahni.mp4";

const facts = [
  { icon: MapPin, label: "Based in", value: personalInfo.location },
  { icon: Briefcase, label: "Currently", value: "Associate Developer · Webkul" },
  { icon: Sparkles, label: "Focus", value: "Full-Stack · Cloud" },
];

const About = () => (
  <>
    <Seo
      title="About | Prince Kumar Sahni - Software Engineer"
      description="Learn more about Prince Kumar Sahni, a passionate Software Engineer dedicated to building scalable, secure, and high-performing applications."
      url="https://princesahni.com/about"
      image="https://princesahni.com/og-images/princesahni-logo.png"
    />

    <section className="container mx-auto px-6 py-16">
      {/* ── Intro ── */}
      <div className="grid items-center gap-10 lg:grid-cols-[1fr_380px] lg:gap-16">
        <div>
          <span className="font-mono text-xs uppercase tracking-[0.12em] text-primary">Who I am</span>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-foreground md:text-6xl">
            Hi, I'm <span className="text-gradient">Prince</span>.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">{personalInfo.bio}</p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {facts.map(({ icon: Icon, label, value }) => (
              <div key={label} className="rounded-xl border border-border bg-card p-4">
                <Icon className="h-4 w-4 text-primary" />
                <p className="mt-2 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
                <p className="mt-0.5 text-sm text-foreground">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Button asChild variant="primary">
              <Link to="/contact">Get in touch →</Link>
            </Button>
            <Button asChild variant="link">
              <a href={personalInfo.resumeUrl} target="_blank" rel="noreferrer">
                Download résumé
              </a>
            </Button>
          </div>
        </div>

        <Reveal delay={0.1}>
          <div className="group relative">
            <div className="absolute -inset-3 -z-10 rounded-2xl bg-gradient-to-br from-primary/20 to-transparent opacity-70 blur-xl" />
            <div className="overflow-hidden rounded-2xl border border-border">
              <img
                src={portrait}
                alt={personalInfo.name}
                width={640}
                height={800}
                className="aspect-[4/5] w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            </div>
            <p className="mt-3 text-center font-mono text-xs text-muted-foreground">
              {personalInfo.name} — {personalInfo.title}
            </p>
          </div>
        </Reveal>
      </div>

      {/* ── Stats ── */}
      <div className="mt-16">
        <StatStrip items={stats.map((s) => ({ value: s.number, label: s.label }))} />
      </div>

      {/* ── My Story (image + text) ── */}
      <div className="mt-24 grid items-center gap-10 md:grid-cols-2 md:gap-16">
        <Reveal>
          <div className="overflow-hidden rounded-2xl border border-border">
            <img
              src={portrait2}
              alt={`${personalInfo.name} at work`}
              width={720}
              height={540}
              loading="lazy"
              className="aspect-[4/3] w-full object-cover"
            />
          </div>
        </Reveal>
        <Reveal delay={0.08}>
          <div>
            <span className="font-mono text-xs uppercase tracking-[0.12em] text-primary">My story</span>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground">
              From Android apps to full-stack platforms.
            </h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">{personalInfo.bioExtended}</p>
            <p className="mt-4 leading-relaxed text-muted-foreground">{personalInfo.bio}</p>
          </div>
        </Reveal>
      </div>

      {/* ── Beyond Code (text + video) ── */}
      <div className="mt-24 grid items-center gap-10 md:grid-cols-2 md:gap-16">
        <Reveal>
          <div>
            <span className="font-mono text-xs uppercase tracking-[0.12em] text-primary">Beyond code</span>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground">
              Curious by default.
            </h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">{personalInfo.bioCreative}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {interests.map((interest) => (
                <Chip key={interest} className="transition-colors hover:border-primary/50 hover:text-primary">
                  {interest}
                </Chip>
              ))}
            </div>
          </div>
        </Reveal>
        <Reveal delay={0.08}>
          <div className="overflow-hidden rounded-2xl border border-border">
            <video
              src={introVideo}
              poster={portrait2}
              autoPlay
              muted
              loop
              playsInline
              className="aspect-[4/5] w-full object-cover md:aspect-[4/3]"
            />
          </div>
        </Reveal>
      </div>

      {/* ── Experience ── */}
      <div className="mt-24">
        <SectionHeader index="01" title="Experience" />
        <div className="mt-8">
          {experiences.map((exp, i) => (
            <Reveal key={exp.company} delay={i * 0.05}>
              <div className="group relative grid gap-4 border-l border-border py-8 pl-8 md:grid-cols-[200px_1fr] md:gap-10">
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
                    {exp.achievements.map((a) => (
                      <li key={a} className="flex gap-2.5 text-sm text-foreground/80">
                        <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-primary" />
                        {a}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {exp.technologies.map((t) => (
                      <span key={t} className="rounded-md bg-secondary px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      {/* ── Education ── */}
      <div className="mt-24">
        <SectionHeader index="02" title="Education" />
        <div className="mt-8 grid gap-5">
          {education.map((edu) => (
            <Reveal key={edu.degree}>
              <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-display text-xl text-foreground md:text-2xl">{edu.degree}</h3>
                  <span className="font-mono text-xs text-primary">{edu.period}</span>
                </div>
                <p className="mt-1 font-mono text-sm text-muted-foreground">
                  {edu.institution} · {edu.location}
                </p>
                <div className="mt-3 flex flex-wrap gap-3 font-mono text-xs text-muted-foreground">
                  <span>GPA {edu.gpa}</span>
                  <span className="text-primary">{edu.honors}</span>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  {edu.relevant.map((course) => (
                    <Chip key={course}>{course}</Chip>
                  ))}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      {/* ── CTA ── */}
      <div className="mt-24 rounded-2xl border border-border bg-card p-10 text-center">
        <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">Let's work together.</h2>
        <p className="mt-3 font-mono text-sm text-muted-foreground">{personalInfo.email}</p>
        <div className="mt-6 flex justify-center">
          <Button asChild variant="primary">
            <Link to="/contact">Start a conversation →</Link>
          </Button>
        </div>
      </div>
    </section>
  </>
);

export default About;
