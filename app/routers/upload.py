import os
import uuid
from pathlib import Path

import aiofiles
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config import settings
from app.database import get_db
from app.models.models import Team, Upload
from app.schemas.schemas import UploadResponse
from app.auth import get_current_team

router = APIRouter(prefix="/upload", tags=["Upload"])


@router.post("/", response_model=UploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_file(
    file: UploadFile = File(...),
    current_team: Team = Depends(get_current_team),
    db: AsyncSession = Depends(get_db),
):
    """
    Загрузка файла командой.
    Требует Bearer токен в заголовке Authorization.
    Токен выдаётся при /team/register или /team/join.
    """
    # Создаём папку для загрузок если нет
    upload_dir = Path(settings.UPLOAD_DIR) / str(current_team.id)
    upload_dir.mkdir(parents=True, exist_ok=True)

    # Генерируем уникальное имя файла
    ext = Path(file.filename).suffix if file.filename else ""
    unique_name = f"{uuid.uuid4().hex}{ext}"
    file_path = upload_dir / unique_name

    # Сохраняем файл
    try:
        async with aiofiles.open(file_path, "wb") as f:
            while chunk := await file.read(1024 * 1024):  # читаем по 1 MB
                await f.write(chunk)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при сохранении файла: {str(e)}",
        )

    # Сохраняем запись в БД
    upload = Upload(
        team_id=current_team.id,
        filename=unique_name,
        original_name=file.filename or unique_name,
        file_path=str(file_path),
    )
    db.add(upload)
    await db.commit()
    await db.refresh(upload)

    return UploadResponse(
        id=upload.id,
        team_name=current_team.name,
        filename=upload.filename,
        original_name=upload.original_name,
        uploaded_at=upload.uploaded_at,
    )


@router.get("/my", response_model=list[UploadResponse])
async def get_my_uploads(
    current_team: Team = Depends(get_current_team),
    db: AsyncSession = Depends(get_db),
):
    """Список файлов, загруженных текущей командой."""
    result = await db.execute(
        select(Upload).where(Upload.team_id == current_team.id).order_by(Upload.uploaded_at.desc())
    )
    uploads = result.scalars().all()
    return [
        UploadResponse(
            id=u.id,
            team_name=current_team.name,
            filename=u.filename,
            original_name=u.original_name,
            uploaded_at=u.uploaded_at,
        )
        for u in uploads
    ]
