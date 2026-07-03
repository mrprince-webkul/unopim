"""Admin: multi-provider AI engine — list/update/activate/test providers."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin
from app.core.database import get_db
from app.models.user import User
from app.services import ai_providers

router = APIRouter()


class ProviderUpdate(BaseModel):
    # `model` collides with pydantic's protected namespace; disable it.
    model_config = ConfigDict(protected_namespaces=(), extra="ignore")

    name: str | None = None
    provider_type: str | None = None
    api_key: str | None = None
    base_url: str | None = None
    model: str | None = None
    temperature: float | None = None
    max_tokens: int | None = None
    timeout: int | None = None
    daily_limit: int | None = None
    enabled: bool | None = None


@router.get("/providers")
async def list_providers(
    db: AsyncSession = Depends(get_db), _: User = Depends(get_current_admin)
) -> list[dict]:
    return [ai_providers.to_dict(p) for p in await ai_providers.list_providers(db)]


@router.put("/providers/{provider_id}")
async def update_provider(
    provider_id: int,
    payload: ProviderUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
) -> dict:
    provider = await ai_providers.get_provider(db, provider_id)
    if provider is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider not found")
    updates = payload.model_dump(exclude_unset=True)
    if updates.get("provider_type") and updates["provider_type"] not in ai_providers.PROVIDER_TYPES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid provider_type")
    provider = await ai_providers.update_provider(db, provider, updates)
    return ai_providers.to_dict(provider)


@router.post("/providers/{provider_id}/activate")
async def activate_provider(
    provider_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
) -> dict:
    provider = await ai_providers.get_provider(db, provider_id)
    if provider is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider not found")
    provider = await ai_providers.set_active(db, provider)
    return ai_providers.to_dict(provider)


@router.post("/providers/{provider_id}/test")
async def test_provider(
    provider_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
) -> dict:
    provider = await ai_providers.get_provider(db, provider_id)
    if provider is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider not found")
    return await ai_providers.test_provider(provider)


@router.get("/status")
async def ai_status(
    db: AsyncSession = Depends(get_db), _: User = Depends(get_current_admin)
) -> dict:
    providers = await ai_providers.list_providers(db)
    active = next((p for p in providers if p.is_active), None)
    return {
        "active_provider": active.name if active else None,
        "active_model": active.model if active else None,
        "enabled_count": sum(1 for p in providers if p.enabled),
        "total": len(providers),
        "usage": await ai_providers.usage_summary(db),
    }
