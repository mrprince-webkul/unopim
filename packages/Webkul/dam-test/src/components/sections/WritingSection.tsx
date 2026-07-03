import { mockArticles, personalInfo } from "@/data/portfolioData";
import { useResource } from "@/hooks/useResource";
import { SectionHeader } from "@/components/ui/primitives/SectionHeader";
import { PostCard } from "@/components/ui/primitives/PostCard";
import { Reveal } from "@/components/ui/primitives/Reveal";

interface Article {
  id?: number;
  title: string;
  description: string;
  articleLink?: string;
  tags?: string[];
  readTime?: string;
}

const WritingSection = () => {
  const { data } = useResource<Article[]>(
    ["articles"],
    import.meta.env.VITE_ARTICLE_URL,
    { fallback: mockArticles, timeoutMs: 3000 },
  );

  return (
    <section id="writing" className="container mx-auto px-6 py-20">
      <SectionHeader
        index="04"
        title="Writing"
        action={
          <a href={personalInfo.medium} target="_blank" rel="noreferrer">
            medium ↗
          </a>
        }
      />
      <div className="mt-8 grid gap-5 md:grid-cols-3">
        {data.slice(0, 3).map((article, i) => (
          <Reveal key={article.id ?? i} delay={i * 0.06}>
            <PostCard
              kind={(article.tags?.[0] ?? "Essay").toUpperCase()}
              readTime={article.readTime ?? "5 min"}
              title={article.title}
              description={article.description}
              tags={(article.tags ?? []).slice(0, 2)}
              href={article.articleLink ?? personalInfo.medium}
            />
          </Reveal>
        ))}
      </div>
    </section>
  );
};

export default WritingSection;
