from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine, Base
from app.routers import qr, team, upload, admin


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Создаём таблицы при старте
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Создаём папку для загрузок
    Path(settings.UPLOAD_DIR).mkdir(exist_ok=True)

    yield

    await engine.dispose()


app = FastAPI(
    title="QR Event API",
    description="""
## API для регистрации команд через QR коды

### Флоу:
1. **Сканируй QR** → `POST /qr/verify` — проверка кода
2. **Первый участник** → `POST /team/register` — создаёт команду, получает токен и номер варианта
3. **Остальные участники** → `POST /team/join` — вводят название команды, получают токен
4. **Загрузка файла** → `POST /upload/` с Bearer токеном

### Варианты:
100 команд распределяются по 5 вариантам по формуле: `(team_id - 1) % 5 + 1`
    """,
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # В продакшене укажите конкретные домены
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(qr.router)
app.include_router(team.router)
app.include_router(upload.router)
app.include_router(admin.router)


@app.get("/", tags=["Root"])
async def root():
    return {
        "message": "QR Event API",
        "docs": "/docs",
        "redoc": "/redoc",
    }
