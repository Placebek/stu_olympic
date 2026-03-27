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
    return (team_id - 1) % total_variants + 1


@router.post("/register", response_model=TeamResponse, status_code=status.HTTP_201_CREATED)
async def register_team(
    body: TeamCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Первый участник регистрирует команду (стол).
    Принимает имя и фамилию — они становятся идентификатором команды.
    """
    qr_result = await db.execute(select(QRCode).where(QRCode.code == body.code))
    qr = qr_result.scalar_one_or_none()
    if not qr:
        raise HTTPException(status_code=404, detail="QR код не найден")

    existing_team_for_qr = await db.execute(select(Team).where(Team.qr_code_id == qr.id))
    if existing_team_for_qr.scalar_one_or_none():
        raise HTTPException(
            status_code=409,
            detail="Для этого QR кода уже зарегистрирован участник. Используйте /team/join",
        )

    # Уникальное имя = Фамилия + Имя
    full_name = f"{body.last_name} {body.first_name}".strip()

    existing_name = await db.execute(select(Team).where(Team.name == full_name))
    if existing_name.scalar_one_or_none():
        raise HTTPException(
            status_code=409,
            detail=f"Участник '{full_name}' уже зарегистрирован",
        )

    team = Team(
        first_name=body.first_name,
        last_name=body.last_name,
        name=full_name,
        qr_code_id=qr.id,
        variant=1,
        token="",
    )
    db.add(team)
    await db.flush()

    variant = compute_variant(team.id, settings.TOTAL_VARIANTS)
    team.variant = variant
    token = create_team_token(team.id, team.name)
    team.token = token
    qr.is_used = True

    await db.commit()
    await db.refresh(team)

    return TeamResponse(
        first_name=team.first_name,
        last_name=team.last_name,
        variant=team.variant,
        token=token,
        message=f"Добро пожаловать, {body.first_name} {body.last_name}! Ваш вариант: {variant}",
    )


@router.post("/join", response_model=TeamResponse)
async def join_team(
    body: TeamJoinRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Остальные участники присоединяются к столу по QR.
    Вводят своё имя и фамилию — проверяется что QR уже занят
    (то есть первый участник уже зарегистрировался).
    """
    qr_result = await db.execute(select(QRCode).where(QRCode.code == body.code))
    qr = qr_result.scalar_one_or_none()
    if not qr:
        raise HTTPException(status_code=404, detail="QR код не найден")

    team_result = await db.execute(select(Team).where(Team.qr_code_id == qr.id))
    team = team_result.scalar_one_or_none()
    if not team:
        raise HTTPException(
            status_code=404,
            detail="Стол ещё не зарегистрирован. Попросите первого участника отсканировать QR.",
        )

    # Проверяем что имя+фамилия совпадают с зарегистрированным
    full_name = f"{body.last_name} {body.first_name}".strip()
    if team.name.strip().lower() != full_name.lower():
        raise HTTPException(
            status_code=400,
            detail="Имя и фамилия не совпадают с зарегистрированным участником",
        )

    token = create_team_token(team.id, team.name)

    return TeamResponse(
        first_name=team.first_name,
        last_name=team.last_name,
        variant=team.variant,
        token=token,
        message=f"Добро пожаловать, {team.first_name} {team.last_name}! Ваш вариант: {team.variant}",
    )