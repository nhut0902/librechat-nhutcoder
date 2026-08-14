# syntax=docker/dockerfile:1.7
#
# LibreChat wrapper for Render.
# Uses the official pre-built image (librechat/librechat:latest, v0.8.7) to avoid
# building 6GB+ React/Node frontend on Render free/starter tier (512MB-2GB RAM).
# Bakes in our custom librechat.yaml (Zernio + Composio + Cloudinary MCP) + .env.
#
# Render requires the app to listen on $PORT (default 10000). LibreChat reads
# PORT from env, so we just need to set PORT=10000.

FROM librechat/librechat:latest

# Copy our custom config (Zernio + Composio + Cloudinary MCP servers)
COPY --chown=node:node librechat.yaml /app/librechat.yaml
COPY --chown=node:node .env /app/.env

# Render injects PORT env (default 10000). LibreChat reads PORT from .env.
# We override via ENV to ensure Render's port wins.
ENV HOST=0.0.0.0
ENV PORT=10000
ENV NODE_ENV=production

# Writable data dirs (Render ephemeral filesystem — data lost on redeploy
# unless using Disk. For now, we accept ephemeral uploads and rely on
# MongoDB Atlas for persistent user data.)
RUN mkdir -p /app/client/public/images /app/logs /app/uploads /app/data /app/skill && \
    chmod -R 1777 /app/data /app/uploads /app/logs /app/client/public/images

EXPOSE 10000

# LibreChat default CMD is "npm run backend" which reads PORT env
