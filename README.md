# OlympIQ — Олимпиадная платформа

Фронтенд на React + Tailwind + Framer Motion с уникальным liquid glass дизайном.

## Стек

- **React 18** + **React Router v6**
- **Tailwind CSS** — утилиты
- **Framer Motion** — анимации
- **react-dropzone** — загрузка файлов
- **react-hot-toast** — уведомления
- **axios** — HTTP-клиент
- **lucide-react** — иконки

## Запуск

```bash
npm install
cp .env.example .env
# Отредактируй VITE_API_URL в .env
npm run dev
```

## Страницы

| Путь | Описание |
|------|----------|
| `/register/:code` | Регистрация/вход по QR-коду |
| `/` | Главная (правила, вариант команды) |
| `/task` | Задача + загрузка файлов |
| `/results` | Результаты (медали, номинации) |
| `/x9k2-admin` | **Панель администратора** (скрытый URL) |

## API эндпоинты (ожидаемые)

```
POST /api/auth/validate-qr     { code }           → { available, teamName? }
POST /api/auth/register        { code, teamName }  → { token, variant }
GET  /api/tasks/:variant                           → { title, description, ... }
POST /api/submissions          FormData(files)     → 200
GET  /api/results                                  → Team[]
GET  /api/admin/submissions                        → Submission[]
POST /api/admin/teams/:id/score  { score, nomination }
POST /api/admin/teams/:id/disqualify { reason }
POST /api/admin/login          { password }        → 200
```

## Пасхалки 🥚

- **Konami Code** (`↑↑↓↓←→←→BA`) — появляется toast с сообщением
- **Тройной клик по логотипу** — тот же эффект

## Структура

```
src/
├── components/
│   ├── AuroraBackground.jsx   # Анимированный фон с блобами
│   ├── Navbar.jsx             # Навбар со скруглением
│   └── EasterEgg.jsx          # Пасхалка toast
├── context/
│   └── AuthContext.jsx        # JWT + команда
├── hooks/
│   └── useKonami.js           # Konami + triple-click
├── pages/
│   ├── RegisterPage.jsx       # QR flow
│   ├── HomePage.jsx           # Главная
│   ├── TaskPage.jsx           # Задача + upload
│   ├── ResultsPage.jsx        # Результаты
│   └── AdminPage.jsx          # Админка
├── utils/
│   └── api.js                 # Axios + эндпоинты
├── App.jsx
├── main.jsx
└── index.css                  # Glass стили, aurora, анимации
```
