"""
Административные эндпоинты.
В продакшене закройте их или добавьте отдельную аутентификацию.
"""
import secrets
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models.models import QRCode, Team, Upload

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.post("/seed-qr", summary="Создать 100 уникальных QR кодов")
async def seed_qr_codes(db: AsyncSession = Depends(get_db)):
    """
    Создаёт 100 уникальных QR кодов если их ещё нет.
    Вызовите один раз при первом запуске.
    """
    count_result = await db.execute(select(func.count()).select_from(QRCode))
    existing = count_result.scalar()

    if existing >= 100:
        return {"message": f"QR коды уже созданы ({existing} шт.)", "created": 0}

    to_create = 100 - existing
    new_codes = []
    for _ in range(to_create):
        code = secrets.token_urlsafe(32)
        new_codes.append(QRCode(code=code))

    db.add_all(new_codes)
    await db.commit()

    # Возвращаем все коды
    result = await db.execute(select(QRCode).order_by(QRCode.id))
    all_codes = result.scalars().all()

    return {
        "message": f"Создано {to_create} QR кодов",
        "created": to_create,
        "total": len(all_codes),
        "codes": [{"id": qr.id, "code": qr.code, "is_used": qr.is_used} for qr in all_codes],
    }


@router.get("/qr-codes", summary="Список всех QR кодов")
async def list_qr_codes(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(QRCode).order_by(QRCode.id))
    codes = result.scalars().all()
    return [{"id": qr.id, "code": qr.code, "is_used": qr.is_used} for qr in codes]


@router.get("/teams", summary="Список всех команд")
async def list_teams(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Team).order_by(Team.id))
    teams = result.scalars().all()
    return [
        {
            "id": t.id,
            "name": t.name,
            "variant": t.variant,
            "qr_code_id": t.qr_code_id,
            "created_at": t.created_at,
        }
        for t in teams
    ]


@router.get("/uploads", summary="Список всех загруженных файлов")
async def list_uploads(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Upload, Team.name)
        .join(Team, Upload.team_id == Team.id)
        .order_by(Upload.uploaded_at.desc())
    )
    rows = result.all()
    return [
        {
            "id": u.id,
            "team_name": name,
            "original_name": u.original_name,
            "filename": u.filename,
            "uploaded_at": u.uploaded_at,
        }
        for u, name in rows
    ]
