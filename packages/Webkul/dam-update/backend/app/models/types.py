"""Custom SQLAlchemy column types shared across models."""

from __future__ import annotations

from sqlalchemy.dialects.postgresql import TSVECTOR
from sqlalchemy.types import Text, TypeDecorator


class TSVectorType(TypeDecorator):
    """A `tsvector` column on PostgreSQL, plain TEXT everywhere else (e.g. SQLite tests).

    The ORM never writes to this column directly on Postgres — a database
    trigger (see migration 0001) keeps it in sync from title/description/content.
    On SQLite it's simply unused (search falls back to ILIKE).
    """

    impl = Text
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(TSVECTOR())
        return dialect.type_descriptor(Text())
