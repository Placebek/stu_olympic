from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.models import QRCode, Team
from app.schemas.schemas import QRVerifyRequest, QRVerifyResponse

router = APIRouter(prefix="/qr", tags=["QR"])


@router.post("/verify", response_model=QRVerifyResponse)
async def verify_qr(
    body: QRVerifyRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Шаг 1 — проверка QR кода.
    - valid=false: недействительный QR
    - team_exists=false: первый участник → показать форму с именем/фамилией
    - team_exists=true: повторный вход → ввести своё имя и фамилию
    """
    result = await db.execute(select(QRCode).where(QRCode.code == body.code))
    qr = result.scalar_one_or_none()

    if not qr:
        return QRVerifyResponse(
            valid=False,
            team_exists=False,
            message="Недействительный QR код",
        )

    team_result = await db.execute(select(Team).where(Team.qr_code_id == qr.id))
    team = team_result.scalar_one_or_none()

    if team:
        return QRVerifyResponse(
            valid=True,
            team_exists=True,
            first_name=team.first_name,
            last_name=team.last_name,
            message=f"Стол зарегистрирован на {team.last_name} {team.first_name}. Введите своё имя и фамилию для входа.",
        )

    return QRVerifyResponse(
        valid=True,
        team_exists=False,
        message="QR код действителен. Вы первый! Введите своё имя и фамилию.",
    )