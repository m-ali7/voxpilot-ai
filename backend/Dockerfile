FROM python:3.12-slim

WORKDIR /app

COPY pyproject.toml uv.lock ./
COPY .python-version ./

RUN pip install --no-cache-dir uv

RUN uv sync --frozen --no-dev

COPY app ./app
COPY alembic.ini ./
COPY alembic ./alembic

ENV PATH="/app/.venv/bin:${PATH}"

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
