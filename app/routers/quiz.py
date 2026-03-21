"""
Quiz роутер.
Каждая команда получает 10 вопросов: 5 по сетям (network) + 5 по БД (database).
Вопросы выбираются рандомно из каждой категории независимо.
"""
import random
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.auth import get_current_team
from app.models.models import Team, QuizQuestion, TeamQuizSession, TeamAnswer
from app.schemas.schemas import (
    BulkAnswerSubmit, BulkAnswerResult,
    QuizSessionResponse, QuizQuestionPublic,
    AnswerSubmit, AnswerResult, TeamQuizResult, TeamAnswerDetail,
)

router = APIRouter(prefix="/quiz", tags=["Quiz"])

PER_CATEGORY = 5                          # 5 вопросов из каждой категории
QUESTIONS_PER_SESSION = PER_CATEGORY * 2  # итого 10


# ── helpers ──────────────────────────────────────────────────────────────────

def _split_by_category(questions: list[QuizQuestion]):
    network = [q for q in questions if q.category == "network"]
    database = [q for q in questions if q.category == "database"]
    return network, database


async def _load_questions_by_ids(ids: list[int], db: AsyncSession) -> list[QuizQuestion]:
    result = await db.execute(select(QuizQuestion).where(QuizQuestion.id.in_(ids)))
    q_map = {q.id: q for q in result.scalars().all()}
    return [q_map[i] for i in ids if i in q_map]


# ── GET /quiz/my ──────────────────────────────────────────────────────────────

@router.get("/my", response_model=QuizSessionResponse)
async def get_my_quiz(
    current_team: Team = Depends(get_current_team),
    db: AsyncSession = Depends(get_db),
):
    """
    Возвращает 10 вопросов команды: 5 по сетям + 5 по БД.
    При первом вызове создаёт сессию (рандомная выборка из каждой категории).
    При повторных вызовах возвращает те же вопросы.
    """
    # Ищем существующую сессию
    sess_res = await db.execute(
        select(TeamQuizSession).where(TeamQuizSession.team_id == current_team.id)
    )
    session = sess_res.scalar_one_or_none()

    if not session:
        # Загружаем все вопросы по категориям
        net_res = await db.execute(
            select(QuizQuestion).where(QuizQuestion.category == "network")
        )
        db_res = await db.execute(
            select(QuizQuestion).where(QuizQuestion.category == "database")
        )
        network_qs = net_res.scalars().all()
        database_qs = db_res.scalars().all()

        # Проверяем достаточность вопросов
        if len(network_qs) < PER_CATEGORY:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Недостаточно вопросов по сетям: {len(network_qs)} из {PER_CATEGORY} нужных",
            )
        if len(database_qs) < PER_CATEGORY:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Недостаточно вопросов по БД: {len(database_qs)} из {PER_CATEGORY} нужных",
            )

        # Рандомная выборка: 5 из каждой категории
        chosen_net = random.sample(network_qs, PER_CATEGORY)
        chosen_db  = random.sample(database_qs, PER_CATEGORY)

        # Перемешиваем вместе чтобы вопросы шли вперемешку
        all_chosen = chosen_net + chosen_db
        random.shuffle(all_chosen)
        chosen_ids = [q.id for q in all_chosen]

        session = TeamQuizSession(
            team_id=current_team.id,
            question_ids=chosen_ids,
        )
        db.add(session)
        await db.commit()
        await db.refresh(session)

        questions_data = all_chosen
    else:
        questions_data = await _load_questions_by_ids(session.question_ids, db)

    # Считаем ответы
    ans_res = await db.execute(
        select(TeamAnswer).where(TeamAnswer.session_id == session.id)
    )
    answered_ids = {a.question_id for a in ans_res.scalars().all()}

    # Разбиваем на категории для ответа
    net_qs = [q for q in questions_data if q.category == "network"]
    db_qs  = [q for q in questions_data if q.category == "database"]

    def to_public(q: QuizQuestion) -> QuizQuestionPublic:
        return QuizQuestionPublic(id=q.id, text=q.text, options=q.options, category=q.category)

    answered_count = len(answered_ids)
    remaining = QUESTIONS_PER_SESSION - answered_count

    if session.is_completed:
        msg = "Тест завершён! Все вопросы отвечены."
    else:
        msg = f"Осталось ответить: {remaining} вопросов (из {PER_CATEGORY} по сетям и {PER_CATEGORY} по БД)"

    return QuizSessionResponse(
        session_id=session.id,
        is_completed=session.is_completed,
        total_questions=QUESTIONS_PER_SESSION,
        answered_count=answered_count,
        network_questions=[to_public(q) for q in net_qs],
        database_questions=[to_public(q) for q in db_qs],
        message=msg,
    )


# ── POST /quiz/answer ─────────────────────────────────────────────────────────

@router.post("/answer", response_model=AnswerResult)
async def submit_answer(
    body: AnswerSubmit,
    current_team: Team = Depends(get_current_team),
    db: AsyncSession = Depends(get_db),
):
    """Отправить ответ на один вопрос. Нельзя ответить дважды на один вопрос."""
    sess_res = await db.execute(
        select(TeamQuizSession).where(TeamQuizSession.team_id == current_team.id)
    )
    session = sess_res.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="Сначала получите вопросы: GET /quiz/my")

    if session.is_completed:
        raise HTTPException(status_code=400, detail="Тест уже завершён")

    if body.question_id not in session.question_ids:
        raise HTTPException(status_code=400, detail="Этот вопрос не входит в вашу сессию")

    # Проверка дубля
    dup = await db.execute(
        select(TeamAnswer).where(
            TeamAnswer.session_id == session.id,
            TeamAnswer.question_id == body.question_id,
        )
    )
    if dup.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Вы уже ответили на этот вопрос")

    # Загружаем вопрос
    q_res = await db.execute(select(QuizQuestion).where(QuizQuestion.id == body.question_id))
    question = q_res.scalar_one_or_none()
    if not question:
        raise HTTPException(status_code=404, detail="Вопрос не найден")

    if body.chosen_index < 0 or body.chosen_index >= len(question.options):
        raise HTTPException(
            status_code=400,
            detail=f"chosen_index должен быть от 0 до {len(question.options) - 1}",
        )

    is_correct = body.chosen_index == question.correct_index

    db.add(TeamAnswer(
        session_id=session.id,
        question_id=body.question_id,
        chosen_index=body.chosen_index,
        is_correct=is_correct,
    ))

    # Проверяем завершение
    ans_count_res = await db.execute(
        select(TeamAnswer).where(TeamAnswer.session_id == session.id)
    )
    answered_so_far = len(ans_count_res.scalars().all()) + 1  # +1 текущий

    if answered_so_far >= QUESTIONS_PER_SESSION:
        session.is_completed = True
        session.completed_at = datetime.utcnow()

    await db.commit()

    return AnswerResult(
        question_id=body.question_id,
        chosen_index=body.chosen_index,
        is_correct=is_correct,
        message="Дұрыс! ✓" if is_correct else "Қате ✗",
    )


# ── GET /quiz/results/my ──────────────────────────────────────────────────────

@router.get("/results/my", response_model=TeamQuizResult)
async def get_my_results(
    current_team: Team = Depends(get_current_team),
    db: AsyncSession = Depends(get_db),
):
    """Результаты текущей команды."""
    return await _build_team_result(current_team.id, current_team.name, current_team.variant, db)


# ── внутренняя функция для построения результата ─────────────────────────────

async def _build_team_result(
    team_id: int, team_name: str, variant: int, db: AsyncSession
) -> TeamQuizResult:
    sess_res = await db.execute(
        select(TeamQuizSession).where(TeamQuizSession.team_id == team_id)
    )
    session = sess_res.scalar_one_or_none()

    empty = TeamQuizResult(
        team_id=team_id, team_name=team_name, variant=variant,
        is_completed=False, total_questions=QUESTIONS_PER_SESSION,
        answered_count=0, correct_count=0,
        network_correct=0, database_correct=0,
        score_percent=0.0, answers=[],
    )
    if not session:
        return empty

    ans_res = await db.execute(
        select(TeamAnswer).where(TeamAnswer.session_id == session.id)
    )
    answers = ans_res.scalars().all()

    q_ids = [a.question_id for a in answers]
    q_map: dict[int, QuizQuestion] = {}
    if q_ids:
        q_res = await db.execute(select(QuizQuestion).where(QuizQuestion.id.in_(q_ids)))
        q_map = {q.id: q for q in q_res.scalars().all()}

    correct_total   = sum(1 for a in answers if a.is_correct)
    network_correct = sum(
        1 for a in answers
        if a.is_correct and q_map.get(a.question_id) and q_map[a.question_id].category == "network"
    )
    database_correct = sum(
        1 for a in answers
        if a.is_correct and q_map.get(a.question_id) and q_map[a.question_id].category == "database"
    )
    score = round(correct_total / QUESTIONS_PER_SESSION * 100, 1) if answers else 0.0

    details = [
        TeamAnswerDetail(
            question_id=a.question_id,
            question_text=q_map[a.question_id].text if a.question_id in q_map else "—",
            category=q_map[a.question_id].category if a.question_id in q_map else "—",
            options=q_map[a.question_id].options if a.question_id in q_map else [],
            correct_index=q_map[a.question_id].correct_index if a.question_id in q_map else -1,
            chosen_index=a.chosen_index,
            is_correct=a.is_correct,
            answered_at=a.answered_at,
        )
        for a in answers
    ]

    return TeamQuizResult(
        team_id=team_id, team_name=team_name, variant=variant,
        is_completed=session.is_completed,
        total_questions=QUESTIONS_PER_SESSION,
        answered_count=len(answers),
        correct_count=correct_total,
        network_correct=network_correct,
        database_correct=database_correct,
        score_percent=score,
        answers=details,
    )


# ── POST /quiz/answer/bulk ────────────────────────────────────────────────────

@router.post("/answer/bulk", response_model=BulkAnswerResult)
async def submit_answers_bulk(
    body: BulkAnswerSubmit,
    current_team: Team = Depends(get_current_team),
    db: AsyncSession = Depends(get_db),
):
    """
    Отправить все ответы за один запрос.

    Пример:
    ```json
    {
      "answers": [
        {"question_id": 11, "chosen_index": 0},
        {"question_id": 20, "chosen_index": 1},
        {"question_id": 9,  "chosen_index": 1},
        {"question_id": 25, "chosen_index": 4},
        {"question_id": 3,  "chosen_index": 0},
        {"question_id": 28, "chosen_index": 3},
        {"question_id": 29, "chosen_index": 1},
        {"question_id": 40, "chosen_index": 1},
        {"question_id": 45, "chosen_index": 1},
        {"question_id": 31, "chosen_index": 1}
      ]
    }
    ```
    """
    # Получаем сессию
    sess_res = await db.execute(
        select(TeamQuizSession).where(TeamQuizSession.team_id == current_team.id)
    )
    session = sess_res.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="Сначала получите вопросы: GET /quiz/my")

    if session.is_completed:
        raise HTTPException(status_code=400, detail="Тест уже завершён")

    # Загружаем уже данные ответы
    existing_res = await db.execute(
        select(TeamAnswer).where(TeamAnswer.session_id == session.id)
    )
    already_answered = {a.question_id for a in existing_res.scalars().all()}

    # Загружаем все вопросы сессии одним запросом
    q_res = await db.execute(
        select(QuizQuestion).where(QuizQuestion.id.in_(session.question_ids))
    )
    q_map = {q.id: q for q in q_res.scalars().all()}

    results = []
    skipped = 0

    for item in body.answers:
        # Вопрос не из сессии
        if item.question_id not in session.question_ids:
            skipped += 1
            continue

        # Уже отвечен
        if item.question_id in already_answered:
            skipped += 1
            continue

        question = q_map.get(item.question_id)
        if not question:
            skipped += 1
            continue

        # Невалидный индекс
        if item.chosen_index < 0 or item.chosen_index >= len(question.options):
            skipped += 1
            continue

        is_correct = item.chosen_index == question.correct_index
        already_answered.add(item.question_id)  # защита от дублей внутри одного bulk

        db.add(TeamAnswer(
            session_id=session.id,
            question_id=item.question_id,
            chosen_index=item.chosen_index,
            is_correct=is_correct,
        ))

        results.append(AnswerResult(
            question_id=item.question_id,
            chosen_index=item.chosen_index,
            is_correct=is_correct,
            message="Дұрыс! ✓" if is_correct else "Қате ✗",
        ))

    # Проверяем завершение
    if len(already_answered) >= QUESTIONS_PER_SESSION:
        session.is_completed = True
        session.completed_at = datetime.utcnow()

    await db.commit()

    correct = sum(1 for r in results if r.is_correct)
    wrong = len(results) - correct
    total_answered = len(already_answered)
    score = round(total_answered and correct / QUESTIONS_PER_SESSION * 100, 1)

    return BulkAnswerResult(
        total=len(results),
        correct=correct,
        wrong=wrong,
        skipped=skipped,
        is_completed=session.is_completed,
        score_percent=score,
        results=results,
    )