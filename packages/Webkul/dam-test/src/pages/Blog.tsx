import { useState } from "react";
import { Search } from "lucide-react";
import { Seo } from "@/components/seo";
import { useResource } from "@/hooks/useResource";
import { SectionHeader } from "@/components/ui/primitives/SectionHeader";
import { PostCard } from "@/components/ui/primitives/PostCard";
import { Skeleton } from "@/components/ui/primitives/Skeleton";
import { EmptyState } from "@/components/ui/primitives/EmptyState";
import { cn } from "@/lib/utils";
import placeholder from "@/assets/placeholder.jpg";

interface BlogTag {
  name: string;
  icon?: string;
  _id?: string;
}

interface BlogPost {
  id?: number | string;
  slug?: string;
  title: string;
  description: string;
  content?: string;
  coverImage?: string;
  readTime?: string;
  createdAt?: string;
  publishedAt?: string;
  tags?: (BlogTag | string)[];
  featured?: boolean;
  author?: string;
}

// Tags can arrive as plain strings or `{ name }` objects depending on the
// source (server vs. local fallback) — normalize to a display string.
const tagName = (tag: BlogTag | string | undefined): string =>
  typeof tag === "string" ? tag : (tag?.name ?? "");

const slugify = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const postSlug = (post: BlogPost) => post.slug || slugify(post.title);

const formatDate = (dateString?: string) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const fallback: BlogPost[] = [
  {
    id: 1,
    title:
      "Building Scalable React Applications: Best Practices and Patterns",
    description:
      "Learn how to structure large-scale React applications with proven patterns, state management strategies, and performance optimization techniques.",
    content:
      "In this comprehensive guide, we'll explore the architectural decisions that make React applications maintainable and scalable...",
    coverImage: placeholder,
    readTime: "8 min read",
    createdAt: "2023-12-15",
    tags: [
      { name: "React", icon: "https://www.google.com", _id: "68e2a5ca897a7ae74196b311" },
      { name: "JavaScript", icon: "https://www.google.com", _id: "68e2a5ca897a7ae74196b312" },
      { name: "Architecture", icon: "https://www.google.com", _id: "68e2a5ca897a7ae74196b313" },
    ],
    featured: true,
    author: "Prince Kumar Sahni",
  },
  {
    id: 2,
    title: "Modern CSS Techniques for Better User Experience",
    description:
      "Discover the latest CSS features and techniques that can enhance user experience, from container queries to scroll-driven animations.",
    content:
      "CSS has evolved significantly over the past few years. Modern browsers now support features that were once impossible...",
    coverImage: placeholder,
    readTime: "6 min read",
    publishedAt: "2023-12-10",
    tags: [
      { name: "CSS", icon: "https://www.google.com", _id: "68e2a5ca897a7ae74196b314" },
      { name: "Frontend", icon: "https://www.google.com", _id: "68e2a5ca897a7ae74196b315" },
      { name: "Design", icon: "https://www.google.com", _id: "68e2a5ca897a7ae74196b316" },
    ],
    featured: false,
    author: "Prince Kumar Sahni",
  },
  {
    id: 3,
    title: "TypeScript: From Beginner to Advanced Developer",
    description:
      "A complete journey through TypeScript, covering basic types, advanced patterns, and real-world application development strategies.",
    content:
      "TypeScript has become the standard for modern JavaScript development. This guide will take you from the basics...",
    coverImage: placeholder,
    readTime: "12 min read",
    publishedAt: "2023-12-05",
    tags: [
      { name: "TypeScript", icon: "https://www.google.com", _id: "68e2a5ca897a7ae74196b317" },
      { name: "JavaScript", icon: "https://www.google.com", _id: "68e2a5ca897a7ae74196b318" },
      { name: "Development", icon: "https://www.google.com", _id: "68e2a5ca897a7ae74196b319" },
    ],
    featured: true,
    author: "Prince Kumar Sahni",
  },
  {
    id: 4,
    title: "API Design Best Practices for Modern Web Development",
    description:
      "Learn how to design RESTful APIs that are intuitive, performant, and maintainable. Covers authentication, versioning, and documentation.",
    content:
      "Good API design is crucial for successful web applications. In this post, we'll explore the principles...",
    coverImage: placeholder,
    readTime: "10 min read",
    publishedAt: "2023-11-28",
    tags: [
      { name: "API", icon: "https://www.google.com", _id: "68e2a5ca897a7ae74196b320" },
      { name: "Backend", icon: "https://www.google.com", _id: "68e2a5ca897a7ae74196b321" },
      { name: "Design", icon: "https://www.google.com", _id: "68e2a5ca897a7ae74196b322" },
    ],
    featured: false,
    author: "Prince Kumar Sahni",
  },
  {
    id: 5,
    title: "Performance Optimization Techniques for Web Applications",
    description:
      "Comprehensive guide to web performance optimization, covering everything from lazy loading to code splitting and caching strategies.",
    content:
      "Performance is crucial for user experience and SEO. This guide covers various techniques to make your web applications faster...",
    coverImage: placeholder,
    readTime: "15 min read",
    publishedAt: "2023-11-20",
    tags: [
      { name: "Performance", icon: "https://www.google.com", _id: "68e2a5ca897a7ae74196b323" },
      { name: "Optimization", icon: "https://www.google.com", _id: "68e2a5ca897a7ae74196b324" },
      { name: "Web Development", icon: "https://www.google.com", _id: "68e2a5ca897a7ae74196b325" },
    ],
    featured: true,
    author: "Prince Kumar Sahni",
  },
  {
    id: 6,
    title: "Getting Started with Docker for Frontend Developers",
    description:
      "Learn how to use Docker to containerize your applications, create consistent development environments, and streamline deployment.",
    content:
      "Docker has revolutionized how we develop and deploy applications. For frontend developers, it offers many benefits...",
    coverImage: placeholder,
    readTime: "7 min read",
    publishedAt: "2023-11-15",
    tags: [
      { name: "Docker", icon: "https://www.google.com", _id: "68e2a5ca897a7ae74196b326" },
      { name: "DevOps", icon: "https://www.google.com", _id: "68e2a5ca897a7ae74196b327" },
      { name: "Development", icon: "https://www.google.com", _id: "68e2a5ca897a7ae74196b328" },
    ],
    featured: false,
    author: "Prince Kumar Sahni",
  },
];

const Blog = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTag, setSelectedTag] = useState("all");

  const { data, isLoading } = useResource<BlogPost[]>(
    ["blogs"],
    import.meta.env.VITE_BLOG_URL,
    { fallback, timeoutMs: 2000 },
  );

  const blogData = data ?? [];

  const allTags = [
    "all",
    ...Array.from(
      new Set(blogData.flatMap((post) => (post.tags ?? []).map(tagName))),
    ),
  ];

  const filteredPosts = blogData.filter((post) => {
    const matchesSearch =
      post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTag =
      selectedTag === "all" ||
      (post.tags ?? []).map(tagName).includes(selectedTag);
    return matchesSearch && matchesTag;
  });

  const featuredPosts = blogData.filter((post) => post.featured);
  const showFeatured = selectedTag === "all" && searchTerm === "";

  return (
    <>
      <Seo
        title="Blog | Insights & Tech Articles by Prince Kumar Sahni"
        description="Read insightful blogs and in-depth articles by Prince Kumar Sahni on software engineering, system design, programming, and technology trends."
        url="https://princesahni.com/blog"
        image="https://princesahni.com/og-images/princesahni-logo.png"
      />

      <section className="container mx-auto px-6 py-16">
        <div className="max-w-2xl">
          <span className="font-mono text-xs uppercase tracking-[0.1em] text-primary">
            Writing
          </span>
          <h1 className="mt-3 font-display text-4xl text-foreground md:text-5xl">
            Blog
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            Thoughts, tutorials, and insights about web development,
            technology trends, and software engineering best practices.
          </p>
        </div>

        <div className="mt-10 flex flex-col gap-4">
          <div className="relative max-w-md">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search posts..."
              className="w-full rounded-lg border border-border bg-card py-2 pl-10 pr-3 font-mono text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {allTags.map((tag) => {
              const active = selectedTag === tag;
              return (
                <button
                  key={tag}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSelectedTag(tag)}
                  className={cn(
                    "inline-flex items-center rounded-lg border px-3 py-1.5 font-mono text-xs capitalize transition-colors",
                    active
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground",
                  )}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>

        {isLoading ? (
          <div className="mt-16">
            <Skeleton variant="card" count={4} />
          </div>
        ) : (
          <>
            {showFeatured && featuredPosts.length > 0 && (
              <div className="mt-16">
                <SectionHeader index="01" title="Featured" />
                <div className="mt-6 grid gap-6 md:grid-cols-2">
                  {featuredPosts.slice(0, 2).map((post) => (
                    <PostCard
                      key={post.id ?? postSlug(post)}
                      kind={formatDate(post.createdAt ?? post.publishedAt)}
                      readTime={post.readTime ?? ""}
                      title={post.title}
                      description={post.description}
                      tags={(post.tags ?? []).map(tagName)}
                      href={`/blog/${postSlug(post)}`}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="mt-16">
              <SectionHeader index="02" title="All Posts" />
              <div className="mt-6">
                {filteredPosts.length > 0 ? (
                  <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {filteredPosts.map((post) => (
                      <PostCard
                        key={post.id ?? postSlug(post)}
                        kind={formatDate(post.createdAt ?? post.publishedAt)}
                        readTime={post.readTime ?? ""}
                        title={post.title}
                        description={post.description}
                        tags={(post.tags ?? []).map(tagName)}
                        href={`/blog/${postSlug(post)}`}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="No posts found"
                    hint="Try adjusting your search or tag filter."
                  />
                )}
              </div>
            </div>
          </>
        )}
      </section>
    </>
  );
};

export default Blog;
