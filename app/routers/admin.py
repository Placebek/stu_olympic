"""Административные эндпоинты."""
import secrets
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
import hashlib
from app.database import get_db
from app.models.models import QRCode, Team, Upload, QuizQuestion, TeamQuizSession, TeamAnswer
from app.schemas.schemas import QuizQuestionCreate, QuizQuestionResponse, TeamQuizResult, UploadCheckUpdate, UploadResponse
from app.routers.quiz import _build_team_result

router = APIRouter(prefix="/admin", tags=["Admin"])

MAX_PER_CATEGORY = 25  # максимум 25 network + 25 database


# ─── QR ──────────────────────────────────────────────────────────────────────
def _generate_fixed_codes(count: int = 100) -> list[str]:
    """
    Генерирует фиксированный список 6-значных цифровых кодов.
    Коды всегда одинаковые — детерминированы через SHA-256 от индекса.
    Уникальность гарантирована (проверяется внутри).
    """
    codes = []
    seen = set()
    i = 0
    while len(codes) < count:
        raw = hashlib.sha256(f"olympic_qr_salt_{i}".encode()).hexdigest()
        # Берём первые 6 цифр из хеша
        digits = "".join(c for c in raw if c.isdigit())[:6]
        if len(digits) == 6 and digits not in seen:
            seen.add(digits)
            codes.append(digits)
        i += 1
    return codes
 
 
# Фиксированный список — вычисляется один раз при старте
FIXED_QR_CODES = _generate_fixed_codes(100)


@router.post("/seed-qr", summary="Создать 100 фиксированных 6-значных QR кодов")
async def seed_qr_codes(db: AsyncSession = Depends(get_db)):
    """
    Создаёт 100 QR кодов с фиксированными 6-значными кодами.
    Коды всегда одинаковые — при очистке БД и повторном запуске
    генерируются те же самые коды.
    """
    count_res = await db.execute(select(func.count()).select_from(QRCode))
    existing = count_res.scalar()
    if existing >= 100:
        return {"message": f"QR коды уже созданы ({existing} шт.)", "created": 0}
 
    # Берём только те коды которых ещё нет в БД
    existing_codes_res = await db.execute(select(QRCode.code))
    existing_codes = {row[0] for row in existing_codes_res.all()}
 
    to_add = [
        QRCode(code=code)
        for code in FIXED_QR_CODES
        if code not in existing_codes
    ]
 
    db.add_all(to_add)
    await db.commit()
 
    result = await db.execute(select(QRCode).order_by(QRCode.id))
    all_codes = result.scalars().all()
    return {
        "message": f"Создано {len(to_add)} QR кодов",
        "created": len(to_add),
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
        {"id": t.id, "first_name": t.first_name, "last_name": t.last_name,
         "full_name": t.name, "variant": t.variant,
         "qr_code_id": t.qr_code_id, "created_at": t.created_at}
        for t in result.scalars().all()
    ]


# ─── Uploads ─────────────────────────────────────────────────────────────────

@router.get("/uploads", summary="Список всех загрузок")
async def list_uploads(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Upload, Team).join(Team, Upload.team_id == Team.id)
        .order_by(Upload.uploaded_at.desc())
    )
    return [
        {"id": u.id, "first_name": t.first_name, "last_name": t.last_name,
         "original_name": u.original_name, "filename": u.filename,
         "uploaded_at": u.uploaded_at, "is_checked": u.is_checked, "is_correct": u.is_correct}
        for u, t in result.all()
    ]


# ─── Upload — проверка работ ──────────────────────────────────────────────────

@router.patch(
    "/uploads/{upload_id}/check",
    response_model=UploadResponse,
    summary="Отметить файл как проверенный / не проверенный",
)
async def check_upload(
    upload_id: int,
    body: UploadCheckUpdate,
    db: AsyncSession = Depends(get_db),
):
    """
    Устанавливает флаг проверки для загруженного файла.

    -   — работа проверена
    -  — снять отметку
    """
    result = await db.execute(
        select(Upload, Team).join(Team, Upload.team_id == Team.id)
        .where(Upload.id == upload_id)
    )
    row = result.one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Файл не найден")

    upload, team = row
    upload.is_checked = body.is_checked
    upload.checked_at = datetime.utcnow() if body.is_checked else None
    upload.is_correct = body.is_correct if body.is_checked else None
    await db.commit()
    await db.refresh(upload)

    return UploadResponse(
        id=upload.id,
        first_name=team.first_name,
        last_name=team.last_name,
        filename=upload.filename,
        original_name=upload.original_name,
        uploaded_at=upload.uploaded_at,
        is_checked=upload.is_checked,
        checked_at=upload.checked_at,
        is_correct=upload.is_correct,
    )


@router.get(
    "/uploads/unchecked",
    summary="Список непроверенных файлов",
)
async def unchecked_uploads(db: AsyncSession = Depends(get_db)):
    """Только файлы которые ещё не проверены (is_checked=False)."""
    result = await db.execute(
        select(Upload, Team)
        .join(Team, Upload.team_id == Team.id)
        .where(Upload.is_checked == False)
        .order_by(Upload.uploaded_at.asc())
    )
    return [
        {
            "id": u.id, "first_name": t.first_name, "last_name": t.last_name,
            "original_name": u.original_name,
            "filename": u.filename,
            "uploaded_at": u.uploaded_at,
            "is_checked": u.is_checked,
            "is_correct": u.is_correct,
        }
        for u, t in result.all()
    ]


@router.get(
    "/uploads/checked",
    summary="Список проверенных файлов (с результатом)",
)
async def checked_uploads(db: AsyncSession = Depends(get_db)):
    """Все проверенные файлы с флагом is_correct."""
    result = await db.execute(
        select(Upload, Team)
        .join(Team, Upload.team_id == Team.id)
        .where(Upload.is_checked == True)
        .order_by(Upload.checked_at.desc())
    )
    return [
        {
            "id": u.id, "first_name": t.first_name, "last_name": t.last_name,
            "original_name": u.original_name,
            "filename": u.filename,
            "uploaded_at": u.uploaded_at,
            "checked_at": u.checked_at,
            "is_checked": u.is_checked,
            "is_correct": u.is_correct,
        }
        for u, t in result.all()
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
        text_kz=body.text_kz,
        text_ru=body.text_ru,
        options_kz=body.options_kz,
        options_ru=body.options_ru,
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


# @router.get(
#     "/quiz/questions/stats",
#     summary="Статистика вопросов по категориям",
# )
# async def questions_stats(db: AsyncSession = Depends(get_db)):
#     net_res = await db.execute(
#         select(func.count()).select_from(QuizQuestion).where(QuizQuestion.category == "network")
#     )
#     db_res = await db.execute(
#         select(func.count()).select_from(QuizQuestion).where(QuizQuestion.category == "database")
#     )
#     return {
#         "network":  {"count": net_res.scalar(),  "max": MAX_PER_CATEGORY},
#         "database": {"count": db_res.scalar(), "max": MAX_PER_CATEGORY},
#         "total":    net_res.scalar() + db_res.scalar(),
#     }


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
    q.text_kz = body.text_kz
    q.text_ru = body.text_ru
    q.options_kz = body.options_kz
    q.options_ru = body.options_ru
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
        r = await _build_team_result(team.id, team.first_name, team.last_name, team.variant, db)
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
    return [await _build_team_result(t.id, t.first_name, t.last_name, t.variant, db) for t in teams]


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
    return await _build_team_result(team.id, team.first_name, team.last_name, team.variant, db)

@router.get(
    "/quiz/results/{team_id}/detailed",
    summary="Детальные результаты команды с текстами вопросов и вариантами ответов",
)
async def team_quiz_result_detailed(
    team_id: int,
    db: AsyncSession = Depends(get_db),
):
    """
    Полная информация по каждому ответу команды:
    - текст вопроса (kz + ru)
    - все варианты ответов (kz + ru)
    - правильный индекс и текст правильного ответа
    - выбранный индекс и текст выбранного ответа
    - верно/неверно
    - категория (network / database)
    - время ответа
    """
    result = await db.execute(select(Team).where(Team.id == team_id))
    team = result.scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=404, detail="Команда не найдена")

    sess_res = await db.execute(
        select(TeamQuizSession).where(TeamQuizSession.team_id == team_id)
    )
    session = sess_res.scalar_one_or_none()

    if not session:
        return {
            "team_id": team_id,
            "first_name": team.first_name,
            "last_name": team.last_name,
            "variant": team.variant,
            "is_completed": False,
            "total_questions": 50,
            "answered_count": 0,
            "correct_count": 0,
            "network_correct": 0,
            "database_correct": 0,
            "score_percent": 0.0,
            "answers": [],
        }

    # Загружаем все ответы
    ans_res = await db.execute(
        select(TeamAnswer).where(TeamAnswer.session_id == session.id)
        .order_by(TeamAnswer.answered_at)
    )
    answers = ans_res.scalars().all()

    # Загружаем все вопросы сессии (не только отвеченные — чтобы показать пропущенные)
    all_q_res = await db.execute(
        select(QuizQuestion).where(QuizQuestion.id.in_(session.question_ids))
    )
    q_map = {q.id: q for q in all_q_res.scalars().all()}

    # Индекс ответов по question_id
    ans_map = {a.question_id: a for a in answers}

    correct_total = 0
    network_correct = 0
    database_correct = 0

    detailed_answers = []
    for qid in session.question_ids:
        q = q_map.get(qid)
        if not q:
            continue
        ans = ans_map.get(qid)

        if ans:
            chosen_index = ans.chosen_index
            is_correct = ans.is_correct
            answered_at = ans.answered_at
            chosen_text_kz = q.options_kz[chosen_index] if 0 <= chosen_index < len(q.options_kz) else "—"
            chosen_text_ru = q.options_ru[chosen_index] if 0 <= chosen_index < len(q.options_ru) else "—"
            status_label = "✓ Верно" if is_correct else "✗ Неверно"
            if is_correct:
                correct_total += 1
                if q.category == "network":
                    network_correct += 1
                else:
                    database_correct += 1
        else:
            chosen_index = None
            is_correct = None
            answered_at = None
            chosen_text_kz = None
            chosen_text_ru = None
            status_label = "— Не отвечено"

        detailed_answers.append({
            "question_id": qid,
            "category": q.category,

            # Вопрос
            "question_text_kz": q.text_kz,
            "question_text_ru": q.text_ru,

            # Все варианты
            "options_kz": q.options_kz,
            "options_ru": q.options_ru,

            # Правильный ответ
            "correct_index": q.correct_index,
            "correct_text_kz": q.options_kz[q.correct_index] if 0 <= q.correct_index < len(q.options_kz) else "—",
            "correct_text_ru": q.options_ru[q.correct_index] if 0 <= q.correct_index < len(q.options_ru) else "—",

            # Ответ команды
            "chosen_index": chosen_index,
            "chosen_text_kz": chosen_text_kz,
            "chosen_text_ru": chosen_text_ru,

            "is_correct": is_correct,
            "status": status_label,
            "answered_at": answered_at,
        })

    score = round(correct_total / 50 * 100, 1) if answers else 0.0

    return {
        "team_id": team_id,
        "first_name": team.first_name,
        "last_name": team.last_name,
        "variant": team.variant,
        "is_completed": session.is_completed,
        "started_at": session.started_at,
        "completed_at": session.completed_at,
        "total_questions": len(session.question_ids),
        "answered_count": len(answers),
        "correct_count": correct_total,
        "network_correct": network_correct,
        "database_correct": database_correct,
        "score_percent": score,
        "answers": detailed_answers,
    }