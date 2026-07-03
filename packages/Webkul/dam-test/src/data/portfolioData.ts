// ═══════════════════════════════════════════════
// Centralized Portfolio Data
// All personal data, experience, skills, projects
// ═══════════════════════════════════════════════

export const personalInfo = {
  name: "Prince Kumar Sahni",
  title: "Software Engineer",
  taglines: [
    "Software Engineer",
    "Full-Stack Developer",
    "Cloud Architect",
    "Open Source Contributor",
    "Lifelong Learner",
  ],
  email: "princekrdss2018@gmail.com",
  phone: "+91 7369900185",
  location: "New Delhi, India",
  website: "https://princesahni.com",
  linkedin: "https://www.linkedin.com/in/mrprince123/",
  github: "https://github.com/mrprince123",
  instagram: "https://www.instagram.com/_mrprince123_/",
  medium: "https://medium.com/@mrprince123",
  twitter: "https://twitter.com/MrPrince185",
  resumeUrl: "https://drive.google.com/file/d/1PhoLHI29R9_bo1wT9h42XBmftDb6wT1Y/view?usp=drive_link",
  resumePreviewUrl: "https://drive.google.com/file/d/1PhoLHI29R9_bo1wT9h42XBmftDb6wT1Y/preview",
  bio: `Hi! I'm Prince Kumar Sahni, a passionate Software Engineer who loves building impactful digital products. Over the past few years, I've worked on everything from Android apps to full-stack web platforms, always focusing on performance, scalability, and user experience.`,
  bioExtended: `I take pride in approaching every project with a problem-solving mindset. Whether it's optimizing performance, designing scalable architectures, or debugging complex issues, I enjoy breaking down challenges into clear, actionable steps. My focus is always on writing clean, efficient, and maintainable code that drives real results.`,
  bioCreative: `Beyond coding, I love sharing knowledge and creativity in different forms. I write tech articles on Medium, create videos on my YouTube channel, and explore the world through my lens as a passionate photographer. I'm also an audiophile who appreciates good sound and contribute as a Local Guide on Google Maps, where my photos and reviews have crossed over 600K+ views.`,
};

export const stats = [
  { number: "2+", label: "Years Experience", description: "Building modern web applications" },
  { number: "10+", label: "Projects Built", description: "Delivered across various industries" },
  { number: "20+", label: "Technologies", description: "From frontend to backend expertise" },
  { number: "15+", label: "Articles Written", description: "Sharing knowledge with the community" },
];

export const experiences = [
  {
    title: "Associate Software Developer",
    company: "Webkul Software Pvt Ltd.",
    location: "Noida, UP",
    period: "April 2025 - Present",
    description: "Leading development of scalable web applications serving 100k+ users. Architected microservices infrastructure and mentored junior developers.",
    achievements: [
      "Improved application performance by 40% through code optimization and caching strategies",
      "Led migration from monolithic to microservices architecture",
      "Mentored 5 junior developers and established code review processes",
      "Implemented CI/CD pipelines reducing deployment time by 60%",
    ],
    technologies: ["React", "Node.js", "TypeScript", "AWS", "Docker", "PostgreSQL"],
  },
  {
    title: "Trainee Software Developer",
    company: "Chetu Inc",
    location: "Noida, UP",
    period: "Jun 2024 - Dec 2024",
    description: "Built and maintained multiple web applications for early-stage startup. Collaborated closely with product team to deliver features rapidly.",
    achievements: [
      "Developed MVP that secured $2M Series A funding",
      "Built real-time chat system handling 10k+ concurrent users",
      "Reduced page load times by 50% through performance optimization",
      "Implemented automated testing increasing code coverage to 90%",
    ],
    technologies: ["Vue.js", "Express.js", "MongoDB", "Socket.io", "Redis", "Heroku"],
  },
  {
    title: "Full Stack Developer",
    company: "Webbocket Pvt Ltd",
    location: "Bhubaneswar, Odisha",
    period: "April 2023 - Sept 2023",
    description: "Developed responsive user interfaces for various client projects. Worked closely with designers to implement pixel-perfect designs.",
    achievements: [
      "Delivered 15+ client projects on time and within budget",
      "Improved client satisfaction scores by 25%",
      "Created reusable component library used across projects",
      "Trained team on modern JavaScript frameworks and best practices",
    ],
    technologies: ["React", "JavaScript", "Sass", "Webpack", "Figma", "Adobe XD"],
  },
];

export const education = [
  {
    degree: "Bachelor of Science in Computer Science",
    institution: "Biju Patnaik University of Technology",
    location: "Bhubaneswar, Odisha",
    period: "2020 - 2024",
    gpa: "8.4/10",
    honors: "Graduated with CSE",
    relevant: ["Data Structures & Algorithms", "Software Engineering", "Database Systems", "Web Development"],
  },
];

export const skillCategories = [
  {
    name: "Frontend Development",
    description: "Modern client-side technologies and frameworks",
    skills: [
      { name: "React", icon: "Atom", color: "#61DAFB" },
      { name: "TypeScript", icon: "FileCode", color: "#3178C6" },
      { name: "Next.js", icon: "Zap", color: "#ffffff" },
      { name: "Tailwind CSS", icon: "Palette", color: "#06B6D4" },
      { name: "JavaScript", icon: "Code", color: "#F7DF1E" },
      { name: "HTML/CSS", icon: "Layout", color: "#E34F26" },
      { name: "Vue.js", icon: "Component", color: "#4FC08D" },
    ],
  },
  {
    name: "Backend Development",
    description: "Server-side technologies and APIs",
    skills: [
      { name: "Node.js", icon: "Server", color: "#339933" },
      { name: "Express.js", icon: "Layers", color: "#ffffff" },
      { name: "Python", icon: "Snake", color: "#3776AB" },
      { name: "REST APIs", icon: "Globe", color: "#00f0ff" },
      { name: "GraphQL", icon: "Network", color: "#E10098" },
      { name: "Microservices", icon: "Boxes", color: "#8b5cf6" },
    ],
  },
  {
    name: "Database Technologies",
    description: "Data storage and management solutions",
    skills: [
      { name: "PostgreSQL", icon: "Database", color: "#4169E1" },
      { name: "MongoDB", icon: "Leaf", color: "#47A248" },
      { name: "Redis", icon: "Zap", color: "#DC382D" },
      { name: "MySQL", icon: "Cylinder", color: "#4479A1" },
      { name: "Prisma", icon: "Triangle", color: "#2D3748" },
    ],
  },
  {
    name: "DevOps & Cloud",
    description: "Infrastructure, deployment, and cloud platforms",
    skills: [
      { name: "Docker", icon: "Container", color: "#2496ED" },
      { name: "AWS", icon: "Cloud", color: "#FF9900" },
      { name: "Kubernetes", icon: "Boxes", color: "#326CE5" },
      { name: "GitHub Actions", icon: "GitBranch", color: "#2088FF" },
      { name: "CI/CD", icon: "GitCommit", color: "#00f0ff" },
      { name: "Nginx", icon: "Server", color: "#009639" },
    ],
  },
  {
    name: "Tools & Development",
    description: "Development tools, testing, and productivity",
    skills: [
      { name: "Git", icon: "GitBranch", color: "#F05032" },
      { name: "VS Code", icon: "Code2", color: "#007ACC" },
      { name: "Jest", icon: "TestTube", color: "#C21325" },
      { name: "Figma", icon: "Figma", color: "#F24E1E" },
      { name: "Postman", icon: "Send", color: "#FF6C37" },
      { name: "Webpack", icon: "Package", color: "#8DD6F9" },
    ],
  },
];

export const interests = [
  "Open Source Contributing",
  "Technical Writing",
  "AI/ML Research",
  "Mobile App Development",
  "Medium Articles",
  "Google Maps Local Guide",
  "Photography",
  "Audiophile",
  "Cricket",
  "Hiking",
  "Chess",
];

export const learningTech = [
  "AI/ML", "Web3", "Rust", "Go", "Kubernetes", "Microservices", "GraphQL", "Blockchain",
];

export const contactInfo = [
  {
    icon: "Mail",
    label: "Email",
    value: "princekrdss2018@gmail.com",
    href: "mailto:princekrdss2018@gmail.com",
  },
  {
    icon: "Phone",
    label: "Phone",
    value: "+91 7369900185",
    href: "tel:+917369900185",
  },
  {
    icon: "MapPin",
    label: "Location",
    value: "New Delhi, India",
    href: "#",
  },
];

export const socialLinks = [
  { name: "GitHub", href: "https://github.com/mrprince123", icon: "Github" },
  { name: "LinkedIn", href: "https://www.linkedin.com/in/mrprince123/", icon: "Linkedin" },
  { name: "Instagram", href: "https://www.instagram.com/_mrprince123_/", icon: "Instagram" },
  { name: "Medium", href: "https://medium.com/@mrprince123", icon: "MessageCircle" },
  { name: "Twitter", href: "https://twitter.com/MrPrince185", icon: "Twitter" },
];

export const navLinks = [
  { name: "About", href: "/about" },
  { name: "Skills", href: "/skills" },
  { name: "Projects", href: "/projects" },
  { name: "Articles", href: "/articles" },
  { name: "Courses", href: "/courses" },
  { name: "Contact", href: "/contact" },
];

// Mock projects (used as fallback when API is unavailable)
export const mockProjects = [
  {
    id: 7,
    title: "AI Image Generator",
    description: "A web app that allows users to generate stunning AI-powered images using text prompts. Includes image history, download options, and category-based organization.",
    coverImage: "",
    category: "fullstack",
    technologies: ["Next.js", "Node.js", "Cloudinary", "OpenAI API", "MongoDB"],
    liveUrl: "#",
    githubUrl: "#",
    featured: true,
  },
  {
    id: 8,
    title: "Fitness Tracker App",
    description: "Native Android fitness tracking app with daily goals, activity insights, and progress analytics using Jetpack Compose and Room Database.",
    coverImage: "",
    category: "android",
    technologies: ["Kotlin", "Jetpack Compose", "Room DB", "Firebase", "MVVM"],
    liveUrl: "#",
    githubUrl: "#",
    featured: false,
  },
  {
    id: 9,
    title: "DevLink – Developer Directory",
    description: "A platform to explore and connect with developers worldwide. Features profile creation, project showcase, and skill-based filtering.",
    coverImage: "",
    category: "web",
    technologies: ["Next.js", "Prisma", "PostgreSQL", "Tailwind CSS"],
    liveUrl: "#",
    githubUrl: "#",
    featured: true,
  },
  {
    id: 10,
    title: "Code Rev – AI Code Review Platform",
    description: "An AI-powered platform that reviews code, detects bugs, and provides best-practice recommendations instantly.",
    coverImage: "",
    category: "fullstack",
    technologies: ["React", "Node.js", "Express", "MongoDB", "OpenAI API"],
    liveUrl: "#",
    githubUrl: "#",
    featured: true,
  },
];

// Mock articles (used as fallback when API is unavailable)
export const mockArticles = [
  {
    id: 1,
    title: "The Future of React: Server Components and Concurrent Features",
    description: "Exploring how React Server Components and Concurrent Features are reshaping the way we build modern web applications.",
    coverImage: "",
    publishedAt: "2023-12-20",
    articleLink: "https://medium.com/@mrprince123/react-server-components",
    tags: ["React", "JavaScript", "Frontend"],
    featured: true,
    readTime: "5 mins",
  },
  {
    id: 2,
    title: "Python FastAPI: Building High-Performance APIs Quickly",
    description: "Learn how to leverage FastAPI to create fast, modern, and scalable web APIs in Python with automatic documentation and async support.",
    coverImage: "",
    publishedAt: "2024-01-15",
    articleLink: "https://medium.com/@mrprince123/python-fastapi-guide",
    tags: ["Python", "FastAPI", "Backend"],
    featured: true,
    readTime: "7 mins",
  },
  {
    id: 3,
    title: "Mastering TypeScript: Tips and Tricks for Scalable Applications",
    description: "A deep dive into TypeScript best practices, advanced types, and patterns for building maintainable and large-scale applications.",
    coverImage: "",
    publishedAt: "2024-02-10",
    articleLink: "https://medium.com/@mrprince123/typescript-tips",
    tags: ["TypeScript", "JavaScript", "Web Development"],
    featured: false,
    readTime: "6 mins",
  },
];

export const devQuotes = [
  "First, solve the problem. Then, write the code.",
  "Code is like humor. When you have to explain it, it's bad.",
  "It's not a bug — it's an undocumented feature.",
];

export const codeSnippets = [
  `const deploy = async () => {\n  await build();\n  await test();\n  return "🚀 Live!";\n};`,
  `interface Developer {\n  name: "Prince";\n  passion: "∞";\n  coffee: number;\n}`,
  `app.listen(3000, () => {\n  console.log("Server ready");\n});`,
  `SELECT * FROM skills\nWHERE level = 'expert'\nORDER BY experience DESC;`,
  `docker build -t portfolio .\ndocker push registry/app`,
  `git commit -m "feat: ✨"\ngit push origin main`,
];
