"""ORM models. Import this module to register all tables on Base.metadata."""

from app.core.database import Base
from app.models.activity import ActivityLog
from app.models.ai_provider import AIProvider
from app.models.analytics import AnalyticsEvent
from app.models.announcement import Announcement, Bookmark, Like, Tag, announcement_tags
from app.models.attachment import Attachment
from app.models.category import Category
from app.models.comment import Comment
from app.models.job_run import JobRun
from app.models.login_history import LoginHistory
from app.models.news import NewsArticle
from app.models.notification import Notification
from app.models.settings import SiteSetting
from app.models.user import Follow, User

__all__ = [
    "Base",
    "ActivityLog",
    "AIProvider",
    "AnalyticsEvent",
    "Announcement",
    "Bookmark",
    "Like",
    "Tag",
    "announcement_tags",
    "Attachment",
    "Category",
    "Comment",
    "JobRun",
    "LoginHistory",
    "NewsArticle",
    "Notification",
    "SiteSetting",
    "Follow",
    "User",
]
