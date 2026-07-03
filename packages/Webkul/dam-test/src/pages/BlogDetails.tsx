import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Calendar, Clock, Heart, ArrowLeft, Share2, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useResource } from "@/hooks/useResource";
import { Prose } from "@/components/ui/primitives/Prose";
import { Tag } from "@/components/ui/primitives/Tag";
import { Button } from "@/components/ui/primitives/Button";
import { Skeleton } from "@/components/ui/primitives/Skeleton";
import { blogDetailFixture } from "@/data/fixtures/blogDetail";
import { cn } from "@/lib/utils";

interface BlogTag {
  name: string;
  icon?: string;
}

interface BlogPost {
  title: string;
  slug: string;
  readTime: number;
  description: string;
  coverImage: string;
  content: string;
  tags: BlogTag[];
  likes: number;
  author: string;
  isVisible: boolean;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const BlogDetail = () => {
  const { slug } = useParams();
  const [liked, setLiked] = useState(false);
  const { toast } = useToast();

  const { data: post, isLoading } = useResource<BlogPost>(
    ["blog", slug ?? ""],
    slug ? `${import.meta.env.VITE_BLOG_URL}/slug/${slug}` : undefined,
    { fallback: { ...blogDetailFixture, slug: slug || "" }, timeoutMs: 3000 },
  );

  const handleLike = () => {
    setLiked((prev) => !prev);
    toast({
      title: liked ? "Removed from favorites" : "Added to favorites",
      description: liked
        ? "Article removed from your favorites"
        : "Article added to your favorites",
    });
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({
      title: "Link copied!",
      description: "Article link copied to clipboard",
    });
  };

  if (isLoading) {
    return (
      <section className="container mx-auto max-w-3xl px-6 py-16">
        <Skeleton variant="row" count={1} className="h-9 w-32" />
        <div className="mt-8">
          <Skeleton variant="card" count={1} />
        </div>
        <div className="mt-8">
          <Skeleton variant="text" count={6} />
        </div>
      </section>
    );
  }

  return (
    <section className="container mx-auto max-w-3xl px-6 py-16">
      {/* Back Button */}
      <Button asChild variant="ghost" className="mb-8">
        <Link to="/blog">
          <ArrowLeft className="h-4 w-4" />
          Back to Blog
        </Link>
      </Button>

      {/* Cover Image */}
      <div className="aspect-video w-full overflow-hidden rounded-xl border border-border">
        <img
          src={post.coverImage}
          alt={post.title}
          className="h-full w-full object-cover"
        />
      </div>

      {/* Article Header */}
      <div className="mt-8">
        {post.featured && <Tag>Featured Article</Tag>}
        <h1 className="mt-3 font-display text-3xl leading-tight text-foreground md:text-5xl">
          {post.title}
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
          {post.description}
        </p>
      </div>

      {/* Meta Information */}
      <div className="mt-6 flex flex-wrap items-center gap-4 font-mono text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5 text-foreground">
          <User className="h-3.5 w-3.5" />
          {post.author}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5" />
          {formatDate(post.createdAt)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          {post.readTime} min read
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Heart className="h-3.5 w-3.5" />
          {post.likes + (liked ? 1 : 0)} likes
        </span>
      </div>

      {/* Tags */}
      {post.tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <Tag key={tag.name}>
              {tag.icon ? `${tag.icon} ` : ""}
              {tag.name}
            </Tag>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={handleLike}
          aria-pressed={liked}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 font-mono text-xs transition-colors",
            liked
              ? "border-foreground bg-foreground text-background"
              : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground",
          )}
        >
          <Heart className={cn("h-3.5 w-3.5", liked && "fill-current")} />
          {liked ? "Liked" : "Like"}
        </button>

        <button
          type="button"
          onClick={handleShare}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 font-mono text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
        >
          <Share2 className="h-3.5 w-3.5" />
          Share
        </button>
      </div>

      {/* Article Content */}
      <div className="mt-10 border-t border-border pt-10">
        <Prose markdown={post.content} />
      </div>

      {/* Author Info */}
      <div className="mt-12 flex items-center gap-4 rounded-xl border border-border bg-card p-6">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary font-display text-xl text-primary-foreground">
          {post.author.charAt(0)}
        </div>
        <div>
          <h3 className="font-display text-lg text-foreground">
            Written by {post.author}
          </h3>
          <p className="text-sm text-muted-foreground">
            Software engineer passionate about web development and sharing
            knowledge
          </p>
        </div>
      </div>

      {/* Related Articles CTA */}
      <div className="mt-16 flex flex-col items-center gap-4 rounded-xl border border-border bg-card px-6 py-10 text-center">
        <p className="font-display text-xl text-foreground md:text-2xl">
          Want to read more?
        </p>
        <p className="max-w-md font-mono text-xs text-muted-foreground">
          Check out other articles on web development and technology
        </p>
        <Button asChild variant="primary">
          <Link to="/blog">View All Articles</Link>
        </Button>
      </div>
    </section>
  );
};

export default BlogDetail;
