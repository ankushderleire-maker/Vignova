FROM python:3.11-slim-bookworm

WORKDIR /app

# System deps
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# Install Python deps (includes gunicorn + slowapi added in requirements.txt)
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download ML models at build time so container startup is fast.
# Without this, the first request after deploy stalls for 60+ seconds
# while the model downloads to a cold container.
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"
RUN python -m spacy download en_core_web_sm

COPY . .

EXPOSE 8000

# Gunicorn with UvicornWorker gives true multi-process concurrency.
# WORKERS defaults to 2 — safe for a 2-core server that also loads ~90 MB
# of ML model weights per worker.  Override via -e WORKERS=4 in compose.
# --max-requests restarts workers after 500 requests to prevent slow
# memory leaks from accumulating over long-running deployments.
CMD ["sh", "-c", \
  "gunicorn main:app \
     --worker-class uvicorn.workers.UvicornWorker \
     --workers ${WORKERS:-2} \
     --bind 0.0.0.0:8000 \
     --timeout 120 \
     --graceful-timeout 30 \
     --keep-alive 5 \
     --max-requests 500 \
     --max-requests-jitter 50 \
     --log-level info \
     --access-logfile -"]
