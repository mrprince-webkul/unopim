import { Link } from "react-router-dom";
import { useResource } from "@/hooks/useResource";
import { SectionHeader } from "@/components/ui/primitives/SectionHeader";
import { Reveal } from "@/components/ui/primitives/Reveal";

interface Course {
  id?: number | string;
  title: string;
  description: string;
  level?: string;
  slug?: string;
  duration?: string;
}

const fallbackCourses: Course[] = [
  {
    slug: "react-complete-guide",
    title: "React — The Complete Guide",
    description: "From fundamentals to advanced patterns, hooks, and real-world performance.",
    level: "Intermediate",
    duration: "12h",
  },
  {
    slug: "nodejs-masterclass",
    title: "Node.js Masterclass",
    description: "Build scalable REST and realtime APIs with Express and MongoDB.",
    level: "Intermediate",
    duration: "10h",
  },
  {
    slug: "fullstack-mern-bootcamp",
    title: "Full-Stack MERN Bootcamp",
    description: "Ship production-grade full-stack applications end to end.",
    level: "Advanced",
    duration: "18h",
  },
];

const CoursesSection = () => {
  const { data } = useResource<Course[]>(
    ["courses"],
    import.meta.env.VITE_COURSE_URL,
    { fallback: fallbackCourses, timeoutMs: 2000 },
  );

  return (
    <section id="courses" className="container mx-auto px-6 py-20">
      <SectionHeader index="05" title="Courses" action={<Link to="/courses">all courses →</Link>} />
      <div className="mt-8 grid gap-5 md:grid-cols-3">
        {data.slice(0, 3).map((course, i) => (
          <Reveal key={course.slug ?? course.id ?? i} delay={i * 0.06}>
            <Link
              to={course.slug ? `/courses/${course.slug}` : "/courses"}
              className="group flex h-full flex-col rounded-xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:border-primary/50 motion-reduce:hover:translate-y-0"
            >
              <div className="flex items-center justify-between font-mono text-xs text-muted-foreground">
                <span className="text-primary">{course.level ?? "Course"}</span>
                {course.duration ? <span>{course.duration}</span> : null}
              </div>
              <h3 className="mt-3 font-display text-xl text-foreground">{course.title}</h3>
              <p className="mt-2 flex-1 text-sm text-muted-foreground">{course.description}</p>
              <span className="mt-5 font-mono text-xs text-primary transition-transform group-hover:translate-x-0.5">
                Start learning →
              </span>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
};

export default CoursesSection;
