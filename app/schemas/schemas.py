from datetime import datetime
from typing import Literal
from pydantic import BaseModel, field_validator


# ---------- QR ----------
class QRVerifyRequest(BaseModel):
    code: str

class QRVerifyResponse(BaseModel):
    valid: bool
    team_exists: bool
    team_name: str | None = None
    message: str


# ---------- TEAM ----------
class TeamCreateRequest(BaseModel):
    code: str
    team_name: str

    @field_validator("team_name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Название команды не может быть пустым")
        return v

class TeamJoinRequest(BaseModel):
    code: str
    team_name: str

class TeamResponse(BaseModel):
    team_name: str
    variant: int
    token: str
    message: str


# ---------- UPLOAD ----------
class UploadResponse(BaseModel):
    id: int
    team_name: str
    filename: str
    original_name: str
    uploaded_at: datetime
    is_checked: bool
    checked_at: datetime | None = None
    is_correct: bool | None = None   # None = не проверено, True = верно, False = неверно

    class Config:
        from_attributes = True


class UploadCheckUpdate(BaseModel):
    is_checked: bool
    is_correct: bool | None = None   # обязательно указать при is_checked=True


# ---------- QUIZ — Admin ----------
class QuizQuestionCreate(BaseModel):
    text_kz: str
    text_ru: str
    options_kz: list[str]
    options_ru: list[str]
    correct_index: int
    category: Literal["network", "database"] = "network"

    @field_validator("options_kz", "options_ru")
    @classmethod
    def validate_options(cls, v: list[str]) -> list[str]:
        if len(v) < 2:
            raise ValueError("Минимум 2 варианта ответа")
        if len(v) > 6:
            raise ValueError("Максимум 6 вариантов ответа")
        return v

    @field_validator("correct_index")
    @classmethod
    def validate_correct_index(cls, v: int, info) -> int:
        options = info.data.get("options_kz", [])
        if options and v >= len(options):
            raise ValueError("correct_index выходит за пределы списка options")
        if v < 0:
            raise ValueError("correct_index не может быть отрицательным")
        return v

class QuizQuestionResponse(BaseModel):
    id: int
    text_kz: str
    text_ru: str
    options_kz: list[str]
    options_ru: list[str]
    correct_index: int
    category: str
    created_at: datetime

    class Config:
        from_attributes = True


# ---------- QUIZ — Team ----------
class QuizQuestionPublic(BaseModel):
    id: int
    text_kz: str
    text_ru: str
    options_kz: list[str]
    options_ru: list[str]
    category: str

class QuizSessionResponse(BaseModel):
    session_id: int
    is_completed: bool
    total_questions: int
    answered_count: int
    network_questions: list[QuizQuestionPublic]   # 5 по сетям
    database_questions: list[QuizQuestionPublic]  # 5 по БД
    message: str


# ---------- QUIZ — Submit ----------
class AnswerSubmit(BaseModel):
    question_id: int
    chosen_index: int

class AnswerResult(BaseModel):
    question_id: int
    chosen_index: int
    is_correct: bool
    message: str


# ---------- QUIZ — Results ----------
class TeamAnswerDetail(BaseModel):
    question_id: int
    question_text_kz: str
    question_text_ru: str
    category: str
    options_kz: list[str]
    options_ru: list[str]
    correct_index: int
    chosen_index: int
    is_correct: bool
    answered_at: datetime

class TeamQuizResult(BaseModel):
    team_id: int
    team_name: str
    variant: int
    is_completed: bool
    total_questions: int
    answered_count: int
    correct_count: int
    network_correct: int
    database_correct: int
    score_percent: float
    answers: list[TeamAnswerDetail]


# ---------- QUIZ — Bulk Submit ----------
class BulkAnswerSubmit(BaseModel):
    answers: list[AnswerSubmit]   # список {question_id, chosen_index}

class BulkAnswerResult(BaseModel):
    total: int
    correct: int
    wrong: int
    skipped: int                  # уже отвеченные или не из сессии
    is_completed: bool
    score_percent: float
    results: list[AnswerResult]


# ---------- РЕЙТИНГ ----------
class TeamRatingEntry(BaseModel):
    rank: int
    team_id: int
    team_name: str
    variant: int
    # Тест
    quiz_score: float         # % правильных ответов в тесте
    quiz_correct: int         # кол-во правильных ответов
    quiz_total: int           # всего вопросов
    quiz_completed: bool
    # Задачи (загруженные файлы)
    tasks_submitted: int      # сколько файлов сдано
    tasks_correct: int        # сколько задач зачтено (is_correct=True)
    tasks_checked: int        # сколько проверено
    # Итог
    total_score: float        # итоговый балл (можно настроить формулу)