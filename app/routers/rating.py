"""
Рейтинг команд после олимпиады.
Формула итогового балла:
  total_score = quiz_correct * QUIZ_WEIGHT + tasks_correct * TASK_WEIGHT

  QUIZ_WEIGHT  = 1 балл за каждый правильный ответ в тесте  (макс 10)
  TASK_WEIGHT  = 5 баллов за каждую правильно решённую задачу
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.models import Team, Upload, TeamQuizSession, TeamAnswer, QuizQuestion
from app.schemas.schemas import TeamRatingEntry

router = APIRouter(prefix="/rating", tags=["Rating"])

QUIZ_WEIGHT = 1   # баллов за правильный ответ теста
TASK_WEIGHT = 5   # баллов за правильно решённую задачу
QUIZ_TOTAL  = 10  # всего вопросов в сессии


@router.get("/", response_model=list[TeamRatingEntry], summary="Общий рейтинг команд")
async def get_rating(db: AsyncSession = Depends(get_db)):
    """
    Возвращает рейтинг всех команд, отсортированный по убыванию итогового балла.

    **Формула:**
    - За каждый правильный ответ теста: **+1 балл**
    - За каждую правильно проверенную задачу: **+5 баллов**

    Рейтинг доступен всем (без токена).
    """
    teams_res = await db.execute(select(Team).order_by(Team.id))
    teams = teams_res.scalars().all()

    entries = []

    for team in teams:
        # ── Тест ──
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
            quiz_correct = sum(1 for a in answers if a.is_correct)
            quiz_completed = session.is_completed

        quiz_score = round(quiz_correct / QUIZ_TOTAL * 100, 1)

        # ── Задачи ──
        uploads_res = await db.execute(
            select(Upload).where(Upload.team_id == team.id)
        )
        uploads = uploads_res.scalars().all()

        tasks_submitted = len(uploads)
        tasks_checked   = sum(1 for u in uploads if u.is_checked)
        tasks_correct   = sum(1 for u in uploads if u.is_correct is True)

        # ── Итоговый балл ──
        total_score = quiz_correct * QUIZ_WEIGHT + tasks_correct * TASK_WEIGHT

        entries.append({
            "team_id":        team.id,
            "firstname":      team.firstname,
            "lastname":       team.lastname,
            "team_name":      team.firstname + " " + team.lastname,
            "variant":        team.variant,
            "quiz_score":     quiz_score,
            "quiz_correct":   quiz_correct,
            "quiz_total":     QUIZ_TOTAL,
            "quiz_completed": quiz_completed,
            "tasks_submitted":tasks_submitted,
            "tasks_correct":  tasks_correct,
            "tasks_checked":  tasks_checked,
            "total_score":    total_score,
        })

    # Сортируем по убыванию total_score, при равенстве — по quiz_correct
    entries.sort(key=lambda x: (-x["total_score"], -x["quiz_correct"]))

    # Добавляем rank
    result = []
    for i, e in enumerate(entries, 1):
        result.append(TeamRatingEntry(rank=i, **e))

    return result


@router.get("/me", response_model=TeamRatingEntry, summary="Моё место в рейтинге")
async def get_my_rating(
    db: AsyncSession = Depends(get_db),
    current_team: Team = Depends(__import__('app.auth', fromlist=['get_current_team']).get_current_team),
):
    """Возвращает место и баллы текущей команды. Требует токен."""
    all_rating = await get_rating(db)
    for entry in all_rating:
        if entry.team_id == current_team.id:
            return entry
    # Если команда ещё без баллов — вернём последнее место
    return TeamRatingEntry(
        rank=len(all_rating) + 1,
        team_id=current_team.id,
        team_name=current_team.firstname + " " + current_team.lastname,
        variant=current_team.variant,
        quiz_score=0.0, quiz_correct=0, quiz_total=QUIZ_TOTAL,
        quiz_completed=False,
        tasks_submitted=0, tasks_correct=0, tasks_checked=0,
        total_score=0.0,
    )