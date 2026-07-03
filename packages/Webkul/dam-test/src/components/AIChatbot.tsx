import { useEffect, useRef, useState } from "react";
import type { GoogleGenerativeAI as GoogleGenerativeAIClient } from "@google/generative-ai";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X, Send, Bot, User, Sparkles, ChevronDown } from "lucide-react";
import { getResource } from "@/lib/apiClient";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// API URLs from environment
const API_URLS = {
  skills: import.meta.env.VITE_SKILL_URL,
  projects: import.meta.env.VITE_PROJECT_URL,
  articles: import.meta.env.VITE_ARTICLE_URL,
  blogs: import.meta.env.VITE_BLOG_URL,
  courses: import.meta.env.VITE_COURSE_URL,
};

const BASE_PROMPT = `You are an AI assistant on Prince Kumar Sahni's personal portfolio website. Your job is to answer questions about Prince in a friendly, concise, and professional tone.

## Personal
- Full name: Prince Kumar Sahni
- Nickname: Sniper XP
- Role: Software Engineer
- Based in: Noida, India
- Website: https://princesahni.com
- Passionate about: building scalable, secure, and high-performing web and mobile applications
- He is a Lifelong Learner, audiophile, photographer, and content creator
- His Google Maps Local Guide photos and reviews have crossed 600K+ views

## Professional Experience
1. Associate Software Developer at Chetu Inc. (2024 – Present), Noida, India
   - Leading development of scalable web applications using React, Node.js, and cloud technologies
2. Full-Stack Developer at Webbocket (2023 – 2024), Bhubaneswar, Odisha
   - Built and maintained multiple web applications, collaborated with cross-functional teams

## Education
- Bachelor of Science in Computer Science, Biju Patnaik University of Technology (2020–2024), GPA: 8.34/10.0

## Interests & Hobbies
Open Source Contributing, Technical Writing, AI/ML Research, Mobile App Development, Medium Articles, Local Guide at Google Maps, Photography, Audiophile, Cricket, Hiking, Chess

## Content & Social
- Writes tech articles on Medium
- Has a YouTube channel
- Passionate photographer

## Contact
- Email: princekrdss2018@gmail.com
- Phone: +91 7369900185
- Location: New Delhi, India
- Website: https://princesahni.com
- For professional inquiries, visitors can use the /contact page on the website
- He offers a free 30-minute consultation to discuss projects
- Response time: Within 24 hours for email, same day for phone, 1-2 business days for project inquiries
- Currently available for new projects and freelance opportunities

## Social Links
- GitHub: https://github.com/mrprince123
- LinkedIn: https://www.linkedin.com/in/mrprince123/
- Instagram: https://www.instagram.com/_mrprince123_/
- Medium (Articles): https://medium.com/@mrprince123
- Twitter: https://twitter.com/MrPrince185

## Guidelines for your responses:
- Be friendly, helpful, and professional
- Keep answers concise (2–4 sentences) unless the question requires detail
- If asked something not related to Prince, politely say you're only here to answer questions about Prince
- Never make up information not provided to you
- Encourage visitors to explore the portfolio or get in touch
`;

// Loose shapes for the untyped content the API returns; every field is
// optional because the prompt builder guards each access.
interface ServerSkillCategory { name?: string; skillsList?: { name?: string }[] }
interface ServerProject { title?: string; description?: string; technologies?: string[]; liveUrl?: string; githubUrl?: string }
interface ServerArticle { title?: string; tags?: string[]; articleLink?: string }
interface ServerBlog { title?: string; tags?: string[] }
interface ServerCourse { title?: string; description?: string; technologies?: string[] }

// Build dynamic prompt sections from server data
function buildDynamicPrompt(serverData: {
  skills?: ServerSkillCategory[];
  projects?: ServerProject[];
  articles?: ServerArticle[];
  blogs?: ServerBlog[];
  courses?: ServerCourse[];
}): string {
  let dynamicParts = "";

  // Skills
  if (serverData.skills && serverData.skills.length > 0) {
    dynamicParts += "\n## Technical Skills (from server)\n";
    serverData.skills.forEach((category) => {
      const skillNames = category.skillsList
        ?.map((s) => s.name)
        .join(", ");
      if (skillNames) {
        dynamicParts += `- ${category.name}: ${skillNames}\n`;
      }
    });
  }

  // Projects
  if (serverData.projects && serverData.projects.length > 0) {
    dynamicParts += `\n## Projects (${serverData.projects.length} total, from server)\n`;
    serverData.projects.forEach((project) => {
      const techs = project.technologies?.join(", ") || "";
      dynamicParts += `- ${project.title}: ${project.description || ""}`;
      if (techs) dynamicParts += ` [Tech: ${techs}]`;
      if (project.liveUrl && project.liveUrl !== "#")
        dynamicParts += ` [Live: ${project.liveUrl}]`;
      if (project.githubUrl && project.githubUrl !== "#")
        dynamicParts += ` [GitHub: ${project.githubUrl}]`;
      dynamicParts += "\n";
    });
  }

  // Articles
  if (serverData.articles && serverData.articles.length > 0) {
    dynamicParts += `\n## Published Articles (${serverData.articles.length} total, from server)\n`;
    serverData.articles.forEach((article) => {
      dynamicParts += `- "${article.title}"`;
      if (article.tags?.length)
        dynamicParts += ` [Tags: ${article.tags.join(", ")}]`;
      if (article.articleLink)
        dynamicParts += ` [Link: ${article.articleLink}]`;
      dynamicParts += "\n";
    });
  }

  // Blogs
  if (serverData.blogs && serverData.blogs.length > 0) {
    dynamicParts += `\n## Blog Posts (${serverData.blogs.length} total, from server)\n`;
    serverData.blogs.forEach((blog) => {
      dynamicParts += `- "${blog.title}"`;
      if (blog.tags?.length) dynamicParts += ` [Tags: ${blog.tags.join(", ")}]`;
      dynamicParts += "\n";
    });
  }

  // Courses
  if (serverData.courses && serverData.courses.length > 0) {
    dynamicParts += `\n## Courses (${serverData.courses.length} total, from server)\n`;
    serverData.courses.forEach((course) => {
      dynamicParts += `- "${course.title}": ${course.description || ""}`;
      if (course.technologies?.length)
        dynamicParts += ` [Tech: ${course.technologies.join(", ")}]`;
      dynamicParts += "\n";
    });
  }

  return BASE_PROMPT + dynamicParts;
}

// Fetch a single content endpoint via the shared API client; any failure
// (missing url, timeout, network error) resolves to an empty list so the
// dynamic prompt just falls back to the static bio.
async function fetchResource<T>(url?: string): Promise<T[]> {
  if (!url) return [];
  try {
    return (await getResource<T[]>(url, { timeoutMs: 5000 })) ?? [];
  } catch {
    return [];
  }
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const QUICK_REPLIES = [
  "What are your skills?",
  "Tell me about your experience",
  "What projects have you built?",
  "How can I contact you?",
];

const formatTime = (date: Date) =>
  date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export default function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hey! I'm Prince's AI assistant. Ask me anything about his skills, experience, or projects.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  const [systemPrompt, setSystemPrompt] = useState(BASE_PROMPT);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const genAIRef = useRef<GoogleGenerativeAIClient | null>(null);
  const contentFetchedRef = useRef(false);
  const prefersReducedMotion = useReducedMotion();

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Fetch server content the first time the panel is opened (not on mount)
  // and fold it into the system prompt.
  const loadServerDataOnce = async () => {
    if (contentFetchedRef.current) return;
    contentFetchedRef.current = true;

    const [skills, projects, articles, blogs, courses] = await Promise.all([
      fetchResource<ServerSkillCategory>(API_URLS.skills),
      fetchResource<ServerProject>(API_URLS.projects),
      fetchResource<ServerArticle>(API_URLS.articles),
      fetchResource<ServerBlog>(API_URLS.blogs),
      fetchResource<ServerCourse>(API_URLS.courses),
    ]);

    setSystemPrompt(
      buildDynamicPrompt({ skills, projects, articles, blogs, courses })
    );
  };

  const toggleOpen = () => {
    setIsOpen((prev) => {
      const next = !prev;
      if (next) void loadServerDataOnce();
      return next;
    });
  };

  // Lazily obtain (and cache) the Gemini client, dynamically importing the
  // SDK on first use so it never lands in an eagerly-loaded chunk.
  const getGenAI = async (): Promise<GoogleGenerativeAIClient> => {
    if (genAIRef.current) return genAIRef.current;
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const instance = new GoogleGenerativeAI(GEMINI_API_KEY as string);
    genAIRef.current = instance;
    return instance;
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    setShowQuickReplies(false);

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      if (!GEMINI_API_KEY) {
        throw new Error("API key not configured");
      }

      const genAI = await getGenAI();

      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        systemInstruction: systemPrompt,
      });

      // Build history from previous messages (excluding welcome)
      const history = messages
        .filter((m) => m.id !== "welcome")
        .map((m) => ({
          role: m.role === "user" ? ("user" as const) : ("model" as const),
          parts: [{ text: m.content }],
        }));

      const chat = model.startChat({ history });

      const result = await chat.sendMessage(text.trim());
      const responseText = result.response.text();

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: responseText,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: unknown) {
      const isApiKeyMissing = !GEMINI_API_KEY;
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: isApiKeyMissing
            ? "Gemini API key is not configured. Please add VITE_GEMINI_API_KEY to your .env file."
            : "Sorry, I couldn't get a response right now. Please try again in a moment.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const panelMotionProps = prefersReducedMotion
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.12 },
      }
    : {
        initial: { opacity: 0, y: 16, scale: 0.98 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: 16, scale: 0.98 },
        transition: { duration: 0.2, ease: "easeOut" as const },
      };

  const messageMotionProps = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.18, ease: "easeOut" as const },
      };

  return (
    <>
      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="ai-chat-panel"
            {...panelMotionProps}
            className="fixed bottom-24 right-5 z-50 flex h-[500px] w-[360px] max-w-[calc(100vw-40px)] flex-col overflow-hidden rounded-lg border border-border bg-card shadow-lg"
          >
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-border bg-background px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border bg-primary/10 text-primary">
                  <Bot className="h-4 w-4" />
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-emerald-500" />
                </div>
                <div>
                  <p className="font-mono text-xs uppercase tracking-wide text-foreground">
                    prince's ai
                  </p>
                  <p className="font-mono text-[10px] text-muted-foreground">
                    powered by gemini
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label="Close chat"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 space-y-4 overflow-y-auto bg-background p-4 scroll-smooth">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  {...messageMotionProps}
                  className={`flex gap-2.5 ${
                    msg.role === "user" ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  {/* Avatar */}
                  <div
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border ${
                      msg.role === "assistant"
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <Bot className="h-3.5 w-3.5" />
                    ) : (
                      <User className="h-3.5 w-3.5" />
                    )}
                  </div>

                  {/* Bubble */}
                  <div
                    className={`max-w-[78%] rounded-md border px-3.5 py-2.5 ${
                      msg.role === "assistant"
                        ? "rounded-tl-sm border-border bg-muted text-foreground"
                        : "rounded-tr-sm border-primary/20 bg-primary text-primary-foreground"
                    }`}
                  >
                    <p className="font-sans text-sm leading-relaxed">
                      {msg.content}
                    </p>
                    <p
                      className={`mt-1 font-mono text-[10px] ${
                        msg.role === "assistant"
                          ? "text-muted-foreground/70"
                          : "text-primary-foreground/70"
                      }`}
                    >
                      {formatTime(msg.timestamp)}
                    </p>
                  </div>
                </motion.div>
              ))}

              {/* Typing indicator */}
              {isLoading && (
                <div className="flex gap-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-primary/10 text-primary">
                    <Bot className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex items-center gap-1 rounded-md rounded-tl-sm border border-border bg-muted px-4 py-3">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.3s] motion-reduce:animate-none" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.15s] motion-reduce:animate-none" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60 motion-reduce:animate-none" />
                  </div>
                </div>
              )}

              {/* Quick replies */}
              {showQuickReplies && !isLoading && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {QUICK_REPLIES.map((q) => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      className="rounded-md border border-border px-3 py-1.5 font-mono text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-accent hover:text-primary"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="shrink-0 border-t border-border bg-background p-3">
              <div className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 transition-colors focus-within:border-primary/50">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask me anything..."
                  disabled={isLoading}
                  className="flex-1 bg-transparent font-sans text-sm outline-none placeholder:text-muted-foreground/60 disabled:opacity-50"
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || isLoading}
                  className="shrink-0 rounded-md bg-primary p-1.5 text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Send message"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="mt-2 text-center font-mono text-[10px] text-muted-foreground/50">
                prince's ai · gemini 2.5 flash
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Toggle Button */}
      <motion.button
        onClick={toggleOpen}
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full border border-border bg-primary text-primary-foreground shadow-lg transition-colors hover:opacity-90"
        aria-label={isOpen ? "Close AI chatbot" : "Open AI chatbot"}
        whileHover={prefersReducedMotion ? undefined : { scale: 1.05 }}
        whileTap={prefersReducedMotion ? undefined : { scale: 0.95 }}
      >
        {/* Pulse ring */}
        {!isOpen && (
          <span className="absolute inset-0 rounded-full bg-primary opacity-30 motion-safe:animate-ping motion-reduce:hidden" />
        )}
        <AnimatePresence mode="wait" initial={false}>
          {isOpen ? (
            <motion.span
              key="close"
              className="inline-flex"
              initial={prefersReducedMotion ? undefined : { rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={prefersReducedMotion ? undefined : { rotate: 90, opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <X className="h-6 w-6" />
            </motion.span>
          ) : (
            <motion.span
              key="open"
              className="inline-flex"
              initial={prefersReducedMotion ? undefined : { rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={prefersReducedMotion ? undefined : { rotate: -90, opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <Sparkles className="h-6 w-6" />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </>
  );
}
