import { Link } from "react-router-dom";
import { mockProjects } from "@/data/portfolioData";
import { useResource } from "@/hooks/useResource";
import { SectionHeader } from "@/components/ui/primitives/SectionHeader";
import { Skeleton } from "@/components/ui/primitives/Skeleton";
import { Reveal } from "@/components/ui/primitives/Reveal";
import { ProjectCard, type ProjectCardData } from "@/components/cards/ProjectCard";

const ProjectsSection = () => {
  const { data: projects, isLoading } = useResource<ProjectCardData[]>(
    ["projects"],
    import.meta.env.VITE_PROJECT_URL,
    { fallback: mockProjects, timeoutMs: 3000 },
  );

  return (
    <section id="projects-section" className="container mx-auto px-6 py-20">
      <SectionHeader index="01" title="Selected Work" action={<Link to="/projects">all projects →</Link>} />
      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        {isLoading
          ? <Skeleton variant="card" count={4} />
          : projects.slice(0, 4).map((project, i) => (
              <Reveal key={project.id ?? i} delay={(i % 2) * 0.06}>
                <ProjectCard project={project} index={i} />
              </Reveal>
            ))}
      </div>
    </section>
  );
};

export default ProjectsSection;
