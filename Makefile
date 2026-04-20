SPEC_DIR     := src/spec
FRONTEND_DIR := frontend

.PHONY: help up backend frontend frontend-mock claude stop logs \
        spec spec-compile restart-mock install build tsc clean \
        test-install test test-api test-e2e test-headed test-report

help:
	@echo ""
	@echo "  up             FastAPI бэкенд + фронтенд (основной режим)"
	@echo "  backend        только FastAPI бэкенд (порт 8000)"
	@echo "  frontend-mock  фронтенд + Prism-моки (legacy)"
	@echo "  frontend       алиас → frontend-mock"
	@echo "  claude         Claude Code (интерактивный, Docker)"
	@echo "  stop           остановить контейнеры"
	@echo "  logs           логи контейнеров"
	@echo "  spec           TypeSpec → openapi.yaml + перезапуск моков"
	@echo "  restart-mock   перезапустить Prism"
	@echo "  install        установить зависимости фронтенда"
	@echo "  build          production-сборка фронтенда"
	@echo "  tsc            проверка типов TypeScript"
	@echo "  clean          удалить артефакты сборки"
	@echo ""
	@echo "  test-install   установить Playwright и браузеры (первый раз)"
	@echo "  test           все тесты (стек поднимается автоматически)"
	@echo "  test-api       только API-тесты (http://localhost:8000)"
	@echo "  test-e2e       только E2E-тесты (http://localhost:5173)"
	@echo "  test-headed    E2E с видимым браузером"
	@echo "  test-report    открыть HTML-отчёт"
	@echo ""
	@echo "  Таймзона владельца: задать OWNER_TIMEZONE в docker-compose.yml"
	@echo "  Документация API:   http://localhost:8000/docs"
	@echo ""

# FastAPI backend + frontend (default dev target)
up:
	docker compose up backend frontend

# Backend only
backend:
	docker compose up backend

# Frontend + Prism mock server (legacy / spec testing)
frontend-mock:
	VITE_MOCK_API_URL=http://mock-api:4010 docker compose up mock-api frontend

# Backward-compat alias
frontend: frontend-mock

claude:
	@[ -f $(HOME)/.claude.json ] || echo '{}' > $(HOME)/.claude.json
	docker compose run --rm -it claude-code

stop:
	docker compose down

logs:
	docker compose logs -f

spec:
	cd $(SPEC_DIR) && npx tsp compile .
	$(MAKE) restart-mock

spec-compile: spec

restart-mock:
	docker compose restart mock-api 2>/dev/null || true

install:
	cd $(FRONTEND_DIR) && npm install

build:
	cd $(FRONTEND_DIR) && npm run build

tsc:
	cd $(FRONTEND_DIR) && npx tsc --noEmit

clean:
	rm -rf $(FRONTEND_DIR)/dist $(FRONTEND_DIR)/node_modules/.cache

# ---------------------------------------------------------------------------
# Playwright tests (run after `make up` has started the stack)
# ---------------------------------------------------------------------------

test-install:
	cd tests && npm install && npx playwright install chromium

test:
	cd tests && npm test

test-api:
	cd tests && npm run test:api

test-e2e:
	cd tests && npm run test:e2e

test-headed:
	cd tests && npm run test:headed

test-report:
	cd tests && npm run test:report
