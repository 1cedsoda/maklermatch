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

# Install all workspace dependencies
RUN bun install --frozen-lockfile --ignore-scripts

# ============================================================
# Stage 2: Runtime
# ============================================================
FROM oven/bun:1-debian AS runtime

RUN apt-get update && apt-get install -y --no-install-recommends \
	dumb-init \
	&& rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy installed node_modules from install stage
COPY --from=install /app/node_modules ./node_modules
COPY --from=install /app/packages/api-types/node_modules ./packages/api-types/node_modules
COPY --from=install /app/packages/api-server/node_modules ./packages/api-server/node_modules

# Copy all workspace source files
COPY package.json bun.lock tsconfig.json ./
COPY packages/api-types/ ./packages/api-types/
COPY packages/api-server/ ./packages/api-server/

# Create data directory for SQLite
RUN mkdir -p /app/packages/api-server/data

ENV NODE_ENV=production
ENV PORT=3001

# CWD must be api-server for drizzle migrations (migrationsFolder: "./drizzle")
WORKDIR /app/packages/api-server

EXPOSE 3001

ENTRYPOINT ["dumb-init", "--"]
CMD ["bun", "run", "src/index.ts"]
