import { useState } from "react";
import { useParams } from "react-router-dom";
import {
  Clock,
  CheckCircle,
  Circle,
  BookOpen,
  Download,
  Award,
  Menu,
  X,
  ChevronRight,
  Calendar,
} from "lucide-react";
import { useResource } from "@/hooks/useResource";
import { Prose } from "@/components/ui/primitives/Prose";
import { Button } from "@/components/ui/primitives/Button";
import { Tag } from "@/components/ui/primitives/Tag";
import { Skeleton } from "@/components/ui/primitives/Skeleton";
import { courseDetailFixture } from "@/data/fixtures/courseDetail";
import { cn } from "@/lib/utils";

interface CourseTopic {
  title: string;
  description: string;
  content: string;
}

interface CourseDetail {
  slug: string;
  title: string;
  description: string;
  coverImage: string;
  content: CourseTopic[];
  isVisible: boolean;
  tags: string[];
  level: string;
  createdAt: string;
  updatedAt: string;
}

const CourseDetails = () => {
  const { slug } = useParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState(0);
  const [completedTopics, setCompletedTopics] = useState<Set<number>>(
    new Set(),
  );

  const { data: course, isLoading } = useResource<CourseDetail>(
    ["course", slug ?? ""],
    slug ? `${import.meta.env.VITE_COURSE_URL}/${slug}` : undefined,
    { fallback: courseDetailFixture, timeoutMs: 3000 },
  );

  const toggleTopicComplete = (topicIndex: number) => {
    setCompletedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(topicIndex)) {
        next.delete(topicIndex);
      } else {
        next.add(topicIndex);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <section className="container mx-auto px-6 py-16">
        <Skeleton variant="row" count={5} />
        <div className="mt-8">
          <Skeleton variant="card" count={1} />
        </div>
      </section>
    );
  }

  const progressPercentage = course.content.length
    ? Math.round((completedTopics.size / course.content.length) * 100)
    : 0;

  const topic = course.content[selectedTopic];

  const renderTopicNav = (onSelect: (index: number) => void) => (
    <div className="space-y-1">
      {course.content.map((t, index) => (
        <div
          key={t.title}
          onClick={() => onSelect(index)}
          className={cn(
            "flex cursor-pointer items-center gap-3 rounded-lg p-3 transition-colors",
            selectedTopic === index
              ? "border border-primary/30 bg-primary/10"
              : "hover:bg-accent",
          )}
        >
          <button
            type="button"
            className="shrink-0"
            aria-label={
              completedTopics.has(index)
                ? "Mark topic incomplete"
                : "Mark topic complete"
            }
            onClick={(e) => {
              e.stopPropagation();
              toggleTopicComplete(index);
            }}
          >
            {completedTopics.has(index) ? (
              <CheckCircle className="h-5 w-5 text-primary" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground" />
            )}
          </button>
          <div className="min-w-0 flex-1">
            <div
              className={cn(
                "truncate font-mono text-sm",
                selectedTopic === index ? "text-primary" : "text-foreground",
              )}
            >
              {t.title}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {t.description}
            </div>
          </div>
          {selectedTopic === index && (
            <ChevronRight className="h-4 w-4 shrink-0 text-primary" />
          )}
        </div>
      ))}
    </div>
  );

  const renderProgress = () => (
    <>
      <div className="font-mono text-xs text-muted-foreground">
        {completedTopics.size} of {course.content.length} topics completed
      </div>
      <div className="mt-2 h-2 w-full rounded-full bg-muted">
        <div
          className="h-2 rounded-full bg-primary transition-all duration-300"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
      <div className="mt-1 font-mono text-xs text-muted-foreground">
        {progressPercentage}% complete
      </div>
    </>
  );

  return (
    <div className="relative">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-background/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-80 overflow-y-auto border-r border-border bg-background p-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg text-foreground">
                Course Topics
              </h3>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Close course topics"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-6">{renderProgress()}</div>
            <div className="mb-4 h-px bg-border" />

            {renderTopicNav((index) => {
              setSelectedTopic(index);
              setSidebarOpen(false);
            })}
          </div>
        </div>
      )}

      <div className="container mx-auto flex gap-10 px-6 py-16">
        {/* Desktop Sidebar */}
        <aside className="hidden w-72 shrink-0 lg:block">
          <div className="sticky top-28">
            <h3 className="flex items-center gap-2 font-display text-lg text-foreground">
              <BookOpen className="h-5 w-5 text-primary" />
              Course Topics
            </h3>

            <div className="mt-4">{renderProgress()}</div>

            <div className="my-6 h-px bg-border" />

            <div className="max-h-[calc(100vh-360px)] overflow-y-auto pr-1">
              {renderTopicNav(setSelectedTopic)}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="min-w-0 flex-1">
          {/* Mobile menu button */}
          <div className="mb-6 lg:hidden">
            <Button variant="ghost" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-4 w-4" />
              Course Topics ({completedTopics.size}/{course.content.length})
            </Button>
          </div>

          {/* Course header */}
          <div className="mb-8">
            <div className="flex flex-wrap items-center gap-2">
              {topic && (
                <Tag>
                  Topic {selectedTopic + 1} of {course.content.length}
                </Tag>
              )}
              <Tag>{progressPercentage}% Complete</Tag>
            </div>

            <h1 className="mt-4 font-display text-3xl text-foreground md:text-4xl">
              {course.title}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-6 font-mono text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                12 hours content
              </span>
              <span className="inline-flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5" />
                {course.content.length} topics
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Award className="h-3.5 w-3.5" />
                {course.level}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(course.createdAt).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button
                variant="primary"
                onClick={() => toggleTopicComplete(selectedTopic)}
              >
                {completedTopics.has(selectedTopic) ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Mark as Incomplete
                  </>
                ) : (
                  <>
                    <Circle className="h-4 w-4" />
                    Mark as Complete
                  </>
                )}
              </Button>
              <Button variant="ghost">
                <Download className="h-4 w-4" />
                Download Resources
              </Button>
            </div>
          </div>

          {/* Topic Content */}
          {topic && (
            <div className="rounded-xl border border-border bg-card p-6 md:p-8">
              <h2 className="flex items-center gap-2 font-display text-2xl text-foreground">
                <BookOpen className="h-5 w-5 text-primary" />
                {topic.title}
              </h2>
              <p className="mt-2 text-muted-foreground">{topic.description}</p>
              <div className="mt-6 border-t border-border pt-6">
                <Prose markdown={topic.content} />
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="mt-8 flex items-center justify-between">
            <Button
              variant="ghost"
              disabled={selectedTopic === 0}
              onClick={() => setSelectedTopic((prev) => Math.max(0, prev - 1))}
            >
              Previous Topic
            </Button>

            <span className="font-mono text-xs text-muted-foreground">
              Topic {selectedTopic + 1} of {course.content.length}
            </span>

            <Button
              variant="primary"
              disabled={selectedTopic === course.content.length - 1}
              onClick={() =>
                setSelectedTopic((prev) =>
                  Math.min(course.content.length - 1, prev + 1),
                )
              }
            >
              Next Topic
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </main>
      </div>
    </div>
  );
};

export default CourseDetails;
