# Stage 1: Build Frontend Assets
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci || npm install

COPY frontend/ ./
RUN npm run build

# Stage 2: Production Python Backend & Unified App
FROM python:3.12-slim
WORKDIR /app

# Ensure unbuffered stdout/stderr logging
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app \
    PORT=8080

# Install dependencies
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r /app/backend/requirements.txt

# Copy backend application code
COPY backend/ /app/backend/

# Copy compiled frontend from Stage 1
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Pre-generate sample PDF audit packets so they are pre-baked in the image
RUN python /app/backend/app/generate_samples.py

# Expose port (default 8080 for Cloud Run)
EXPOSE 8080

# Launch FastAPI app with dynamic Cloud Run port
CMD ["sh", "-c", "exec uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT:-8080}"]
