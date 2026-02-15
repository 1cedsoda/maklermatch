# ============================================================
# Stage 1: Install dependencies + download Chromium
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

# Install Chromium browser for patchright
RUN bunx patchright install chromium

# ============================================================
# Stage 2: Runtime
# ============================================================
FROM oven/bun:1-debian AS runtime

# Install Chromium system dependencies + dumb-init
RUN apt-get update && apt-get install -y --no-install-recommends \
	libnss3 \
	libnspr4 \
	libatk1.0-0 \
	libatk-bridge2.0-0 \
	libcups2 \
	libdrm2 \
	libxkbcommon0 \
	libxcomposite1 \
	libxdamage1 \
	libxfixes3 \
	libxrandr2 \
	libgbm1 \
	libpango-1.0-0 \
	libcairo2 \
	libasound2 \
	libatspi2.0-0 \
	libwayland-client0 \
	fonts-liberation \
	fonts-noto-color-emoji \
	dumb-init \
	&& rm -rf /var/lib/apt/lists/*

# Create non-root user before COPY so --chown can reference it
RUN groupadd -r appuser && useradd -r -g appuser -m -d /home/appuser appuser

WORKDIR /app

# Chromium binary (largest blob, changes only on patchright version bump)
COPY --from=install --chown=appuser:appuser /root/.cache/ms-playwright /home/appuser/.cache/ms-playwright

# node_modules (changes only when dependencies change)
COPY --from=install --chown=appuser:appuser /app/node_modules ./node_modules
COPY --from=install --chown=appuser:appuser /app/packages/api-types/node_modules ./packages/api-types/node_modules
COPY --from=install --chown=appuser:appuser /app/packages/humanize/node_modules ./packages/humanize/node_modules
COPY --from=install --chown=appuser:appuser /app/packages/scraping-kleinanzeigen/node_modules ./packages/scraping-kleinanzeigen/node_modules
COPY --from=install --chown=appuser:appuser /app/packages/scraping-core/node_modules ./packages/scraping-core/node_modules
COPY --from=install --chown=appuser:appuser /app/packages/scraping-server/node_modules ./packages/scraping-server/node_modules

# Workspace root config (changes rarely)
COPY --chown=appuser:appuser package.json bun.lock tsconfig.json ./

# Dependency packages (change less often than main service)
COPY --chown=appuser:appuser packages/api-types/ ./packages/api-types/
COPY --chown=appuser:appuser packages/humanize/ ./packages/humanize/
COPY --chown=appuser:appuser packages/scraping-core/ ./packages/scraping-core/
COPY --chown=appuser:appuser packages/scraping-kleinanzeigen/ ./packages/scraping-kleinanzeigen/

# Main service source (changes most often)
COPY --chown=appuser:appuser packages/scraping-server/ ./packages/scraping-server/

USER appuser

# Create data directory for HTML pages (appuser owns parent via --chown)
RUN mkdir -p /app/packages/scraping-server/data

ENV NODE_ENV=production
ENV HOME=/home/appuser

WORKDIR /app/packages/scraping-server

ENTRYPOINT ["dumb-init", "--"]
CMD ["bun", "run", "src/index.ts"]
