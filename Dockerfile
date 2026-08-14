# syntax=docker/dockerfile:1.7
#
# LibreChat wrapper for Render.
# Uses official pre-built image (librechat/librechat:latest) + custom librechat.yaml with MCP servers.
# Node entrypoint serves log+health on $PORT so we can debug crashes without dashboard access.

FROM librechat/librechat:latest

USER root
COPY --chown=node:node librechat.yaml /app/librechat.yaml
COPY --chown=node:node .env /app/.env
COPY --chown=node:node entrypoint.js /app/entrypoint.js
RUN chmod +x /app/entrypoint.js && chown node:node /app/entrypoint.js

# Writable data dirs
RUN mkdir -p /app/client/public/images /app/logs /app/uploads /app/data /app/skill && \
    chmod -R 1777 /app/data /app/uploads /app/logs /app/client/public/images

ENV HOST=0.0.0.0
ENV PORT=10000
ENV NODE_ENV=production

USER node
EXPOSE 10000

CMD ["node", "/app/entrypoint.js"]
