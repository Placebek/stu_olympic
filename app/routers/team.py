from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config import settings
from app.database import get_db
from app.models.models import QRCode, Team
from app.schemas.schemas import TeamCreateRequest, TeamJoinRequest, TeamResponse
from app.auth import create_team_token

router = APIRouter(prefix="/team", tags=["Team"])


def compute_variant(team_id: int, total_variants: int) -> int:
    """
    Распределяем варианты по командам.
    Используем (team_id - 1) % total_variants + 1
    чтобы варианты шли 1,2,3,4,5,1,2,3,4,5,...
    и не было варианта 0.
    Например:
      team_id=1  → вариант 1
      team_id=5  → вариант 5
      team_id=6  → вариант 1
      team_id=10 → вариант 5
      team_id=11 → вариант 1
    """
    return (team_id - 1) % total_variants + 1


@router.post("/register", response_model=TeamResponse, status_code=status.HTTP_201_CREATED)
async def register_team(
    body: TeamCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Шаг 2а — первый участник создаёт команду.
    Вызывается когда team_exists=False.
    """
    # Проверяем QR
    qr_result = await db.execute(select(QRCode).where(QRCode.code == body.code))
    qr = qr_result.scalar_one_or_none()

    if not qr:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="QR код не найден")

    # Проверяем — вдруг уже занят (race condition)
    existing_team_for_qr = await db.execute(select(Team).where(Team.qr_code_id == qr.id))
    if existing_team_for_qr.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Для этого QR кода уже создана команда. Используйте /team/join",
        )

    # Проверяем уникальность названия команды
    existing_name = await db.execute(select(Team).where(Team.name == body.team_name))
    if existing_name.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Команда с названием '{body.team_name}' уже существует",
        )

    # Считаем сколько команд уже есть, чтобы определить team_id для варианта
    # Создаём команду с временным токеном, потом обновим
    team = Team(
        name=body.team_name,
        qr_code_id=qr.id,
        variant=1,   # временно, пересчитаем после получения id
        token="",
    )
    db.add(team)
    await db.flush()  # получаем team.id без коммита

    # Вычисляем вариант по id команды
    variant = compute_variant(team.id, settings.TOTAL_VARIANTS)
    team.variant = variant

    # Генерируем токен
    token = create_team_token(team.id, team.name)
    team.token = token

    # Помечаем QR как использованный
    qr.is_used = True

    await db.commit()
    await db.refresh(team)

    return TeamResponse(
        team_name=team.name,
        variant=team.variant,
        token=token,
        message=f"Команда '{team.name}' успешно зарегистрирована! Ваш вариант: {variant}",
    )


@router.post("/join", response_model=TeamResponse)
async def join_team(
    body: TeamJoinRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Шаг 2б — остальные участники присоединяются к команде.
    Вызывается когда team_exists=True.
    Проверяет что название команды совпадает с тем, что зарегистрировано для этого QR.
    """
    # Проверяем QR
    qr_result = await db.execute(select(QRCode).where(QRCode.code == body.code))
    qr = qr_result.scalar_one_or_none()

    if not qr:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="QR код не найден")

    # Ищем команду по QR
    team_result = await db.execute(select(Team).where(Team.qr_code_id == qr.id))
    team = team_result.scalar_one_or_none()

    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Команда для этого QR не найдена. Попросите первого участника зарегистрировать команду.",
        )

    # Проверяем название
    if team.name.strip().lower() != body.team_name.strip().lower():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Неверное название команды",
        )

    # Генерируем свежий токен для этого участника (или возвращаем командный)
    token = create_team_token(team.id, team.name)

    return TeamResponse(
        team_name=team.name,
        variant=team.variant,
        token=token,
        message=f"Добро пожаловать в команду '{team.name}'! Ваш вариант: {team.variant}",
    )
