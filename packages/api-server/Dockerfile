# ============================================================
# Stage 1: Install dependencies
# ============================================================
FROM oven/bun:1-debian AS install

WORKDIR /app

# Copy workspace root manifests for dependency resolution
COPY package.json bun.lock ./
COPY packages/api/package.json ./packages/api/
COPY packages/api-server/package.json ./packages/api-server/

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
COPY --from=install /app/packages/api/node_modules ./packages/api/node_modules
COPY --from=install /app/packages/api-server/node_modules ./packages/api-server/node_modules

# Copy all workspace source files
COPY package.json bun.lock tsconfig.json ./
COPY packages/api/ ./packages/api/
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
