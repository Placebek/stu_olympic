from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.models import Team, Upload, TeamQuizSession, TeamAnswer
from app.schemas.schemas import TeamRatingEntry
from app.auth import get_current_team

router = APIRouter(prefix="/rating", tags=["Rating"])

QUIZ_WEIGHT = 1
TASK_WEIGHT = 5
QUIZ_TOTAL  = 10


@router.get("/", response_model=list[TeamRatingEntry], summary="Общий рейтинг")
async def get_rating(db: AsyncSession = Depends(get_db)):
    """
    Рейтинг всех участников по убыванию баллов.
    Доступен без токена.

    **Формула:** тест × 1 балл + правильные задачи × 5 баллов
    """
    teams_res = await db.execute(select(Team).order_by(Team.id))
    teams = teams_res.scalars().all()

    entries = []
    for team in teams:
        sess_res = await db.execute(
            select(TeamQuizSession).where(TeamQuizSession.team_id == team.id)
        )
        session = sess_res.scalar_one_or_none()

        quiz_correct = 0
        quiz_completed = False
        if session:
            ans_res = await db.execute(
                select(TeamAnswer).where(TeamAnswer.session_id == session.id)
            )
            answers = ans_res.scalars().all()
            quiz_correct   = sum(1 for a in answers if a.is_correct)
            quiz_completed = session.is_completed

        uploads_res = await db.execute(select(Upload).where(Upload.team_id == team.id))
        uploads = uploads_res.scalars().all()

        tasks_submitted = len(uploads)
        tasks_checked   = sum(1 for u in uploads if u.is_checked)
        tasks_correct   = sum(1 for u in uploads if u.is_correct is True)
        total_score     = quiz_correct * QUIZ_WEIGHT + tasks_correct * TASK_WEIGHT

        entries.append(dict(
            team_id=team.id,
            first_name=team.first_name,
            last_name=team.last_name,
            variant=team.variant,
            quiz_score=round(quiz_correct / QUIZ_TOTAL * 100, 1),
            quiz_correct=quiz_correct,
            quiz_total=QUIZ_TOTAL,
            quiz_completed=quiz_completed,
            tasks_submitted=tasks_submitted,
            tasks_correct=tasks_correct,
            tasks_checked=tasks_checked,
            total_score=float(total_score),
        ))

    entries.sort(key=lambda x: (-x["total_score"], -x["quiz_correct"]))

    return [TeamRatingEntry(rank=i + 1, **e) for i, e in enumerate(entries)]


@router.get("/me", response_model=TeamRatingEntry, summary="Моё место в рейтинге")
async def get_my_rating(
    current_team: Team = Depends(get_current_team),
    db: AsyncSession = Depends(get_db),
):
    """Место и баллы текущего участника. Требует токен."""
    all_rating = await get_rating(db)
    for entry in all_rating:
        if entry.team_id == current_team.id:
            return entry
    return TeamRatingEntry(
        rank=len(all_rating) + 1,
        team_id=current_team.id,
        first_name=current_team.first_name,
        last_name=current_team.last_name,
        variant=current_team.variant,
        quiz_score=0.0, quiz_correct=0, quiz_total=QUIZ_TOTAL,
        quiz_completed=False,
        tasks_submitted=0, tasks_correct=0, tasks_checked=0,
        total_score=0.0,
    )