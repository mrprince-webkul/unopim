import { Seo } from "@/components/seo";
import HeroSection from "@/components/sections/HeroSection";
import ProjectsSection from "@/components/sections/ProjectsSection";
import ExperienceSection from "@/components/sections/ExperienceSection";
import SkillsSection from "@/components/sections/SkillsSection";
import WritingSection from "@/components/sections/WritingSection";
import CoursesSection from "@/components/sections/CoursesSection";
import AboutSection from "@/components/sections/AboutSection";
import CtaSection from "@/components/sections/CtaSection";

const Home = () => (
  <>
    <Seo
      title="Prince Kumar Sahni | Software Engineer"
      description="Passionate Software Engineer specializing in building scalable, secure, and high-performing web and mobile applications. Turning innovative ideas into impactful digital products."
      url="https://princesahni.com"
      image="https://princesahni.com/og-images/princesahni-logo.png"
    />

    <HeroSection />
    <ProjectsSection />
    <ExperienceSection />
    <SkillsSection />
    <WritingSection />
    <CoursesSection />
    <AboutSection />
    <CtaSection />
  </>
);

export default Home;
