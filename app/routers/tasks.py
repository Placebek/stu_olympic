import os
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from app.auth import get_current_team
from app.models.models import Team

router = APIRouter(prefix="/tasks", tags=["Tasks"])

TASKS_DIR = "app/tasks"
os.makedirs(TASKS_DIR, exist_ok=True)


def _parse_tasks(content: str) -> list[dict]:
    """
    Файл содержит 3 задачи, каждая на двух языках.
    Структура внутри файла:
        ## 1. Заголовок (KZ)
        ...текст...
        ---
        ## Русский: Заголовок (RU)
        ...текст...
        ---
        ## 2. ...
    
    Возвращает список из 6 блоков:
      number=1 lang=kz, number=1 lang=ru,
      number=2 lang=kz, number=2 lang=ru,
      number=3 lang=kz, number=3 lang=ru
    """
    # Разбиваем по разделителю ---
    parts = [p.strip() for p in content.split("\n---\n") if p.strip()]

    # Если нет разделителей — пробуем по "---" без пустых строк
    if len(parts) <= 1:
        parts = [p.strip() for p in content.split("---") if p.strip()]

    tasks = []
    task_num = 1
    lang_order = ["kz", "ru"]
    lang_idx = 0

    for part in parts:
        if not part:
            continue
        lang = lang_order[lang_idx % 2]
        tasks.append({
            "number": task_num,
            "language": lang,
            "content": part,
        })
        lang_idx += 1
        if lang_idx % 2 == 0:
            task_num += 1

    return tasks


@router.get("/my")
async def get_my_tasks(current_team: Team = Depends(get_current_team)):
    variant = current_team.variant
    file_path = os.path.join(TASKS_DIR, f"variant_{variant}.md")

    if not os.path.isfile(file_path):
        raise HTTPException(404, detail=f"Вариант {variant} не найден")

    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read().strip()

    tasks = _parse_tasks(content)

    return {
        "variant": variant,
        "team_name": current_team.first_name + " " + current_team.last_name,
        "total_tasks": len(tasks),   # обычно 6 (3 задачи × 2 языка)
        "tasks": tasks,
    }