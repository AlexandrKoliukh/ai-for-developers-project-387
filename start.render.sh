#!/bin/sh
set -e

# Render provides PORT env var (usually 8000 on free plan)
export NGINX_PORT="${PORT:-10000}"

# Substitute env vars in nginx config template
envsubst '${NGINX_PORT}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

# Start FastAPI backend on internal port
uvicorn app.main:app --host 127.0.0.1 --port 8001 &

# Start nginx in foreground (PID 1 — receives SIGTERM from Render)
nginx -g 'daemon off;'
