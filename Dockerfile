# ---- Stage 1: Build frontend static files ----
FROM node:24-slim AS frontend-build

WORKDIR /app
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ .
RUN npm run build

# ---- Stage 2: Production runtime ----
FROM python:3.9-slim

# Install nginx
RUN apt-get update && \
    apt-get install -y --no-install-recommends nginx gettext-base && \
    rm -rf /var/lib/apt/lists/*

# Install Python dependencies
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/app/ ./app/

# Copy built frontend into nginx serve directory
COPY --from=frontend-build /app/dist /usr/share/nginx/html

# Copy nginx config as template (envsubst resolves $PORT at runtime)
COPY nginx.render.conf /etc/nginx/nginx.conf.template

# Copy startup script
COPY start.render.sh /start.sh
RUN chmod +x /start.sh

CMD ["/start.sh"]
