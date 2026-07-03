import { Seo } from "@/components/seo";
import { useResource } from "@/hooks/useResource";
import { useState } from "react";
import { motion } from "framer-motion";
import { EmptyState } from "@/components/ui/primitives/EmptyState";
import { Skeleton } from "@/components/ui/primitives/Skeleton";
import { Reveal } from "@/components/ui/primitives/Reveal";
import { AnimatedNumber } from "@/components/ui/primitives/AnimatedNumber";
import { ProjectCard, type ProjectCardData } from "@/components/cards/ProjectCard";
import { cn } from "@/lib/utils";

type PageProject = ProjectCardData & { category?: string };

const fallback: PageProject[] = [
  {
    id: 7,
    title: "AI Image Generator",
    description:
      "A web app that allows users to generate stunning AI-powered images using text prompts. Includes image history, download options, and category-based organization.",
    category: "web",
    technologies: ["Next.js", "Node.js", "Cloudinary", "OpenAI API", "MongoDB"],
    liveUrl: "#",
    githubUrl: "#",
    featured: true,
  },
  {
    id: 8,
    title: "Fitness Tracker App",
    description:
      "Native Android fitness tracking app with daily goals, activity insights, and progress analytics using Jetpack Compose and Room Database.",
    category: "android",
    technologies: ["Kotlin", "Jetpack Compose", "Room DB", "Firebase", "MVVM"],
    liveUrl: "#",
    githubUrl: "#",
    featured: false,
  },
  {
    id: 9,
    title: "DevLink – Developer Directory",
    description:
      "A platform to explore and connect with developers worldwide. Features profile creation, project showcase, and skill-based filtering.",
    category: "web",
    technologies: ["Next.js", "Prisma", "PostgreSQL", "Tailwind CSS"],
    liveUrl: "#",
    githubUrl: "#",
    featured: true,
  },
  {
    id: 10,
    title: "Code Rev – AI Code Review Platform",
    description:
      "An AI-powered platform that reviews code, detects bugs, and provides best-practice recommendations instantly.",
    category: "web",
    technologies: ["React", "Node.js", "Express", "MongoDB", "OpenAI API"],
    liveUrl: "#",
    githubUrl: "#",
    featured: true,
  },
  {
    id: 11,
    title: "Blogify – Modern Blogging Platform",
    description:
      "A sleek blogging platform with markdown editor, image uploads, and SEO optimization. Built for creators to publish and grow their audience.",
    category: "web",
    technologies: ["Next.js", "MongoDB", "JWT", "Tailwind CSS"],
    liveUrl: "#",
    githubUrl: "#",
    featured: false,
  },
  {
    id: 12,
    title: "YouTune – Endless YouTube Playlist Player",
    description:
      "An Android app for uninterrupted YouTube playlist playback, allowing users to loop, shuffle, and enjoy continuous music or podcasts.",
    category: "android",
    technologies: ["Kotlin", "Jetpack Compose", "YouTube API", "Coroutines"],
    liveUrl: "#",
    githubUrl: "#",
    featured: true,
  },
];

const categories = [
  { id: "all", label: "All" },
  { id: "web", label: "Full-Stack Web" },
  { id: "android", label: "Android" },
  { id: "cloud", label: "Cloud" },
];

const Projects = () => {
  const [selectedCategory, setSelectedCategory] = useState("all");

  const { data, isLoading } = useResource<PageProject[]>(
    ["projects"],
    import.meta.env.VITE_PROJECT_URL,
    { fallback, timeoutMs: 3000 },
  );

  const projectData = data ?? [];
  const filteredProjects =
    selectedCategory === "all"
      ? projectData
      : projectData.filter((project) => project.category === selectedCategory);

  return (
    <>
      <Seo
        title="Projects | Prince Kumar Sahni - Software Engineer"
        description="Explore projects built by Prince Kumar Sahni showcasing expertise in creating scalable, secure, and high-performing web and mobile applications."
        url="https://princesahni.com/projects"
        image="https://princesahni.com/og-images/princesahni-logo.png"
      />

      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="max-w-2xl">
            <span className="font-mono text-xs uppercase tracking-[0.12em] text-primary">Portfolio</span>
            <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-foreground md:text-6xl">
              Things I've <span className="text-gradient">built</span>.
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              Real-world applications, each a unique challenge in performance, architecture, and craft.
            </p>
            <p className="mt-4 font-mono text-sm text-muted-foreground">
              <AnimatedNumber value={`${projectData.length}`} className="text-foreground" /> projects ·{" "}
              <AnimatedNumber value={`${projectData.filter((p) => p.featured).length}`} className="text-foreground" /> featured
            </p>
          </div>
        </div>

        <div className="container mx-auto mt-10 px-6">
          {/* Animated filter */}
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => {
              const active = selectedCategory === category.id;
              return (
                <button
                  key={category.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSelectedCategory(category.id)}
                  className="relative rounded-lg border border-border px-4 py-2 font-mono text-xs transition-colors"
                >
                  {active ? (
                    <motion.span
                      layoutId="proj-filter-pill"
                      className="absolute inset-0 rounded-lg bg-foreground"
                      transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    />
                  ) : null}
                  <span className={cn("relative z-10", active ? "text-background" : "text-muted-foreground")}>
                    {category.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Card grid */}
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {isLoading ? (
              <Skeleton variant="card" count={6} />
            ) : filteredProjects.length > 0 ? (
              filteredProjects.map((project, i) => (
                <Reveal key={project.id ?? project.title} delay={(i % 3) * 0.05}>
                  <ProjectCard project={project} index={i} />
                </Reveal>
              ))
            ) : (
              <div className="sm:col-span-2 lg:col-span-3">
                <EmptyState title="No projects here yet" hint="Try a different category." />
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
};

export default Projects;
