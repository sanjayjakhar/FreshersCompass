# Production Dockerfile for FreshersCompass AI Microservice (FastAPI / Python)
#
# Multi-stage: the wheelhouse is built in a throwaway stage so the runtime image
# needs no compiler and no pip cache. See .dockerignore for why the local
# ai-service/venv must stay out of the build context.

# ---------- Stage 1: build wheels ----------
FROM python:3.12-slim AS builder

ENV PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Compilers are needed here and nowhere else. The build stage is discarded, so
# these ~200 MB never reach the runtime image.
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential git \
    && rm -rf /var/lib/apt/lists/*

# Install into a self-contained prefix we can copy wholesale.
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:${PATH}"

COPY requirements.txt ./
RUN pip install --upgrade pip setuptools wheel \
    && pip install --prefix=/install --no-compile -r requirements.txt


# ---------- Stage 2: minimal runtime ----------
FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:${PATH}"

WORKDIR /app

RUN addgroup --system freshercompass && adduser --system --ingroup freshercompass freshercompass

COPY --from=builder /install /usr/local

COPY --chown=freshercompass:freshercompass app ./app

USER freshercompass

EXPOSE 8000

# Probe with the stdlib instead of installing curl purely for the healthcheck.
# main.py serves GET /health.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD python -c "import sys,urllib.request; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=4).getcode()==200 else 1)"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]