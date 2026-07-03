// Typed API client for the DevAnnounce backend — see docs/API_CONTRACT.md.
// Browser: relative URLs through the Nginx proxy. Server (SSR): INTERNAL_API_URL.

import type {
  ActivityLog,
  AdminStats,
  AIProvider,
  AIStatus,
  Announcement,
  AnnouncementInput,
  AnnouncementSort,
  Attachment,
  AuthResponse,
  CacheStats,
  Category,
  Comment,
  JobResult,
  JobRun,
  JobsOverview,
  LoginHistoryEntry,
  NewsArticle,
  NotificationList,
  Notification,
  Paginated,
  PublicProfile,
  SearchResults,
  SiteSetting,
  StorageAnalytics,
  StorageFile,
  SystemHealth,
  User,
  UserActivity,
  UserStats,
} from "./types";

const TOKEN_KEY = "da_access_token";

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
  if (typeof window !== "undefined") {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  }
}

export function getAccessToken(): string | null {
  if (accessToken) return accessToken;
  if (typeof window !== "undefined") {
    accessToken = localStorage.getItem(TOKEN_KEY);
  }
  return accessToken;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public detail: string,
  ) {
    super(detail);
    this.name = "ApiError";
  }
}

function baseUrl(): string {
  if (typeof window === "undefined") {
    return process.env.INTERNAL_API_URL ?? "http://localhost:8080";
  }
  return "";
}

export function qs(params: Record<string, unknown> = {}): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    sp.set(key, String(value));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

async function tryRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${baseUrl()}/api/v1/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { access_token: string };
    setAccessToken(data.access_token);
    return true;
  } catch {
    return false;
  }
}

function normalizeDetail(detail: unknown, fallback: string): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    // Pydantic validation errors
    const first = detail[0] as { msg?: string; loc?: unknown[] } | undefined;
    if (first?.msg) {
      const field = Array.isArray(first.loc) ? String(first.loc[first.loc.length - 1]) : "";
      return field ? `${field}: ${first.msg}` : first.msg;
    }
  }
  return fallback;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body !== undefined && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  const token = getAccessToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${baseUrl()}/api/v1${path}`, {
    ...init,
    headers,
    credentials: "include",
    cache: "no-store",
  });

  if (
    res.status === 401 &&
    retry &&
    typeof window !== "undefined" &&
    !path.startsWith("/auth/login") &&
    !path.startsWith("/auth/refresh") &&
    !path.startsWith("/auth/logout")
  ) {
    if (await tryRefresh()) {
      return apiFetch<T>(path, init, false);
    }
  }

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, normalizeDetail(data?.detail, res.statusText));
  }
  return data as T;
}

// ---------------------------------------------------------------------------
// Auth

export const authApi = {
  register: (body: { email: string; username: string; password: string; full_name?: string }) =>
    apiFetch<User>("/auth/register", { method: "POST", body: JSON.stringify(body) }),

  login: async (body: { email_or_username: string; password: string }) => {
    const res = await apiFetch<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    });
    setAccessToken(res.access_token);
    return res;
  },

  refresh: async () => {
    const res = await apiFetch<AuthResponse>("/auth/refresh", { method: "POST" }, false);
    setAccessToken(res.access_token);
    return res;
  },

  logout: async () => {
    try {
      await apiFetch<{ message: string }>("/auth/logout", { method: "POST" }, false);
    } finally {
      setAccessToken(null);
    }
  },

  me: () => apiFetch<User>("/auth/me"),

  forgotPassword: (email: string) =>
    apiFetch<{ message: string }>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token: string, new_password: string) =>
    apiFetch<{ message: string }>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, new_password }),
    }),

  verifyEmail: (token: string) =>
    apiFetch<{ message: string }>("/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ token }),
    }),
};

// ---------------------------------------------------------------------------
// Users

export const usersApi = {
  profile: (username: string) => apiFetch<PublicProfile>(`/users/${encodeURIComponent(username)}`),

  updateMe: (body: {
    full_name?: string | null;
    bio?: string | null;
    avatar_url?: string | null;
    github_url?: string | null;
    linkedin_url?: string | null;
    website_url?: string | null;
  }) => apiFetch<User>("/users/me", { method: "PUT", body: JSON.stringify(body) }),

  follow: (username: string) =>
    apiFetch<{ message: string }>(`/users/${encodeURIComponent(username)}/follow`, { method: "POST" }),

  unfollow: (username: string) =>
    apiFetch<{ message: string }>(`/users/${encodeURIComponent(username)}/follow`, { method: "DELETE" }),

  announcements: (username: string, params: { page?: number; size?: number; status?: string } = {}) =>
    apiFetch<Paginated<Announcement>>(`/users/${encodeURIComponent(username)}/announcements${qs(params)}`),

  myBookmarks: (params: { page?: number; size?: number } = {}) =>
    apiFetch<Paginated<Announcement>>(`/users/me/bookmarks${qs(params)}`),

  myStats: () => apiFetch<UserStats>("/users/me/stats"),
};

// ---------------------------------------------------------------------------
// Categories

export const categoriesApi = {
  list: () => apiFetch<Category[]>("/categories"),
};

// ---------------------------------------------------------------------------
// Announcements

export interface AnnouncementListParams {
  page?: number;
  size?: number;
  sort?: AnnouncementSort;
  category?: string;
  tag?: string;
  author?: string;
  featured?: boolean;
  pinned?: boolean;
  q?: string;
}

export const announcementsApi = {
  list: (params: AnnouncementListParams = {}) =>
    apiFetch<Paginated<Announcement>>(`/announcements${qs(params as Record<string, unknown>)}`),

  get: (slug: string) => apiFetch<Announcement>(`/announcements/${encodeURIComponent(slug)}`),

  create: (body: AnnouncementInput) =>
    apiFetch<Announcement>("/announcements", { method: "POST", body: JSON.stringify(body) }),

  update: (id: number, body: Partial<AnnouncementInput>) =>
    apiFetch<Announcement>(`/announcements/${id}`, { method: "PUT", body: JSON.stringify(body) }),

  remove: (id: number) => apiFetch<void>(`/announcements/${id}`, { method: "DELETE" }),

  like: (id: number) =>
    apiFetch<{ likes_count: number; is_liked: boolean }>(`/announcements/${id}/like`, { method: "POST" }),

  unlike: (id: number) =>
    apiFetch<{ likes_count: number; is_liked: boolean }>(`/announcements/${id}/like`, { method: "DELETE" }),

  bookmark: (id: number) =>
    apiFetch<{ bookmarks_count: number; is_bookmarked: boolean }>(`/announcements/${id}/bookmark`, {
      method: "POST",
    }),

  unbookmark: (id: number) =>
    apiFetch<{ bookmarks_count: number; is_bookmarked: boolean }>(`/announcements/${id}/bookmark`, {
      method: "DELETE",
    }),

  comments: (id: number, params: { page?: number; size?: number } = {}) =>
    apiFetch<Paginated<Comment>>(`/announcements/${id}/comments${qs(params)}`),

  addComment: (id: number, body: { content: string; parent_id?: number | null }) =>
    apiFetch<Comment>(`/announcements/${id}/comments`, { method: "POST", body: JSON.stringify(body) }),
};

export const commentsApi = {
  update: (id: number, content: string) =>
    apiFetch<Comment>(`/comments/${id}`, { method: "PUT", body: JSON.stringify({ content }) }),

  remove: (id: number) => apiFetch<void>(`/comments/${id}`, { method: "DELETE" }),
};

// ---------------------------------------------------------------------------
// Uploads

export const uploadsApi = {
  upload: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return apiFetch<Attachment>("/uploads", { method: "POST", body: form });
  },

  downloadUrl: (id: number) => `/api/v1/uploads/${id}/download`,
};

// ---------------------------------------------------------------------------
// News

export const newsApi = {
  list: (params: { page?: number; size?: number; category?: string; q?: string } = {}) =>
    apiFetch<Paginated<NewsArticle>>(`/news${qs(params)}`),

  categories: () => apiFetch<string[]>("/news/categories"),
};

// ---------------------------------------------------------------------------
// Search

export const searchApi = {
  search: (params: { q: string; type?: "all" | "announcements" | "news" | "users"; page?: number; size?: number }) =>
    apiFetch<SearchResults>(`/search${qs(params)}`),
};

// ---------------------------------------------------------------------------
// Notifications

export const notificationsApi = {
  list: (params: { page?: number; size?: number } = {}) =>
    apiFetch<NotificationList>(`/notifications${qs(params)}`),

  markRead: (id: number) => apiFetch<Notification>(`/notifications/${id}/read`, { method: "POST" }),

  markAllRead: () => apiFetch<{ message: string }>("/notifications/read-all", { method: "POST" }),
};

export function notificationsWsUrl(): string | null {
  if (typeof window === "undefined") return null;
  const token = getAccessToken();
  if (!token) return null;
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/api/v1/ws/notifications?token=${encodeURIComponent(token)}`;
}

// ---------------------------------------------------------------------------
// Admin

export const adminApi = {
  stats: () => apiFetch<AdminStats>("/admin/stats"),

  users: (params: { page?: number; size?: number; q?: string } = {}) =>
    apiFetch<Paginated<User>>(`/admin/users${qs(params)}`),

  banUser: (id: number) => apiFetch<User>(`/admin/users/${id}/ban`, { method: "POST" }),
  unbanUser: (id: number) => apiFetch<User>(`/admin/users/${id}/unban`, { method: "POST" }),

  deleteAnnouncement: (id: number) => apiFetch<void>(`/admin/announcements/${id}`, { method: "DELETE" }),
  pin: (id: number) => apiFetch<Announcement>(`/admin/announcements/${id}/pin`, { method: "POST" }),
  unpin: (id: number) => apiFetch<Announcement>(`/admin/announcements/${id}/unpin`, { method: "POST" }),
  feature: (id: number) => apiFetch<Announcement>(`/admin/announcements/${id}/feature`, { method: "POST" }),
  unfeature: (id: number) =>
    apiFetch<Announcement>(`/admin/announcements/${id}/unfeature`, { method: "POST" }),

  comments: (params: { page?: number; size?: number; hidden?: boolean } = {}) =>
    apiFetch<Paginated<Comment>>(`/admin/comments${qs(params)}`),
  hideComment: (id: number) => apiFetch<Comment>(`/admin/comments/${id}/hide`, { method: "POST" }),
  showComment: (id: number) => apiFetch<Comment>(`/admin/comments/${id}/show`, { method: "POST" }),
  deleteComment: (id: number) => apiFetch<void>(`/comments/${id}`, { method: "DELETE" }),

  news: (params: { page?: number; size?: number; category?: string; q?: string } = {}) =>
    apiFetch<Paginated<NewsArticle>>(`/admin/news${qs(params)}`),
  fetchNews: () =>
    apiFetch<{ imported: number; message: string }>("/admin/news/fetch", { method: "POST" }),
  deleteNews: (id: number) => apiFetch<void>(`/admin/news/${id}`, { method: "DELETE" }),

  categories: () => apiFetch<Category[]>("/admin/categories"),
  createCategory: (body: { name: string; description?: string; icon?: string; color?: string }) =>
    apiFetch<Category>("/admin/categories", { method: "POST", body: JSON.stringify(body) }),
  updateCategory: (
    id: number,
    body: {
      name?: string;
      description?: string;
      icon?: string;
      color?: string;
      is_hidden?: boolean;
      is_featured?: boolean;
    },
  ) => apiFetch<Category>(`/admin/categories/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteCategory: (id: number) => apiFetch<void>(`/admin/categories/${id}`, { method: "DELETE" }),

  settings: () => apiFetch<SiteSetting[]>("/admin/settings"),
  updateSettings: (settings: Record<string, string>) =>
    apiFetch<SiteSetting[]>("/admin/settings", { method: "PUT", body: JSON.stringify({ settings }) }),

  logs: (params: { page?: number; size?: number } = {}) =>
    apiFetch<Paginated<ActivityLog>>(`/admin/logs${qs(params)}`),

  // System health
  health: () => apiFetch<SystemHealth>("/admin/health"),

  // Users — moderation
  suspendUser: (id: number) => apiFetch<User>(`/admin/users/${id}/suspend`, { method: "POST" }),
  unsuspendUser: (id: number) => apiFetch<User>(`/admin/users/${id}/unsuspend`, { method: "POST" }),
  promoteUser: (id: number, role: string) =>
    apiFetch<User>(`/admin/users/${id}/promote${qs({ role })}`, { method: "POST" }),
  resetUserPassword: (id: number) =>
    apiFetch<{ username: string; temporary_password: string }>(`/admin/users/${id}/reset-password`, {
      method: "POST",
    }),
  deleteUser: (id: number) => apiFetch<void>(`/admin/users/${id}`, { method: "DELETE" }),
  userLoginHistory: (id: number) =>
    apiFetch<LoginHistoryEntry[]>(`/admin/users/${id}/login-history`),
  userActivity: (id: number) => apiFetch<UserActivity>(`/admin/users/${id}/activity`),

  // Announcements — content management
  adminAnnouncements: (
    params: { page?: number; size?: number; status_filter?: string; trashed?: boolean; q?: string } = {},
  ) => apiFetch<Paginated<Announcement>>(`/admin/announcements${qs(params)}`),
  archiveAnnouncement: (id: number) =>
    apiFetch<Announcement>(`/admin/announcements/${id}/archive`, { method: "POST" }),
  unarchiveAnnouncement: (id: number) =>
    apiFetch<Announcement>(`/admin/announcements/${id}/unarchive`, { method: "POST" }),
  restoreAnnouncement: (id: number) =>
    apiFetch<Announcement>(`/admin/announcements/${id}/restore`, { method: "POST" }),
  scheduleAnnouncement: (id: number, publish_at: string) =>
    apiFetch<Announcement>(`/admin/announcements/${id}/schedule${qs({ publish_at })}`, {
      method: "POST",
    }),
  purgeAnnouncement: (id: number) =>
    apiFetch<void>(`/admin/announcements/${id}/purge`, { method: "DELETE" }),

  // Categories — reorder
  reorderCategories: (order: number[]) =>
    apiFetch<Category[]>("/admin/categories/reorder", {
      method: "POST",
      body: JSON.stringify({ order }),
    }),

  // AI providers
  aiProviders: () => apiFetch<AIProvider[]>("/admin/ai/providers"),
  updateProvider: (id: number, body: Partial<AIProvider>) =>
    apiFetch<AIProvider>(`/admin/ai/providers/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  activateProvider: (id: number) =>
    apiFetch<AIProvider>(`/admin/ai/providers/${id}/activate`, { method: "POST" }),
  testProvider: (id: number) =>
    apiFetch<{ ok: boolean; detail: string }>(`/admin/ai/providers/${id}/test`, { method: "POST" }),
  aiStatus: () => apiFetch<AIStatus>("/admin/ai/status"),

  // Storage
  storageFiles: (params: { page?: number; size?: number; orphan?: boolean } = {}) =>
    apiFetch<Paginated<StorageFile>>(`/admin/storage/files${qs(params)}`),
  deleteFile: (id: number) => apiFetch<void>(`/admin/storage/files/${id}`, { method: "DELETE" }),
  storageAnalytics: () => apiFetch<StorageAnalytics>("/admin/storage/analytics"),

  // Jobs
  jobs: () => apiFetch<JobsOverview>("/admin/jobs"),
  jobRuns: () => apiFetch<JobRun[]>("/admin/jobs/runs"),
  runJob: (name: string) => apiFetch<JobResult>(`/admin/jobs/run/${name}`, { method: "POST" }),
  retryRun: (id: number) => apiFetch<JobResult>(`/admin/jobs/runs/${id}/retry`, { method: "POST" }),

  // Cache
  cacheStats: () => apiFetch<CacheStats>("/admin/cache/stats"),
  clearCache: () => apiFetch<{ cleared: number; detail: string }>("/admin/cache/clear", { method: "POST" }),
  clearCacheGroup: (group: string) =>
    apiFetch<{ cleared: number; detail: string }>("/admin/cache/clear-group", {
      method: "POST",
      body: JSON.stringify({ group }),
    }),
  warmCache: () => apiFetch<{ warmed: string[]; count: number }>("/admin/cache/warm", { method: "POST" }),
  resetCacheStats: () => apiFetch<{ detail: string }>("/admin/cache/reset-stats", { method: "POST" }),
};

// ---------------------------------------------------------------------------
// Public settings (branding / theme) — no auth required

export const publicSettingsApi = {
  get: () => apiFetch<Record<string, string>>("/settings/public"),
};
