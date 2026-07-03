import {
  Atom,
  FileCode,
  Zap,
  Palette,
  Component,
  Layout,
  Code,
  Paintbrush,
  Server,
  Layers,
  Globe,
  Network,
  Wifi,
  Boxes,
  Database,
  Leaf,
  Triangle,
  Cylinder,
  HardDrive,
  Container,
  Cloud,
  GitBranch,
  GitCommit,
  Code2,
  Figma,
  TestTube,
  Package,
  CheckCircle,
  Send,
  type LucideIcon,
} from "lucide-react";
import { Seo } from "@/components/seo";
import { useResource } from "@/hooks/useResource";
import { StatStrip } from "@/components/ui/primitives/StatStrip";
import { Skeleton } from "@/components/ui/primitives/Skeleton";
import { Reveal } from "@/components/ui/primitives/Reveal";
import { Chip } from "@/components/ui/primitives/Chip";

// Explicit icon map — only the icons referenced in the skills data are imported
// so the route chunk doesn't bundle the entire lucide set.
const iconMap: Record<string, LucideIcon> = {
  Atom, FileCode, Zap, Palette, Component, Layout, Code, Paintbrush, Server,
  Layers, Globe, Network, Wifi, Boxes, Database, Leaf, Triangle, Cylinder,
  HardDrive, Container, Cloud, GitBranch, GitCommit, Code2, Figma, TestTube,
  Package, CheckCircle, Send,
};

interface RawSkill {
  name: string;
  icon?: string;
}
interface RawCategory {
  _id?: string;
  name: string;
  description?: string;
  skills?: RawSkill[];
  skillsList?: RawSkill[];
}

const normalize = (categories: RawCategory[] | undefined) =>
  (categories ?? []).map((c) => ({
    id: c._id ?? c.name,
    name: c.name,
    description: c.description ?? "",
    skills: (c.skills ?? c.skillsList ?? []).map((s) => ({ name: s.name, icon: s.icon ?? "" })),
  }));

const fallback: RawCategory[] = [
  {
    _id: "1",
    name: "Frontend Development",
    description: "Modern client-side technologies for building interactive user interfaces.",
    skillsList: [
      { name: "React", icon: "Atom" },
      { name: "TypeScript", icon: "FileCode" },
      { name: "Next.js", icon: "Zap" },
      { name: "Tailwind CSS", icon: "Palette" },
      { name: "Vue.js", icon: "Component" },
      { name: "HTML/CSS", icon: "Layout" },
      { name: "JavaScript", icon: "Code" },
      { name: "Sass", icon: "Paintbrush" },
    ],
  },
  {
    _id: "2",
    name: "Backend Development",
    description: "Server-side technologies and APIs for robust application architecture.",
    skillsList: [
      { name: "Node.js", icon: "Server" },
      { name: "Express.js", icon: "Layers" },
      { name: "Python", icon: "Code2" },
      { name: "REST APIs", icon: "Globe" },
      { name: "GraphQL", icon: "Network" },
      { name: "WebSockets", icon: "Wifi" },
      { name: "Microservices", icon: "Boxes" },
    ],
  },
  {
    _id: "3",
    name: "Database Technologies",
    description: "Data storage, management, and optimization solutions.",
    skillsList: [
      { name: "PostgreSQL", icon: "Database" },
      { name: "MongoDB", icon: "Leaf" },
      { name: "Redis", icon: "Zap" },
      { name: "Prisma", icon: "Triangle" },
      { name: "MySQL", icon: "Cylinder" },
      { name: "SQLite", icon: "HardDrive" },
    ],
  },
  {
    _id: "4",
    name: "DevOps & Cloud",
    description: "Infrastructure, deployment, and cloud platform expertise.",
    skillsList: [
      { name: "Docker", icon: "Container" },
      { name: "AWS", icon: "Cloud" },
      { name: "Vercel", icon: "Triangle" },
      { name: "GitHub Actions", icon: "GitBranch" },
      { name: "Nginx", icon: "Server" },
      { name: "Kubernetes", icon: "Boxes" },
      { name: "CI/CD", icon: "GitCommit" },
    ],
  },
  {
    _id: "5",
    name: "Tools & Development",
    description: "Development tools, testing frameworks, and productivity software.",
    skillsList: [
      { name: "Git", icon: "GitBranch" },
      { name: "VS Code", icon: "Code2" },
      { name: "Figma", icon: "Figma" },
      { name: "Jest", icon: "TestTube" },
      { name: "Webpack", icon: "Package" },
      { name: "ESLint", icon: "CheckCircle" },
      { name: "Postman", icon: "Send" },
    ],
  },
];

const learningTech = ["AI/ML", "Web3", "Rust", "Go", "Kubernetes", "Microservices", "GraphQL", "Blockchain"];

const Skills = () => {
  const { data, isLoading } = useResource<RawCategory[]>(
    ["skills"],
    import.meta.env.VITE_SKILL_URL,
    { fallback, timeoutMs: 2000 },
  );

  const categories = normalize(data);
  const totalSkills = categories.reduce((acc, c) => acc + c.skills.length, 0);

  const stats = [
    { value: `${totalSkills}+`, label: "Technologies" },
    { value: "2+", label: "Years Experience" },
    { value: String(categories.length), label: "Skill Categories" },
    { value: "10+", label: "Projects Built" },
  ];

  return (
    <>
      <Seo
        title="Skills | Prince Kumar Sahni - Software Engineer"
        description="Explore the technical skills and expertise of Prince Kumar Sahni, a Software Engineer specializing in building scalable, secure, and high-performing web and mobile applications."
        url="https://princesahni.com/skills"
        image="https://princesahni.com/og-images/princesahni-logo.png"
      />

      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="max-w-2xl">
            <span className="font-mono text-xs uppercase tracking-[0.12em] text-primary">Capabilities</span>
            <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-foreground md:text-6xl">
              The stack I <span className="text-gradient">build</span> with.
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              A living toolkit sharpened across production apps — frontend to cloud.
            </p>
          </div>

          <div className="mt-10">
            <StatStrip items={stats} />
          </div>
        </div>

        <div className="container mx-auto mt-12 px-6">
          {isLoading ? (
            <Skeleton variant="card" count={4} />
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              {categories.map((category, i) => (
                <Reveal key={category.id} delay={(i % 2) * 0.06}>
                  <div className="group h-full rounded-xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_20px_50px_-30px_hsl(var(--primary)/0.4)] motion-reduce:hover:translate-y-0">
                    <div className="flex items-baseline gap-3">
                      <span className="font-mono text-xs text-primary">{String(i + 1).padStart(2, "0")}</span>
                      <h2 className="font-display text-xl text-foreground">{category.name}</h2>
                    </div>
                    {category.description ? (
                      <p className="mt-2 text-sm text-muted-foreground">{category.description}</p>
                    ) : null}
                    <div className="mt-5 flex flex-wrap gap-2">
                      {category.skills.map((skill) => {
                        const Icon = iconMap[skill.icon] ?? Code;
                        return (
                          <span
                            key={skill.name}
                            className="inline-flex items-center rounded-lg border border-border bg-background px-3 py-1.5 font-mono text-xs text-foreground transition-colors hover:border-primary/50 hover:text-primary"
                          >
                            <Icon aria-hidden="true" className="mr-2 h-3.5 w-3.5 text-primary" />
                            {skill.name}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          )}

          {/* Continuous learning */}
          <div className="mt-14 rounded-xl border border-dashed border-border p-6">
            <h2 className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary motion-reduce:animate-none" />
              Currently exploring
            </h2>
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
    </>
  );
};

export default Skills;
