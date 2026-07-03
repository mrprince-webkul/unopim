import { Link } from "react-router-dom";
import {
  Download,
  Mail,
  Phone,
  MapPin,
  Globe,
  Linkedin,
  Github,
  ExternalLink,
} from "lucide-react";
import { Seo } from "@/components/seo";
import { SectionHeader } from "@/components/ui/primitives/SectionHeader";
import { WorkRow } from "@/components/ui/primitives/WorkRow";
import { Chip } from "@/components/ui/primitives/Chip";
import { Tag } from "@/components/ui/primitives/Tag";
import { Button } from "@/components/ui/primitives/Button";
import { personalInfo, experiences, education } from "@/data/portfolioData";

const skills = {
  Frontend: [
    "React",
    "Vue.js",
    "TypeScript",
    "JavaScript",
    "HTML/CSS",
    "Tailwind CSS",
    "Next.js",
  ],
  Backend: [
    "Node.js",
    "Express.js",
    "Python",
    "REST APIs",
    "GraphQL",
    "Microservices",
  ],
  Database: ["PostgreSQL", "MongoDB", "Redis", "Prisma", "MySQL"],
  "DevOps & Tools": ["Docker", "AWS", "CI/CD", "Git", "Linux", "Nginx"],
  Testing: [
    "Jest",
    "Cypress",
    "Testing Library",
    "Unit Testing",
    "E2E Testing",
  ],
};

const projects = [
  {
    name: "Code Rev",
    description:
      "An online platform where developers can share, review, and discover code snippets. Includes real-time commenting and user authentication.",
    technologies: [
      "React",
      "Node.js",
      "MongoDB",
      "Express.js",
      "Vercel",
      "Cloudinary",
    ],
    impact: "500+ users sharing and reviewing code with real-time updates",
  },
  {
    name: "AI Image Generation Platform",
    description:
      "A web application where users can generate AI-powered images and browse curated categories, with admin upload and management features.",
    technologies: [
      "Next.js",
      "Node.js",
      "Cloudinary",
      "React Query",
      "Express.js",
    ],
    impact:
      "Serves hundreds of AI-generated images daily with organized category structure",
  },
  {
    name: "YouTune",
    description:
      "A non-stop YouTube playlist player app for Android, allowing users to queue videos and play them continuously without interruption.",
    technologies: [
      "Kotlin",
      "Jetpack Compose",
      "YouTube API",
      "Android Studio",
    ],
    impact:
      "Improved user experience for continuous video playback on mobile",
  },
  {
    name: "Habit Tracker App",
    description:
      "A simple Android app to track daily habits, view history, and measure progress over time. Built with Jetpack Compose and Kotlin.",
    technologies: ["Kotlin", "Jetpack Compose", "Android Studio"],
    impact: "Helps users track and improve daily habits efficiently",
  },
  {
    name: "DevLink – Developer Profile Directory",
    description:
      "A web app to create and browse developer profiles. Built to strengthen understanding of Next.js and full-stack development.",
    technologies: ["Next.js", "React", "Node.js", "MongoDB", "Vercel"],
    impact: "Simplifies networking by centralizing developer profiles",
  },
];

const certifications = [
  {
    name: "AWS Certified Developer Associate",
    issuer: "Amazon Web Services",
    date: "2023",
    credentialId: "AWS-CDA-2023-001",
  },
  {
    name: "Google Cloud Professional Developer",
    issuer: "Google Cloud",
    date: "2022",
    credentialId: "GCP-PD-2022-001",
  },
  {
    name: "Meta Frontend Developer Certificate",
    issuer: "Meta",
    date: "2021",
    credentialId: "META-FE-2021-001",
  },
];

const Resume = () => {
  return (
    <>
      <Seo
        title="Resume | Prince Kumar Sahni - Software Engineer"
        description="View the professional resume of Prince Kumar Sahni, a Software Engineer experienced in building scalable, secure, and high-performing web and mobile applications."
        url="https://princesahni.com/resume"
        image="https://princesahni.com/og-images/princesahni-logo.png"
      />

      <section className="container mx-auto max-w-4xl px-6 py-16">
        {/* Header */}
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <span className="font-mono text-xs uppercase tracking-[0.1em] text-primary">
              Résumé
            </span>
            <h1 className="mt-3 font-display text-4xl text-foreground md:text-5xl">
              {personalInfo.name}
            </h1>
            <p className="mt-2 text-lg text-muted-foreground">
              {personalInfo.title}
            </p>
          </div>
          <Button asChild variant="primary">
            <a href={personalInfo.resumeUrl} target="_blank" rel="noreferrer" download>
              <Download className="h-4 w-4" />
              Download PDF
            </a>
          </Button>
        </div>

        {/* Contact row */}
        <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 border-y border-border py-5 font-mono text-xs text-muted-foreground">
          <a
            href={`mailto:${personalInfo.email}`}
            className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
          >
            <Mail className="h-3.5 w-3.5 text-primary" />
            {personalInfo.email}
          </a>
          <a
            href={`tel:${personalInfo.phone}`}
            className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
          >
            <Phone className="h-3.5 w-3.5 text-primary" />
            {personalInfo.phone}
          </a>
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-primary" />
            {personalInfo.location}
          </span>
          <a
            href={personalInfo.website}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
          >
            <Globe className="h-3.5 w-3.5 text-primary" />
            {personalInfo.website.replace(/^https?:\/\//, "")}
          </a>
          <a
            href={personalInfo.linkedin}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
          >
            <Linkedin className="h-3.5 w-3.5 text-primary" />
            LinkedIn
          </a>
          <a
            href={personalInfo.github}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
          >
            <Github className="h-3.5 w-3.5 text-primary" />
            GitHub
          </a>
        </div>

        {/* Experience */}
        <div className="mt-12">
          <SectionHeader index="01" title="Professional Experience" />
          <div className="mt-6 space-y-10">
            {experiences.map((job) => (
              <div key={`${job.title}-${job.company}`}>
                <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-baseline">
                  <div>
                    <h3 className="font-display text-lg text-foreground">
                      {job.title}
                    </h3>
                    <p className="font-mono text-xs text-primary">
                      {job.company} · {job.location}
                    </p>
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">
                    {job.period}
                  </span>
                </div>
                <p className="mt-3 text-muted-foreground">{job.description}</p>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {job.achievements.map((achievement) => (
                    <li key={achievement}>{achievement}</li>
                  ))}
                </ul>
                <div className="mt-4 flex flex-wrap gap-2">
                  {job.technologies.map((tech) => (
                    <Tag key={tech}>{tech}</Tag>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Education */}
        <div className="mt-12">
          <SectionHeader index="02" title="Education" />
          <div className="mt-6 space-y-6">
            {education.map((edu) => (
              <div key={edu.degree}>
                <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-baseline">
                  <div>
                    <h3 className="font-display text-lg text-foreground">
                      {edu.degree}
                    </h3>
                    <p className="font-mono text-xs text-primary">
                      {edu.institution} · {edu.location}
                    </p>
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">
                    {edu.period} · GPA {edu.gpa}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {edu.relevant.map((course) => (
                    <Tag key={course}>{course}</Tag>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Skills */}
        <div className="mt-12">
          <SectionHeader index="03" title="Technical Skills" />
          <div className="mt-6 space-y-6">
            {Object.entries(skills).map(([category, skillList]) => (
              <div key={category}>
                <h3 className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
                  {category}
                </h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {skillList.map((skill) => (
                    <Chip key={skill}>{skill}</Chip>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Projects */}
        <div className="mt-12">
          <SectionHeader index="04" title="Notable Projects" />
          <div className="mt-2">
            {projects.map((project, index) => (
              <WorkRow
                key={project.name}
                index={String(index + 1).padStart(2, "0")}
                title={project.name}
                description={project.description}
                tags={[project.impact, ...project.technologies.slice(0, 3)]}
              />
            ))}
          </div>
        </div>

        {/* Certifications */}
        <div className="mt-12">
          <SectionHeader index="05" title="Certifications" />
          <div className="mt-6 space-y-5">
            {certifications.map((cert) => (
              <div
                key={cert.name}
                className="flex flex-col justify-between gap-1 sm:flex-row sm:items-center"
              >
                <div>
                  <h3 className="font-display text-base text-foreground">
                    {cert.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">{cert.issuer}</p>
                </div>
                <div className="font-mono text-xs text-muted-foreground sm:text-right">
                  <div>{cert.date}</div>
                  <div>ID: {cert.credentialId}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Contact CTA */}
        <div className="mt-16 flex flex-col items-center gap-4 rounded-xl border border-border bg-card px-6 py-10 text-center">
          <p className="font-display text-xl text-foreground md:text-2xl">
            Let's Connect &amp; Collaborate!
          </p>
          <p className="max-w-md font-mono text-xs text-muted-foreground">
            I'm always open to contributing to open-source projects, joining
            hackathons, and sharing knowledge on tech topics. If that sounds
            exciting to you, let's connect!
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="primary">
              <Link to="/contact">
                <Mail className="h-4 w-4" />
                Get in Touch
              </Link>
            </Button>
            <Button asChild variant="ghost">
              <Link to="/projects">
                <ExternalLink className="h-4 w-4" />
                View Projects
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
};

export default Resume;
