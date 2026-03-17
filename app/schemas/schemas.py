from datetime import datetime
from pydantic import BaseModel, field_validator


# ---------- QR ----------

class QRVerifyRequest(BaseModel):
    code: str


class QRVerifyResponse(BaseModel):
    valid: bool
    team_exists: bool          # True — команда уже создана, нужно просто войти
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
