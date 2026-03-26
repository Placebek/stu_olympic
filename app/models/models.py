from datetime import datetime
from sqlalchemy import String, Integer, DateTime, Boolean, ForeignKey, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class QRCode(Base):
    __tablename__ = "qr_codes"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    is_used: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    team: Mapped["Team"] = relationship("Team", back_populates="qr_code", uselist=False)


class Team(Base):
    __tablename__ = "teams"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(128), unique=True, nullable=False, index=True)
    qr_code_id: Mapped[int] = mapped_column(Integer, ForeignKey("qr_codes.id"), unique=True)
    variant: Mapped[int] = mapped_column(Integer, nullable=False)
    token: Mapped[str] = mapped_column(String(512), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    qr_code: Mapped["QRCode"] = relationship("QRCode", back_populates="team")
    uploads: Mapped[list["Upload"]] = relationship("Upload", back_populates="team")
    quiz_session: Mapped["TeamQuizSession"] = relationship(
        "TeamQuizSession", back_populates="team", uselist=False
    )


class Upload(Base):
    __tablename__ = "uploads"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    team_id: Mapped[int] = mapped_column(Integer, ForeignKey("teams.id"))
    filename: Mapped[str] = mapped_column(String(256), nullable=False)
    original_name: Mapped[str] = mapped_column(String(256), nullable=False)
    file_path: Mapped[str] = mapped_column(Text, nullable=False)
    is_checked: Mapped[bool] = mapped_column(Boolean, default=False)
    checked_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    is_correct: Mapped[bool | None] = mapped_column(Boolean, nullable=True)  # None = ещё не проверено
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    team: Mapped["Team"] = relationship("Team", back_populates="uploads")


# ─────────────────────────── QUIZ ───────────────────────────

class QuizQuestion(Base):
    """
    category: 'network' | 'database'
    Сетевые вопросы (1-25) → category='network'
    Вопросы по БД (26-50)  → category='database'
    """
    __tablename__ = "quiz_questions"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    text_kz: Mapped[str] = mapped_column(Text, nullable=False)           # казахский
    text_ru: Mapped[str] = mapped_column(Text, nullable=False)           # русский
    options_kz: Mapped[list] = mapped_column(JSON, nullable=False)       # варианты на казахском
    options_ru: Mapped[list] = mapped_column(JSON, nullable=False)       # варианты на русском
    correct_index: Mapped[int] = mapped_column(Integer, nullable=False)  # одинаковый для обоих языков
    category: Mapped[str] = mapped_column(String(32), nullable=False, default="network", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    answers: Mapped[list["TeamAnswer"]] = relationship("TeamAnswer", back_populates="question")


class TeamQuizSession(Base):
    """
    question_ids — 10 ID вопросов (5 network + 5 database), рандомно из категорий.
    """
    __tablename__ = "team_quiz_sessions"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    team_id: Mapped[int] = mapped_column(Integer, ForeignKey("teams.id"), unique=True)
    question_ids: Mapped[list] = mapped_column(JSON, nullable=False)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    started_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    team: Mapped["Team"] = relationship("Team", back_populates="quiz_session")
    answers: Mapped[list["TeamAnswer"]] = relationship("TeamAnswer", back_populates="session")


class TeamAnswer(Base):
    __tablename__ = "team_answers"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    session_id: Mapped[int] = mapped_column(Integer, ForeignKey("team_quiz_sessions.id"))
    question_id: Mapped[int] = mapped_column(Integer, ForeignKey("quiz_questions.id"))
    chosen_index: Mapped[int] = mapped_column(Integer, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, nullable=False)
    answered_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    session: Mapped["TeamQuizSession"] = relationship("TeamQuizSession", back_populates="answers")
    question: Mapped["QuizQuestion"] = relationship("QuizQuestion", back_populates="answers")