"""
Административные эндпоинты.
В продакшене закройте их или добавьте отдельную аутентификацию.
"""
import secrets
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models.models import QRCode, Team, Upload, QuizQuestion, TeamQuizSession, TeamAnswer
from app.schemas.schemas import (
    QuizQuestionCreate, QuizQuestionResponse, TeamQuizResult,
)
from app.routers.quiz import _build_team_result

router = APIRouter(prefix="/admin", tags=["Admin"])


# ─── QR ─────────────────────────────────────────────────────────────────────

@router.post("/seed-qr", summary="Создать 100 уникальных QR кодов")
async def seed_qr_codes(db: AsyncSession = Depends(get_db)):
    count_result = await db.execute(select(func.count()).select_from(QRCode))
    existing = count_result.scalar()

    if existing >= 100:
        return {"message": f"QR коды уже созданы ({existing} шт.)", "created": 0}

    to_create = 100 - existing
    new_codes = [QRCode(code=secrets.token_urlsafe(32)) for _ in range(to_create)]
    db.add_all(new_codes)
    await db.commit()

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


# ─── Teams ──────────────────────────────────────────────────────────────────

@router.get("/teams", summary="Список всех команд")
async def list_teams(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Team).order_by(Team.id))
    teams = result.scalars().all()
    return [
        {"id": t.id, "first_name": t.first_name, "last_name": t.last_name, "variant": t.variant,
         "qr_code_id": t.qr_code_id, "created_at": t.created_at}
        for t in teams
    ]


# ─── Uploads ─────────────────────────────────────────────────────────────────

@router.get("/uploads", summary="Список всех загруженных файлов")
async def list_uploads(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Upload, Team.first_name, Team.last_name)
        .join(Team, Upload.team_id == Team.id)
        .order_by(Upload.uploaded_at.desc())
    )
    rows = result.all()
    return [
        {"id": u.id, "first_name": first_name, "last_name": last_name, "original_name": u.original_name,
         "filename": u.filename, "uploaded_at": u.uploaded_at}
        for u, first_name, last_name in rows
    ]


# ─── Quiz — управление вопросами ─────────────────────────────────────────────

@router.post(
    "/quiz/questions",
    response_model=QuizQuestionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Добавить вопрос теста",
)
async def create_question(
    body: QuizQuestionCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Добавляет один вопрос с вариантами ответа.

    Пример тела запроса:
    ```json
    {
      "text": "Что такое FastAPI?",
      "options": ["ORM", "Web framework", "Database", "OS"],
      "correct_index": 1
    }
    ```
    correct_index — 0-based индекс правильного ответа.
    """
    count_result = await db.execute(select(func.count()).select_from(QuizQuestion))
    current_count = count_result.scalar()
    if current_count >= 50:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Уже 50 вопросов в базе. Удалите лишние перед добавлением новых.",
        )

    q = QuizQuestion(
        text=body.text,
        options=body.options,
        correct_index=body.correct_index,
    )
    db.add(q)
    await db.commit()
    await db.refresh(q)
    return q


@router.get(
    "/quiz/questions",
    response_model=list[QuizQuestionResponse],
    summary="Список всех вопросов (с правильными ответами)",
)
async def list_questions(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(QuizQuestion).order_by(QuizQuestion.id))
    return result.scalars().all()


@router.put(
    "/quiz/questions/{question_id}",
    response_model=QuizQuestionResponse,
    summary="Редактировать вопрос",
)
async def update_question(
    question_id: int,
    body: QuizQuestionCreate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(QuizQuestion).where(QuizQuestion.id == question_id))
    q = result.scalar_one_or_none()
    if not q:
        raise HTTPException(status_code=404, detail="Вопрос не найден")

    q.text = body.text
    q.options = body.options
    q.correct_index = body.correct_index
    await db.commit()
    await db.refresh(q)
    return q


@router.delete(
    "/quiz/questions/{question_id}",
    summary="Удалить вопрос",
)
async def delete_question(
    question_id: int,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(QuizQuestion).where(QuizQuestion.id == question_id))
    q = result.scalar_one_or_none()
    if not q:
        raise HTTPException(status_code=404, detail="Вопрос не найден")
    await db.delete(q)
    await db.commit()
    return {"message": f"Вопрос {question_id} удалён"}


# ─── Quiz — результаты команд (для проверки) ──────────────────────────────────

@router.get(
    "/quiz/results",
    response_model=list[TeamQuizResult],
    summary="Результаты всех команд",
)
async def all_quiz_results(db: AsyncSession = Depends(get_db)):
    """Возвращает результаты всех команд с детальными ответами."""
    teams_result = await db.execute(select(Team).order_by(Team.id))
    teams = teams_result.scalars().all()

    results = []
    for team in teams:
        r = await _build_team_result(team.id, team.first_name, team.last_name, team.variant, db)
        results.append(r)
    return results


@router.get(
    "/quiz/results/{team_id}",
    response_model=TeamQuizResult,
    summary="Результаты конкретной команды",
)
async def team_quiz_result(
    team_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Детальные ответы одной команды — для ручной проверки."""
    result = await db.execute(select(Team).where(Team.id == team_id))
    team = result.scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=404, detail="Команда не найдена")

    return await _build_team_result(team.id, team.first_name, team.last_name, team.variant, db)


@router.get(
    "/quiz/summary",
    summary="Краткая таблица результатов всех команд",
)
async def quiz_summary(db: AsyncSession = Depends(get_db)):
    """Краткая сводка: команда, вариант, баллы — удобно для показа на экране."""
    teams_result = await db.execute(select(Team).order_by(Team.id))
    teams = teams_result.scalars().all()

    rows = []
    for team in teams:
        r = await _build_team_result(team.id, team.first_name, team.last_name, team.variant, db)
        rows.append({
            "team_id": team.id,
            "first_name": team.first_name,
            "last_name": team.last_name,
            "variant": team.variant,
            "is_completed": r.is_completed,
            "answered": f"{r.answered_count}/{r.total_questions}",
            "correct": r.correct_count,
            "score_percent": r.score_percent,
        })
    return rows
