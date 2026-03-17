from datetime import datetime
from sqlalchemy import String, Integer, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class QRCode(Base):
    """
    100 уникальных QR кодов.
    Каждый стол получает один QR.
    variant — номер варианта (1..5), вычисляется при создании команды.
    """
    __tablename__ = "qr_codes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    is_used: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    team: Mapped["Team"] = relationship("Team", back_populates="qr_code", uselist=False)


class Team(Base):
    """
    Команда создаётся первым участником, который сканирует QR и вводит название.
    variant — номер варианта задания (1..TOTAL_VARIANTS).
    """
    __tablename__ = "teams"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(128), unique=True, nullable=False, index=True)
    qr_code_id: Mapped[int] = mapped_column(Integer, ForeignKey("qr_codes.id"), unique=True)
    variant: Mapped[int] = mapped_column(Integer, nullable=False)
    token: Mapped[str] = mapped_column(String(512), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    qr_code: Mapped["QRCode"] = relationship("QRCode", back_populates="team")
    uploads: Mapped[list["Upload"]] = relationship("Upload", back_populates="team")


class Upload(Base):
    """
    Загруженные файлы от команд.
    """
    __tablename__ = "uploads"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    team_id: Mapped[int] = mapped_column(Integer, ForeignKey("teams.id"))
    filename: Mapped[str] = mapped_column(String(256), nullable=False)
    original_name: Mapped[str] = mapped_column(String(256), nullable=False)
    file_path: Mapped[str] = mapped_column(Text, nullable=False)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    team: Mapped["Team"] = relationship("Team", back_populates="uploads")
