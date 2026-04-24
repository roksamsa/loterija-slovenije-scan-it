FROM node:22-alpine AS frontend

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY index.html ./
COPY tsconfig*.json ./
COPY vite.config.ts ./
COPY src ./src
COPY public ./public

RUN npm run build

FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    STATIC_DIR=/app/static

WORKDIR /app/server

COPY server/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY server ./
COPY --from=frontend /app/dist /app/static

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
