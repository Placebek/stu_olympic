"""
Quiz роутер.
Каждая команда получает 10 вопросов: 5 по сетям (network) + 5 по БД (database).
Поддерживает два языка: kz (казахский) и ru (русский).
"""
import random
from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status, Query
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

PER_CATEGORY = 25
QUESTIONS_PER_SESSION = PER_CATEGORY * 2  # 50


# ── helpers ───────────────────────────────────────────────────────────────────

async def _load_questions_by_ids(ids: list[int], db: AsyncSession) -> list[QuizQuestion]:
    result = await db.execute(select(QuizQuestion).where(QuizQuestion.id.in_(ids)))
    q_map = {q.id: q for q in result.scalars().all()}
    return [q_map[i] for i in ids if i in q_map]


def _to_public(q: QuizQuestion) -> QuizQuestionPublic:
    return QuizQuestionPublic(
        id=q.id,
        text_kz=q.text_kz,
        text_ru=q.text_ru,
        options_kz=q.options_kz,
        options_ru=q.options_ru,
        category=q.category,
    )


# ── GET /quiz/my ──────────────────────────────────────────────────────────────

@router.get("/my", response_model=QuizSessionResponse)
async def get_my_quiz(
    current_team: Team = Depends(get_current_team),
    db: AsyncSession = Depends(get_db),
):
    """
    Возвращает 10 вопросов: 5 по сетям + 5 по БД.
    Оба языка (kz и ru) возвращаются сразу — фронтенд показывает нужный.
    """
    sess_res = await db.execute(
        select(TeamQuizSession).where(TeamQuizSession.team_id == current_team.id)
    )
    session = sess_res.scalar_one_or_none()

    if not session:
        net_res = await db.execute(
            select(QuizQuestion).where(QuizQuestion.category == "network")
        )
        db_res = await db.execute(
            select(QuizQuestion).where(QuizQuestion.category == "database")
        )
        network_qs = net_res.scalars().all()
        database_qs = db_res.scalars().all()

        if len(network_qs) < PER_CATEGORY:
            raise HTTPException(
                status_code=503,
                detail=f"Недостаточно вопросов по сетям: {len(network_qs)}/{PER_CATEGORY}",
            )
        if len(database_qs) < PER_CATEGORY:
            raise HTTPException(
                status_code=503,
                detail=f"Недостаточно вопросов по БД: {len(database_qs)}/{PER_CATEGORY}",
            )

        chosen = random.sample(network_qs, PER_CATEGORY) + random.sample(database_qs, PER_CATEGORY)
        random.shuffle(chosen)

        session = TeamQuizSession(
            team_id=current_team.id,
            question_ids=[q.id for q in chosen],
        )
        db.add(session)
        await db.commit()
        await db.refresh(session)
        questions_data = chosen
    else:
        questions_data = await _load_questions_by_ids(session.question_ids, db)

    ans_res = await db.execute(
        select(TeamAnswer).where(TeamAnswer.session_id == session.id)
    )
    answered_ids = {a.question_id for a in ans_res.scalars().all()}
    answered_count = len(answered_ids)

    net_qs = [q for q in questions_data if q.category == "network"]
    db_qs  = [q for q in questions_data if q.category == "database"]

    if session.is_completed:
        msg = "Тест завершён!"
    else:
        msg = f"Осталось: {QUESTIONS_PER_SESSION - answered_count} вопросов"

    return QuizSessionResponse(
        session_id=session.id,
        is_completed=session.is_completed,
        total_questions=QUESTIONS_PER_SESSION,
        answered_count=answered_count,
        network_questions=[_to_public(q) for q in net_qs],
        database_questions=[_to_public(q) for q in db_qs],
        message=msg,
    )


# ── POST /quiz/answer ─────────────────────────────────────────────────────────

@router.post("/answer", response_model=AnswerResult)
async def submit_answer(
    body: AnswerSubmit,
    current_team: Team = Depends(get_current_team),
    db: AsyncSession = Depends(get_db),
):
    """Отправить ответ на один вопрос."""
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

    dup = await db.execute(
        select(TeamAnswer).where(
            TeamAnswer.session_id == session.id,
            TeamAnswer.question_id == body.question_id,
        )
    )
    if dup.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Вы уже ответили на этот вопрос")

    q_res = await db.execute(select(QuizQuestion).where(QuizQuestion.id == body.question_id))
    question = q_res.scalar_one_or_none()
    if not question:
        raise HTTPException(status_code=404, detail="Вопрос не найден")

    if body.chosen_index < 0 or body.chosen_index >= len(question.options_kz):
        raise HTTPException(
            status_code=400,
            detail=f"chosen_index должен быть от 0 до {len(question.options_kz) - 1}",
        )

    is_correct = body.chosen_index == question.correct_index
    db.add(TeamAnswer(
        session_id=session.id,
        question_id=body.question_id,
        chosen_index=body.chosen_index,
        is_correct=is_correct,
    ))

    ans_count_res = await db.execute(
        select(TeamAnswer).where(TeamAnswer.session_id == session.id)
    )
    if len(ans_count_res.scalars().all()) + 1 >= QUESTIONS_PER_SESSION:
        session.is_completed = True
        session.completed_at = datetime.utcnow()

    await db.commit()

    return AnswerResult(
        question_id=body.question_id,
        chosen_index=body.chosen_index,
        is_correct=is_correct,
        message="Дұрыс! ✓" if is_correct else "Қате ✗",
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

    ```json
    {
      "answers": [
        {"question_id": 11, "chosen_index": 0},
        {"question_id": 20, "chosen_index": 1}
      ]
    }
    ```
    """
    sess_res = await db.execute(
        select(TeamQuizSession).where(TeamQuizSession.team_id == current_team.id)
    )
    session = sess_res.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="Сначала получите вопросы: GET /quiz/my")
    if session.is_completed:
        raise HTTPException(status_code=400, detail="Тест уже завершён")

    existing_res = await db.execute(
        select(TeamAnswer).where(TeamAnswer.session_id == session.id)
    )
    already_answered = {a.question_id for a in existing_res.scalars().all()}

    q_res = await db.execute(
        select(QuizQuestion).where(QuizQuestion.id.in_(session.question_ids))
    )
    q_map = {q.id: q for q in q_res.scalars().all()}

    results = []
    skipped = 0

    for item in body.answers:
        if item.question_id not in session.question_ids:
            skipped += 1
            continue
        if item.question_id in already_answered:
            skipped += 1
            continue
        question = q_map.get(item.question_id)
        if not question:
            skipped += 1
            continue
        if item.chosen_index < 0 or item.chosen_index >= len(question.options_kz):
            skipped += 1
            continue

        is_correct = item.chosen_index == question.correct_index
        already_answered.add(item.question_id)

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

    if len(already_answered) >= QUESTIONS_PER_SESSION:
        session.is_completed = True
        session.completed_at = datetime.utcnow()

    await db.commit()

    correct = sum(1 for r in results if r.is_correct)
    score = round(correct / QUESTIONS_PER_SESSION * 100, 1)

    return BulkAnswerResult(
        total=len(results),
        correct=correct,
        wrong=len(results) - correct,
        skipped=skipped,
        is_completed=session.is_completed,
        score_percent=score,
        results=results,
    )


# ── GET /quiz/results/my ──────────────────────────────────────────────────────

@router.get("/results/my", response_model=TeamQuizResult)
async def get_my_results(
    current_team: Team = Depends(get_current_team),
    db: AsyncSession = Depends(get_db),
):
    return await _build_team_result(current_team.id, current_team.first_name, current_team.last_name, current_team.variant, db)


# ── внутренняя функция ────────────────────────────────────────────────────────

async def _build_team_result(
    team_id: int, first_name: str, last_name: str, variant: int, db: AsyncSession
) -> TeamQuizResult:
    sess_res = await db.execute(
        select(TeamQuizSession).where(TeamQuizSession.team_id == team_id)
    )
    session = sess_res.scalar_one_or_none()

    empty = TeamQuizResult(
        team_id=team_id, first_name=first_name, last_name=last_name, variant=variant,
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

    correct_total    = sum(1 for a in answers if a.is_correct)
    network_correct  = sum(1 for a in answers if a.is_correct and q_map.get(a.question_id) and q_map[a.question_id].category == "network")
    database_correct = sum(1 for a in answers if a.is_correct and q_map.get(a.question_id) and q_map[a.question_id].category == "database")
    score = round(correct_total / QUESTIONS_PER_SESSION * 100, 1) if answers else 0.0

    details = [
        TeamAnswerDetail(
            question_id=a.question_id,
            question_text_kz=q_map[a.question_id].text_kz if a.question_id in q_map else "—",
            question_text_ru=q_map[a.question_id].text_ru if a.question_id in q_map else "—",
            category=q_map[a.question_id].category if a.question_id in q_map else "—",
            options_kz=q_map[a.question_id].options_kz if a.question_id in q_map else [],
            options_ru=q_map[a.question_id].options_ru if a.question_id in q_map else [],
            correct_index=q_map[a.question_id].correct_index if a.question_id in q_map else -1,
            chosen_index=a.chosen_index,
            is_correct=a.is_correct,
            answered_at=a.answered_at,
        )
        for a in answers
    ]

    return TeamQuizResult(
        team_id=team_id, first_name=first_name, last_name=last_name, variant=variant,
        is_completed=session.is_completed,
        total_questions=QUESTIONS_PER_SESSION,
        answered_count=len(answers),
        correct_count=correct_total,
        network_correct=network_correct,
        database_correct=database_correct,
        score_percent=score,
        answers=details,
    )