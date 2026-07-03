// Mirrors backend Pydantic schemas — see docs/API_CONTRACT.md

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
  size: number;
}

export interface User {
  id: number;
  email: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  github_url: string | null;
  linkedin_url: string | null;
  website_url: string | null;
  role: "user" | "admin" | "moderator";
  is_verified: boolean;
  is_banned: boolean;
  is_suspended?: boolean;
  last_login_at?: string | null;
  created_at: string;
}

export interface PublicProfile extends User {
  followers_count: number;
  following_count: number;
  posts_count: number;
  is_following: boolean;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  position?: number;
  is_hidden?: boolean;
  is_featured?: boolean;
  posts_count: number;
}

export interface Attachment {
  id: number;
  url: string;
  filename: string;
  original_name: string;
  content_type: string;
  size: number;
  downloads_count: number;
}

export type AnnouncementStatus = "draft" | "published" | "scheduled" | "archived";
export type AnnouncementSort = "latest" | "popular" | "trending";

export interface Announcement {
  id: number;
  title: string;
  slug: string;
  description: string;
  content: string;
  thumbnail_url: string | null;
  author: User;
  category: Category | null;
  tags: string[];
  github_url: string | null;
  website_url: string | null;
  demo_url: string | null;
  cta_label: string | null;
  cta_url: string | null;
  status: AnnouncementStatus;
  is_pinned: boolean;
  is_featured: boolean;
  publish_date: string;
  created_at: string;
  updated_at: string;
  views_count: number;
  likes_count: number;
  comments_count: number;
  bookmarks_count: number;
  attachments: Attachment[];
  is_liked: boolean;
  is_bookmarked: boolean;
  reading_time: number;
}

export interface AnnouncementInput {
  title: string;
  description: string;
  content: string;
  category_id?: number | null;
  tags?: string[];
  thumbnail_url?: string | null;
  github_url?: string | null;
  website_url?: string | null;
  demo_url?: string | null;
  cta_label?: string | null;
  cta_url?: string | null;
  status: AnnouncementStatus;
  publish_date?: string | null;
  attachment_ids?: number[];
}

export interface Comment {
  id: number;
  content: string;
  author: User;
  announcement_id: number;
  parent_id: number | null;
  is_hidden: boolean;
  created_at: string;
  replies: Comment[];
}

export interface NewsArticle {
  id: number;
  title: string;
  summary: string;
  image_url: string | null;
  source_url: string;
  source_name: string;
  category: string;
  tags?: string[];
  reading_time: number;
  published_at: string;
  created_at: string;
}

export type NotificationType = "like" | "comment" | "follow" | "admin" | "news";

export interface Notification {
  id: number;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export interface NotificationList extends Paginated<Notification> {
  unread_count: number;
}

export interface SiteSetting {
  key: string;
  value: string;
  description: string;
  is_secret: boolean;
}

export interface ActivityLog {
  id: number;
  user: User | null;
  action: string;
  detail: string;
  created_at: string;
}

export interface DatePoint {
  date: string;
  count: number;
}

export interface EngagementPoint {
  date: string;
  views: number;
  likes: number;
  comments: number;
}

export interface UserStats {
  posts: number;
  views: number;
  likes: number;
  bookmarks: number;
  downloads: number;
  weekly_views: DatePoint[];
  monthly_engagement: EngagementPoint[];
  recent_activity: { action: string; detail: string; created_at: string }[];
}

export interface AdminStats {
  users: number;
  active_users: number;
  new_users_today: number;
  posts: number;
  comments: number;
  news_count: number;
  downloads: number;
  storage_bytes: number;
  files_count: number;
  user_growth: DatePoint[];
  posts_per_day: DatePoint[];
  popular_categories: { name: string; count: number }[];
  engagement: { likes: number; comments: number; bookmarks: number; views: number };
}

// --- Platform admin: health, AI, storage, jobs, cache ---------------------

export interface HealthCheck {
  status: string;
  detail: string;
  provider?: string | null;
  jobs?: number;
}

export interface SystemHealth {
  database: HealthCheck;
  redis: HealthCheck;
  storage: HealthCheck;
  ai: HealthCheck;
  queue: HealthCheck;
}

export interface AIProvider {
  id: number;
  key: string;
  name: string;
  provider_type: "openai_compatible" | "anthropic" | "gemini";
  api_key: string;
  has_key: boolean;
  base_url: string;
  model: string;
  temperature: number;
  max_tokens: number;
  timeout: number;
  daily_limit: number;
  enabled: boolean;
  is_active: boolean;
  sort_order: number;
}

export interface AIStatus {
  active_provider: string | null;
  active_model: string | null;
  enabled_count: number;
  total: number;
  usage: { key: string; name: string; used_today: number; daily_limit: number }[];
}

export interface StorageFile {
  id: number;
  original_name: string;
  content_type: string;
  size: number;
  url: string;
  downloads_count: number;
  announcement_id: number | null;
  is_orphan: boolean;
  uploader_id: number;
  created_at: string;
}

export interface StorageAnalytics {
  total_bytes: number;
  total_files: number;
  orphan_files: number;
  orphan_bytes: number;
  provider: string;
  bucket: string;
  by_type: { type: string; count: number; bytes: number }[];
  largest: StorageFile[];
}

export interface JobInfo {
  name: string;
  label: string;
  description: string;
  next_run: string | null;
}

export interface JobsOverview {
  worker_running: boolean;
  scheduled: number;
  jobs: JobInfo[];
}

export interface JobRun {
  id: number;
  name: string;
  status: "running" | "success" | "failed";
  detail: string;
  items: number;
  duration_ms: number;
  trigger: string;
  created_at: string;
}

export interface JobResult {
  name: string;
  status: string;
  detail: string;
  items: number;
  duration_ms: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  stale_served: number;
  invalidations: number;
  hit_ratio: number;
  keys: number;
  groups: Record<string, number>;
  ttls: Record<string, number>;
}

export interface LoginHistoryEntry {
  id: number;
  ip: string;
  user_agent: string;
  created_at: string;
}

export interface UserActivity {
  announcements: { id: number; title: string; created_at: string; status: string }[];
  comments: { id: number; content: string; created_at: string }[];
}

export interface SearchResults {
  announcements: Paginated<Announcement>;
  news: Paginated<NewsArticle>;
  users: Paginated<PublicProfile>;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}
