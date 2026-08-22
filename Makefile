.PHONY: help up down build migrate test lint typecheck fmt

help:
	@echo "make up        - start the full stack (docker compose)"
	@echo "make down      - stop the stack"
	@echo "make build     - build backend image"
	@echo "make migrate   - run alembic migrations"
	@echo "make test      - run backend tests"
	@echo "make lint      - run ruff"
	@echo "make typecheck - run mypy"
	@echo "make fmt       - format with ruff"

up:
	docker compose up -d

down:
	docker compose down

build:
	docker compose build

migrate:
	cd backend && uv run alembic upgrade head

test:
	cd backend && uv run pytest

lint:
	cd backend && uv run ruff check .

typecheck:
	cd backend && uv run mypy

fmt:
	cd backend && uv run ruff format .
