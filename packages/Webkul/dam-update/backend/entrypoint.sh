#!/bin/sh
set -e

echo "Waiting for Postgres..."
python - <<'PY'
import asyncio
import os
import sys
import time

import asyncpg


async def wait_for_postgres() -> None:
    url = os.environ.get(
        "DATABASE_URL",
        "postgresql+asyncpg://devannounce:devannounce@postgres:5432/devannounce",
    )
    # asyncpg needs a plain postgresql:// DSN, not the SQLAlchemy +asyncpg one.
    dsn = url.replace("postgresql+asyncpg://", "postgresql://")
    max_attempts = 60
    for attempt in range(1, max_attempts + 1):
        try:
            conn = await asyncpg.connect(dsn, timeout=5)
            await conn.close()
            print("Postgres is ready.")
            return
        except Exception as exc:  # noqa: BLE001
            print(f"Postgres not ready yet ({attempt}/{max_attempts}): {exc}")
            await asyncio.sleep(2)
    print("Postgres never became ready, exiting.", file=sys.stderr)
    sys.exit(1)


asyncio.run(wait_for_postgres())
PY

echo "Running database migrations..."
alembic upgrade head

echo "Seeding database..."
python -m app.seed

echo "Starting server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --proxy-headers
