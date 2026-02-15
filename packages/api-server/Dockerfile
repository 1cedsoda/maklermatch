# ============================================================
# Stage 1: Install dependencies
# ============================================================
FROM oven/bun:1-debian AS install

WORKDIR /app

# Copy workspace root manifests for dependency resolution
COPY package.json bun.lock ./
COPY packages/agent/package.json ./packages/agent/
COPY packages/api-server/package.json ./packages/api-server/
COPY packages/api-types/package.json ./packages/api-types/
COPY packages/humanize/package.json ./packages/humanize/
COPY packages/llm/package.json ./packages/llm/
COPY packages/panel/package.json ./packages/panel/
COPY packages/scraping-core/package.json ./packages/scraping-core/
COPY packages/scraping-kleinanzeigen/package.json ./packages/scraping-kleinanzeigen/
COPY packages/scraping-server/package.json ./packages/scraping-server/

# Install production dependencies only
RUN bun install --frozen-lockfile --ignore-scripts --production

# ============================================================
# Stage 2: Runtime
# ============================================================
FROM oven/bun:1-debian AS runtime

RUN apt-get update && apt-get install -y --no-install-recommends \
	dumb-init \
	curl \
	&& rm -rf /var/lib/apt/lists/*

# Create non-root user before COPY so --chown can reference it
RUN groupadd -r appuser && useradd -r -g appuser -d /app appuser

WORKDIR /app

# node_modules (changes only when dependencies change)
COPY --from=install --chown=appuser:appuser /app/node_modules ./node_modules
COPY --from=install --chown=appuser:appuser /app/packages/api-types/node_modules ./packages/api-types/node_modules
COPY --from=install --chown=appuser:appuser /app/packages/api-server/node_modules ./packages/api-server/node_modules
COPY --from=install --chown=appuser:appuser /app/packages/agent/node_modules ./packages/agent/node_modules

# Workspace root config (changes rarely)
COPY --chown=appuser:appuser package.json bun.lock tsconfig.json ./

# Dependency packages (change less often than main service)
COPY --chown=appuser:appuser packages/api-types/ ./packages/api-types/
COPY --chown=appuser:appuser packages/agent/ ./packages/agent/

# Main service source (changes most often)
COPY --chown=appuser:appuser packages/api-server/ ./packages/api-server/

USER appuser

# Create data directory for SQLite (appuser owns parent via --chown)
RUN mkdir -p /app/packages/api-server/data

ENV NODE_ENV=production
ENV PORT=3001

# CWD must be api-server for drizzle migrations (migrationsFolder: "./drizzle")
WORKDIR /app/packages/api-server

EXPOSE 3001

ENTRYPOINT ["dumb-init", "--"]
CMD ["bun", "run", "src/index.ts"]
