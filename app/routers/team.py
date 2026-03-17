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


@router.post("/auth", response_model=TeamResponse, status_code=status.HTTP_201_CREATED)
async def participate_team(
    body: TeamCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Универсальный эндпоинт:
    - Если команда для QR ещё не создана → создаёт новую
    - Если команда уже существует → присоединяет (проверяет название)
    """
    # 1. Находим QR
    qr_result = await db.execute(select(QRCode).where(QRCode.code == body.code))
    qr: QRCode | None = qr_result.scalar_one_or_none()

    if not qr:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="QR код не найден"
        )

    # 2. Ищем существующую команду по этому QR
    team_result = await db.execute(select(Team).where(Team.qr_code_id == qr.id))
    team: Team | None = team_result.scalar_one_or_none()

    if team:
        # ──────────────── Сценарий JOIN ────────────────
        if team.name.strip().lower() != body.team_name.strip().lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Неверное название команды"
            )

        # Всё ок → выдаём токен
        token = create_team_token(team.id, team.name)
        return TeamResponse(
            team_name=team.name,
            variant=team.variant,
            token=token,
            message=f"Добро пожаловать в команду '{team.name}'! Ваш вариант: {team.variant}"
        )

    else:
        # ──────────────── Сценарий REGISTER ────────────────
        # Проверяем уникальность названия
        name_check = await db.execute(select(Team).where(Team.name == body.team_name))
        if name_check.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Команда с названием '{body.team_name}' уже существует"
            )

        # Создаём команду
        team = Team(
            name=body.team_name,
            qr_code_id=qr.id,
            variant=1,  # временно
            token="",   # обновим позже
        )
        db.add(team)
        await db.flush()  # получаем team.id

        # Вычисляем реальный вариант
        team.variant = compute_variant(team.id, settings.TOTAL_VARIANTS)

        # Токен
        token = create_team_token(team.id, team.name)
        team.token = token

        # Помечаем QR использованным
        qr.is_used = True

        await db.commit()
        await db.refresh(team)

        return TeamResponse(
            team_name=team.name,
            variant=team.variant,
            token=token,
            message=f"Команда '{team.name}' успешно создана! Ваш вариант: {team.variant}"
        )