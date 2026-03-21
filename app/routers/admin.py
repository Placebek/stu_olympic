"""Административные эндпоинты."""
import secrets
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models.models import QRCode, Team, Upload, QuizQuestion, TeamQuizSession
from app.schemas.schemas import QuizQuestionCreate, QuizQuestionResponse, TeamQuizResult
from app.routers.quiz import _build_team_result

router = APIRouter(prefix="/admin", tags=["Admin"])

MAX_PER_CATEGORY = 25  # максимум 25 network + 25 database


# ─── QR ──────────────────────────────────────────────────────────────────────

@router.post("/seed-qr", summary="Создать 100 уникальных QR кодов")
async def seed_qr_codes(db: AsyncSession = Depends(get_db)):
    count_res = await db.execute(select(func.count()).select_from(QRCode))
    existing = count_res.scalar()
    if existing >= 100:
        return {"message": f"QR коды уже созданы ({existing} шт.)", "created": 0}
    to_create = 100 - existing
    db.add_all([QRCode(code=secrets.token_urlsafe(32)) for _ in range(to_create)])
    await db.commit()
    result = await db.execute(select(QRCode).order_by(QRCode.id))
    all_codes = result.scalars().all()
    return {
        "message": f"Создано {to_create} QR кодов", "created": to_create,
        "total": len(all_codes),
        "codes": [{"id": qr.id, "code": qr.code, "is_used": qr.is_used} for qr in all_codes],
    }

@router.get("/qr-codes", summary="Список всех QR кодов")
async def list_qr_codes(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(QRCode).order_by(QRCode.id))
    codes = result.scalars().all()
    return [{"id": qr.id, "code": qr.code, "is_used": qr.is_used} for qr in codes]


# ─── Teams ───────────────────────────────────────────────────────────────────

@router.get("/teams", summary="Список всех команд")
async def list_teams(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Team).order_by(Team.id))
    return [
        {"id": t.id, "name": t.name, "variant": t.variant,
         "qr_code_id": t.qr_code_id, "created_at": t.created_at}
        for t in result.scalars().all()
    ]


# ─── Uploads ─────────────────────────────────────────────────────────────────

@router.get("/uploads", summary="Список всех загрузок")
async def list_uploads(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Upload, Team.name).join(Team, Upload.team_id == Team.id)
        .order_by(Upload.uploaded_at.desc())
    )
    return [
        {"id": u.id, "team_name": name, "original_name": u.original_name,
         "filename": u.filename, "uploaded_at": u.uploaded_at}
        for u, name in result.all()
    ]


# ─── Quiz — вопросы ───────────────────────────────────────────────────────────

@router.post(
    "/quiz/questions",
    response_model=QuizQuestionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Добавить вопрос (network или database)",
)
async def create_question(body: QuizQuestionCreate, db: AsyncSession = Depends(get_db)):
    """
    Добавляет вопрос в нужную категорию.
    Лимит: 25 вопросов на каждую категорию (network / database).

    Пример:
    ```json
    {
      "text": "Что такое BGP?",
      "options": ["Протокол маршрутизации", "БД", "ОС", "Браузер"],
      "correct_index": 0,
      "category": "network"
    }
    ```
    """
    cat_count_res = await db.execute(
        select(func.count()).select_from(QuizQuestion)
        .where(QuizQuestion.category == body.category)
    )
    cat_count = cat_count_res.scalar()

    if cat_count >= MAX_PER_CATEGORY:
        raise HTTPException(
            status_code=400,
            detail=f"Категория '{body.category}' уже содержит {MAX_PER_CATEGORY} вопросов",
        )

    q = QuizQuestion(
        text=body.text,
        options=body.options,
        correct_index=body.correct_index,
        category=body.category,
    )
    db.add(q)
    await db.commit()
    await db.refresh(q)
    return q


@router.get(
    "/quiz/questions",
    response_model=list[QuizQuestionResponse],
    summary="Все вопросы с правильными ответами",
)
async def list_questions(
    category: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """Фильтр по категории: ?category=network или ?category=database"""
    query = select(QuizQuestion).order_by(QuizQuestion.category, QuizQuestion.id)
    if category:
        query = query.where(QuizQuestion.category == category)
    result = await db.execute(query)
    return result.scalars().all()


@router.get(
    "/quiz/questions/stats",
    summary="Статистика вопросов по категориям",
)
async def questions_stats(db: AsyncSession = Depends(get_db)):
    net_res = await db.execute(
        select(func.count()).select_from(QuizQuestion).where(QuizQuestion.category == "network")
    )
    db_res = await db.execute(
        select(func.count()).select_from(QuizQuestion).where(QuizQuestion.category == "database")
    )
    return {
        "network":  {"count": net_res.scalar(),  "max": MAX_PER_CATEGORY},
        "database": {"count": db_res.scalar(), "max": MAX_PER_CATEGORY},
        "total":    net_res.scalar() + db_res.scalar(),
    }


@router.put(
    "/quiz/questions/{question_id}",
    response_model=QuizQuestionResponse,
    summary="Редактировать вопрос",
)
async def update_question(
    question_id: int, body: QuizQuestionCreate, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(QuizQuestion).where(QuizQuestion.id == question_id))
    q = result.scalar_one_or_none()
    if not q:
        raise HTTPException(status_code=404, detail="Вопрос не найден")
    q.text = body.text
    q.options = body.options
    q.correct_index = body.correct_index
    q.category = body.category
    await db.commit()
    await db.refresh(q)
    return q


@router.delete("/quiz/questions/{question_id}", summary="Удалить вопрос")
async def delete_question(question_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(QuizQuestion).where(QuizQuestion.id == question_id))
    q = result.scalar_one_or_none()
    if not q:
        raise HTTPException(status_code=404, detail="Вопрос не найден")
    await db.delete(q)
    await db.commit()
    return {"message": f"Вопрос {question_id} удалён"}


# ─── Quiz — результаты ────────────────────────────────────────────────────────

@router.get(
    "/quiz/summary",
    summary="Краткая таблица результатов всех команд",
)
async def quiz_summary(db: AsyncSession = Depends(get_db)):
    """Сводка: команда / вариант / сети / БД / итог."""
    teams = (await db.execute(select(Team).order_by(Team.id))).scalars().all()
    rows = []
    for team in teams:
        r = await _build_team_result(team.id, team.name, team.variant, db)
        rows.append({
            "team_id":         team.id,
            "team_name":       team.name,
            "variant":         team.variant,
            "is_completed":    r.is_completed,
            "answered":        f"{r.answered_count}/{r.total_questions}",
            "network_correct": f"{r.network_correct}/5",
            "database_correct":f"{r.database_correct}/5",
            "total_correct":   r.correct_count,
            "score_percent":   r.score_percent,
        })
    return rows


@router.get(
    "/quiz/results",
    response_model=list[TeamQuizResult],
    summary="Детальные результаты всех команд",
)
async def all_quiz_results(db: AsyncSession = Depends(get_db)):
    teams = (await db.execute(select(Team).order_by(Team.id))).scalars().all()
    return [await _build_team_result(t.id, t.name, t.variant, db) for t in teams]


@router.get(
    "/quiz/results/{team_id}",
    response_model=TeamQuizResult,
    summary="Детальные результаты одной команды",
)
async def team_quiz_result(team_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Team).where(Team.id == team_id))
    team = result.scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=404, detail="Команда не найдена")
    return await _build_team_result(team.id, team.name, team.variant, db)
