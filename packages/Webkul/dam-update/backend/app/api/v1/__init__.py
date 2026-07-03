"""Aggregates all v1 API routers under a single `api_router`."""

from fastapi import APIRouter

from app.api.v1 import (
    admin,
    admin_ai,
    admin_cache,
    admin_health,
    admin_jobs,
    admin_storage,
    announcements,
    auth,
    categories,
    comments,
    news,
    notifications,
    public_settings,
    search,
    uploads,
    users,
    ws,
)

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(categories.router, prefix="/categories", tags=["categories"])
api_router.include_router(announcements.router, prefix="/announcements", tags=["announcements"])
api_router.include_router(comments.router, prefix="/comments", tags=["comments"])
api_router.include_router(uploads.router, prefix="/uploads", tags=["uploads"])
api_router.include_router(news.router, prefix="/news", tags=["news"])
api_router.include_router(search.router, prefix="/search", tags=["search"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
api_router.include_router(public_settings.router, prefix="/settings", tags=["settings"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(admin_health.router, prefix="/admin", tags=["admin"])
api_router.include_router(admin_cache.router, prefix="/admin/cache", tags=["admin-cache"])
api_router.include_router(admin_ai.router, prefix="/admin/ai", tags=["admin-ai"])
api_router.include_router(admin_storage.router, prefix="/admin/storage", tags=["admin-storage"])
api_router.include_router(admin_jobs.router, prefix="/admin/jobs", tags=["admin-jobs"])
api_router.include_router(ws.router, prefix="/ws", tags=["websocket"])

__all__ = ["api_router"]
