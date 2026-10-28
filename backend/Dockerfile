FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

ARG INSTALL_LOCAL_EMBEDDINGS=false

COPY pyproject.toml ./
COPY app ./app
COPY alembic.ini ./
COPY migrations ./migrations

RUN pip install --no-cache-dir .
RUN if [ "$INSTALL_LOCAL_EMBEDDINGS" = "true" ]; then \
    pip install --no-cache-dir ".[local-embeddings]" \
    --extra-index-url https://download.pytorch.org/whl/cu124; \
    fi

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
