import { useState } from "react";
import { Search } from "lucide-react";
import { Seo } from "@/components/seo";
import { useResource } from "@/hooks/useResource";
import { personalInfo } from "@/data/portfolioData";
import { SectionHeader } from "@/components/ui/primitives/SectionHeader";
import { PostCard } from "@/components/ui/primitives/PostCard";
import { Button } from "@/components/ui/primitives/Button";
import { Skeleton } from "@/components/ui/primitives/Skeleton";
import { EmptyState } from "@/components/ui/primitives/EmptyState";
import { cn } from "@/lib/utils";
import placeholder from "@/assets/placeholder.jpg";

interface Article {
  id?: number | string;
  title: string;
  description: string;
  coverImage?: string;
  publishedAt?: string;
  articleLink: string;
  tags?: string[];
  featured?: boolean;
  readTime?: string;
}

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

const fallback: Article[] = [
  {
    id: 1,
    title: "The Future of React: Server Components and Concurrent Features",
    description:
      "Exploring how React Server Components and Concurrent Features are reshaping the way we build modern web applications.",
    coverImage: placeholder,
    publishedAt: "2023-12-20",
    articleLink: `${personalInfo.medium}/react-server-components`,
    tags: ["React", "JavaScript", "Frontend"],
    featured: true,
    readTime: "5 mins",
  },
  {
    id: 2,
    title: "Mastering Node.js Streams for Efficient Data Handling",
    description:
      "A deep dive into Node.js streams, showing how to process large amounts of data efficiently without blocking the event loop.",
    coverImage: placeholder,
    publishedAt: "2024-01-10",
    articleLink: `${personalInfo.medium}/nodejs-streams`,
    tags: ["Node.js", "Backend", "JavaScript"],
    featured: false,
    readTime: "6 mins",
  },
  {
    id: 3,
    title: "Understanding Microservices Architecture in Modern Web Apps",
    description:
      "Learn the principles, benefits, and challenges of adopting a microservices architecture for scalable and maintainable applications.",
    coverImage: placeholder,
    publishedAt: "2024-02-05",
    articleLink: `${personalInfo.medium}/microservices-architecture`,
    tags: ["Microservices", "System Design", "Backend"],
    featured: true,
    readTime: "8 mins",
  },
  {
    id: 4,
    title: "CSS Grid vs Flexbox: Choosing the Right Layout Tool",
    description:
      "A practical comparison between CSS Grid and Flexbox, helping you decide which layout system is best for different scenarios.",
    coverImage: placeholder,
    publishedAt: "2024-03-01",
    articleLink: `${personalInfo.medium}/css-grid-vs-flexbox`,
    tags: ["CSS", "Frontend", "Web Design"],
    featured: false,
    readTime: "4 mins",
  },
];

const Articles = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTag, setSelectedTag] = useState("all");

  const { data, isLoading } = useResource<Article[]>(
    ["articles"],
    import.meta.env.VITE_ARTICLE_URL,
    { fallback, timeoutMs: 3000 },
  );

  const articleData = data ?? [];

  const allTags = [
    "all",
    ...Array.from(new Set(articleData.flatMap((article) => article.tags ?? []))),
  ];

  const filteredArticles = articleData.filter((article) => {
    const matchesSearch =
      article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTag =
      selectedTag === "all" || (article.tags ?? []).includes(selectedTag);
    return matchesSearch && matchesTag;
  });

  const featuredArticles = articleData.filter((article) => article.featured);
  const showFeatured = selectedTag === "all" && searchTerm === "";

  return (
    <>
      <Seo
        title="Articles | Prince Kumar Sahni on Medium"
        description="Discover thought-provoking articles written by Prince Kumar Sahni on Medium — covering software engineering, system design, and tech innovations."
        url="https://princesahni.com/articles"
        image="https://princesahni.com/og-images/princesahni-logo.png"
      />

      <section className="container mx-auto px-6 py-16">
        <div className="max-w-2xl">
          <span className="font-mono text-xs uppercase tracking-[0.1em] text-primary">
            Medium
          </span>
          <h1 className="mt-3 font-display text-4xl text-foreground md:text-5xl">
            Articles
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            Sharing knowledge and insights about web development, software
            architecture, and technology trends with the developer community.
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
              placeholder="Search articles..."
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
            {showFeatured && featuredArticles.length > 0 && (
              <div className="mt-16">
                <SectionHeader index="01" title="Featured" />
                <div className="mt-6 grid gap-6 md:grid-cols-2">
                  {featuredArticles.slice(0, 2).map((article) => (
                    <PostCard
                      key={article.id ?? article.title}
                      kind={formatDate(article.publishedAt)}
                      readTime={article.readTime ?? ""}
                      title={article.title}
                      description={article.description}
                      tags={article.tags ?? []}
                      href={article.articleLink}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="mt-16">
              <SectionHeader index="02" title="All Articles" />
              <div className="mt-6">
                {filteredArticles.length > 0 ? (
                  <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {filteredArticles.map((article) => (
                      <PostCard
                        key={article.id ?? article.title}
                        kind={formatDate(article.publishedAt)}
                        readTime={article.readTime ?? ""}
                        title={article.title}
                        description={article.description}
                        tags={article.tags ?? []}
                        href={article.articleLink}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="No articles found"
                    hint="Try adjusting your search or tag filter."
                  />
                )}
              </div>
            </div>

            <div className="mt-16 flex flex-col items-center gap-4 rounded-xl border border-border bg-card px-6 py-10 text-center">
              <p className="font-display text-xl text-foreground md:text-2xl">
                Follow along on Medium
              </p>
              <p className="max-w-md font-mono text-xs text-muted-foreground">
                New articles on web development and software architecture,
                published regularly.
              </p>
              <Button asChild variant="primary">
                <a href={personalInfo.medium} target="_blank" rel="noreferrer">
                  Follow on Medium
                </a>
              </Button>
            </div>
          </>
        )}
      </section>
    </>
  );
};

export default Articles;
