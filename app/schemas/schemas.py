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

    class Config:
        from_attributes = True


# ---------- QUIZ — Admin ----------
class QuizQuestionCreate(BaseModel):
    text: str
    options: list[str]
    correct_index: int
    category: Literal["network", "database"] = "network"

    @field_validator("options")
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
        options = info.data.get("options", [])
        if options and v >= len(options):
            raise ValueError("correct_index выходит за пределы списка options")
        if v < 0:
            raise ValueError("correct_index не может быть отрицательным")
        return v

class QuizQuestionResponse(BaseModel):
    id: int
    text: str
    options: list[str]
    correct_index: int
    category: str
    created_at: datetime

    class Config:
        from_attributes = True


# ---------- QUIZ — Team ----------
class QuizQuestionPublic(BaseModel):
    id: int
    text: str
    options: list[str]
    category: str  # команда видит категорию, но не правильный ответ

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
    question_text: str
    category: str
    options: list[str]
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
