import os
from fastapi import APIRouter, Depends, HTTPException, status
from app.config import settings
from app.auth import get_current_team
from app.models.models import Team

router = APIRouter(prefix="/tasks", tags=["Tasks"])

TASKS_DIR = "app/tasks"
os.makedirs(TASKS_DIR, exist_ok=True)


# улучшенная версия get_my_tasks

@router.get("/my")
async def get_my_tasks(current_team: Team = Depends(get_current_team)):
    variant = current_team.variant
    file_path = os.path.join(TASKS_DIR, f"variant_{variant}.md")

    if not os.path.isfile(file_path):
        raise HTTPException(404, detail=f"Вариант {variant} не найден")

    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read().strip()

    # Разделяем по --- (или по # Задание)
    parts = [p.strip() for p in content.split("---") if p.strip()]

    if len(parts) != 3:
        # можно логировать предупреждение, но не падать
        pass

    tasks = []
    for i, text in enumerate(parts, 1):
        tasks.append({
            "number": i,
            "content": text.strip(),
        })

    return {
        "variant": variant,
        "team_name": current_team.firstname + " " + current_team.lastname,
        "tasks": tasks,               # список из 3 элементов
    }