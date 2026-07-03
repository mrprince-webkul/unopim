import { Seo } from "@/components/seo";
import { useResource } from "@/hooks/useResource";
import { SectionHeader } from "@/components/ui/primitives/SectionHeader";
import { PostCard } from "@/components/ui/primitives/PostCard";
import { StatStrip } from "@/components/ui/primitives/StatStrip";
import { Skeleton } from "@/components/ui/primitives/Skeleton";
import placeholder from "@/assets/placeholder.jpg";

interface Course {
  id?: number | string;
  slug: string;
  title: string;
  description: string;
  coverImage?: string;
  isVisible?: boolean;
  tags?: string[];
  level: string;
  featured?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const fallback: Course[] = [
  {
    id: 1,
    slug: "react-complete-guide",
    title: "React.js Complete Guide",
    description:
      "Learn React from scratch and master modern frontend development with hooks, context API, and more.",
    coverImage: placeholder,
    isVisible: true,
    tags: ["React", "JavaScript", "Frontend"],
    level: "Beginner to Advanced",
    featured: true,
    createdAt: "2025-10-01",
    updatedAt: "2025-10-01",
  },
  {
    id: 2,
    slug: "nodejs-masterclass",
    title: "Node.js Masterclass",
    description:
      "Build scalable backend APIs using Node.js, Express.js, and MongoDB with real-world projects.",
    coverImage: placeholder,
    isVisible: true,
    tags: ["Node.js", "Express", "Backend"],
    level: "Intermediate to Advanced",
    featured: true,
    createdAt: "2025-10-01",
    updatedAt: "2025-10-01",
  },
  {
    id: 3,
    slug: "javascript-fundamentals",
    title: "JavaScript Fundamentals",
    description:
      "Understand the core concepts of JavaScript — variables, functions, DOM, and ES6 features.",
    coverImage: placeholder,
    isVisible: true,
    tags: ["JavaScript", "ES6", "Frontend"],
    level: "Beginner",
    featured: false,
    createdAt: "2025-10-01",
    updatedAt: "2025-10-01",
  },
  {
    id: 4,
    slug: "fullstack-mern-bootcamp",
    title: "Full Stack MERN Bootcamp",
    description:
      "Master MongoDB, Express, React, and Node.js by building a production-ready full stack application.",
    coverImage: placeholder,
    isVisible: true,
    tags: ["MERN", "React", "Node.js", "MongoDB"],
    level: "Intermediate to Advanced",
    featured: false,
    createdAt: "2025-10-01",
    updatedAt: "2025-10-01",
  },
  {
    id: 5,
    slug: "python-for-beginners",
    title: "Python for Beginners",
    description:
      "Start your programming journey by learning Python fundamentals, syntax, and basic projects.",
    coverImage: placeholder,
    isVisible: true,
    tags: ["Python", "Programming", "Beginner"],
    level: "Beginner",
    featured: false,
    createdAt: "2025-10-01",
    updatedAt: "2025-10-01",
  },
  {
    id: 6,
    slug: "typescript-crash-course",
    title: "TypeScript Crash Course",
    description:
      "Learn TypeScript and bring type safety and scalability to your JavaScript projects.",
    coverImage: placeholder,
    isVisible: true,
    tags: ["TypeScript", "JavaScript", "Frontend"],
    level: "Intermediate",
    featured: false,
    createdAt: "2025-10-01",
    updatedAt: "2025-10-01",
  },
  {
    id: 7,
    slug: "android-development-with-kotlin",
    title: "Android Development with Kotlin",
    description:
      "Build beautiful native Android apps using Kotlin, Jetpack Compose, and modern Android tools.",
    coverImage: placeholder,
    isVisible: true,
    tags: ["Kotlin", "Android", "Jetpack Compose"],
    level: "Intermediate to Advanced",
    featured: false,
    createdAt: "2025-10-01",
    updatedAt: "2025-10-01",
  },
  {
    id: 8,
    slug: "nextjs-advanced-guide",
    title: "Next.js Advanced Guide",
    description:
      "Learn advanced concepts in Next.js including SSR, ISR, API routes, and authentication.",
    coverImage: placeholder,
    isVisible: true,
    tags: ["Next.js", "React", "Fullstack"],
    level: "Advanced",
    featured: false,
    createdAt: "2025-10-01",
    updatedAt: "2025-10-01",
  },
  {
    id: 9,
    slug: "database-design-sql",
    title: "Database Design & SQL Mastery",
    description:
      "Understand relational databases, normalization, and write efficient SQL queries.",
    coverImage: placeholder,
    isVisible: true,
    tags: ["SQL", "Database", "Backend"],
    level: "Intermediate",
    featured: false,
    createdAt: "2025-10-01",
    updatedAt: "2025-10-01",
  },
  {
    id: 10,
    slug: "devops-docker-kubernetes",
    title: "DevOps with Docker & Kubernetes",
    description:
      "Learn how to containerize applications, deploy microservices, and manage infrastructure with Kubernetes.",
    coverImage: placeholder,
    isVisible: true,
    tags: ["DevOps", "Docker", "Kubernetes"],
    level: "Advanced",
    featured: true,
    createdAt: "2025-10-01",
    updatedAt: "2025-10-01",
  },
];

const stats = [
  { value: "1000+", label: "Total Students" },
  { value: "15+", label: "Courses Created" },
  { value: "4.8", label: "Average Rating" },
  { value: "100+", label: "Hours of Content" },
];

const Courses = () => {
  const { data, isLoading } = useResource<Course[]>(
    ["courses"],
    import.meta.env.VITE_COURSE_URL,
    { fallback, timeoutMs: 2000 },
  );

  const courseData = data ?? [];
  const featuredCourses = courseData.filter((course) => course.featured);

  return (
    <>
      <Seo
        title="Courses | Learn with Prince Kumar Sahni"
        description="Learn programming, software engineering, and modern development practices with Prince Kumar Sahni through high-quality, practical courses."
        url="https://princesahni.com/courses"
        image="https://princesahni.com/og-images/princesahni-logo.png"
      />

      <section className="container mx-auto px-6 py-16">
        <div className="max-w-2xl">
          <span className="font-mono text-xs uppercase tracking-[0.1em] text-primary">
            Learn &amp; Grow
          </span>
          <h1 className="mt-3 font-display text-4xl text-foreground md:text-5xl">
            Courses
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            Comprehensive courses designed to help developers master modern
            web technologies and advance their careers in software
            development.
          </p>
        </div>

        <div className="mt-10">
          <StatStrip items={stats} />
        </div>

        {isLoading ? (
          <div className="mt-16">
            <Skeleton variant="card" count={4} />
          </div>
        ) : (
          <>
            {featuredCourses.length > 0 && (
              <div className="mt-16">
                <SectionHeader index="01" title="Featured" />
                <div className="mt-6 grid gap-6 md:grid-cols-2">
                  {featuredCourses.slice(0, 2).map((course) => (
                    <PostCard
                      key={course.slug}
                      kind="Course"
                      readTime={course.level}
                      title={course.title}
                      description={course.description}
                      tags={course.tags ?? []}
                      href={`/courses/${course.slug}`}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="mt-16">
              <SectionHeader index="02" title="All Courses" />
              <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {courseData.map((course) => (
                  <PostCard
                    key={course.slug}
                    kind="Course"
                    readTime={course.level}
                    title={course.title}
                    description={course.description}
                    tags={course.tags ?? []}
                    href={`/courses/${course.slug}`}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </section>
    </>
  );
};

export default Courses;
