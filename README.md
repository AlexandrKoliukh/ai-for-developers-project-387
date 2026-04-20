### Hexlet tests and linter status:
[![Actions Status](https://github.com/AlexandrKoliukh/ai-for-developers-project-387/actions/workflows/hexlet-check.yml/badge.svg)](https://github.com/AlexandrKoliukh/ai-for-developers-project-387/actions)[![Tests](https://github.com/AlexandrKoliukh/ai-for-developers-project-386/actions/workflows/tests.yml/badge.svg)](https://github.com/AlexandrKoliukh/ai-for-developers-project-386/actions/workflows/tests.yml)

---

## Запись на звонок

Сервис бронирования времени (Cal.com-like). Один владелец, гости бронируют без аккаунта.

**Демо:** https://booking-app-b7xo.onrender.com/

### Стек технологий

| Слой | Технология |
|------|-----------|
| API-контракт | TypeSpec → OpenAPI 3.0 |
| Backend | FastAPI 0.111 + Uvicorn (Python) |
| Валидация данных | Pydantic 2.7 |
| Frontend | Vite 5 + React 18 + TypeScript 5 |
| Анимации | Framer Motion 11 |
| Работа с датами | date-fns 3 |
| Маршрутизация | React Router 6 |
| Моки API | Prism (stoplight/prism:4) |
| Тестирование | Playwright |
| Контейнеризация | Docker + Docker Compose |
| Деплой | Render |

### Структура проекта

```
├── frontend/           Vite + React + TypeScript
├── backend/            FastAPI (Python)
├── src/spec/           TypeSpec → OpenAPI 3.0
├── tests/              Playwright (API + E2E)
├── docker-compose.yml  локальное окружение
├── Dockerfile          production-сборка (Render)
└── Makefile            все команды проекта
```

### Локальное развёртывание

```bash
make install     # установить зависимости фронтенда
make up          # бэкенд + фронтенд
```

- http://localhost:5173 — фронтенд
- http://localhost:8000/docs — API документация

Другие команды:

```bash
make stop        # остановить контейнеры
make logs        # логи контейнеров
make spec        # TypeSpec → openapi.yaml
make build       # production-сборка фронтенда
make tsc         # проверка типов TypeScript
```

Настройки (таймзона, рабочие часы) — в `docker-compose.yml`.

### Тестирование

```bash
make test-install   # первый раз: Playwright + Chromium
make test           # все тесты (стек поднимается автоматически)
```

### Деплой

Приложение деплоится на [Render](https://render.com) через `render.yaml`. Push в `main` запускает автоматический деплой.

### MCP-серверы и плагины

Проект использует [Claude Code](https://docs.anthropic.com/en/docs/claude-code) с подключёнными MCP-серверами для автоматизации разработки.

**MCP-серверы** (конфигурация в `.mcp.json`):

| Сервер | Назначение |
|--------|-----------|
| `playwright` | Браузерная автоматизация через Playwright MCP |
| `chrome-devtools` | Chrome DevTools Protocol для отладки в headless-режиме |
| `claude-flow` | Оркестрация мультиагентных swarm-ов, память (AgentDB), хуки, HNSW-поиск |

**Плагины Claude Code** (slash-команды в `.claude/commands/`):

| Группа | Описание |
|--------|---------|
| SPARC | Методология разработки — архитектор, кодер, тестер, ревьюер, дебаггер и др. |
| GitHub | Управление PR, issues, code review, релизы, multi-repo координация |
| Hooks | Автоматизация хуков — pre/post edit, session start/end |
| Monitoring | Мониторинг агентов и swarm-ов в реальном времени |
| Optimization | Оптимизация топологии, кэширования и параллельного выполнения |
| Analysis | Анализ производительности, узких мест и потребления токенов |
| Automation | Автоматический спаун агентов, self-healing workflows |
