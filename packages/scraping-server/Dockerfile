# ============================================================
# Stage 1: Install dependencies + download Chromium
# ============================================================
FROM oven/bun:1-debian AS install

WORKDIR /app

# Copy workspace root manifests for dependency resolution
COPY package.json bun.lock ./
COPY packages/api/package.json ./packages/api/
COPY packages/humanize/package.json ./packages/humanize/
COPY packages/scraping-kleinanzeigen/package.json ./packages/scraping-kleinanzeigen/
COPY packages/scraping-core/package.json ./packages/scraping-core/
COPY packages/shared/package.json ./packages/shared/
COPY packages/scraping-server/package.json ./packages/scraping-server/

# Install all workspace dependencies
RUN bun install --frozen-lockfile --ignore-scripts

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

WORKDIR /app

# Copy installed node_modules from install stage
COPY --from=install /app/node_modules ./node_modules
COPY --from=install /app/packages/api/node_modules ./packages/api/node_modules
COPY --from=install /app/packages/humanize/node_modules ./packages/humanize/node_modules
COPY --from=install /app/packages/scraping-kleinanzeigen/node_modules ./packages/scraping-kleinanzeigen/node_modules
COPY --from=install /app/packages/scraping-core/node_modules ./packages/scraping-core/node_modules
COPY --from=install /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=install /app/packages/scraping-server/node_modules ./packages/scraping-server/node_modules

# Copy Chromium browser from install stage
COPY --from=install /root/.cache/ms-playwright /root/.cache/ms-playwright

# Copy all workspace source files
COPY package.json bun.lock tsconfig.json ./
COPY packages/api/ ./packages/api/
COPY packages/humanize/ ./packages/humanize/
COPY packages/scraping-kleinanzeigen/ ./packages/scraping-kleinanzeigen/
COPY packages/scraping-core/ ./packages/scraping-core/
COPY packages/shared/ ./packages/shared/
COPY packages/scraping-server/ ./packages/scraping-server/

# Create data directory for HTML pages
RUN mkdir -p /app/packages/scraping-server/data

ENV NODE_ENV=production

WORKDIR /app/packages/scraping-server

ENTRYPOINT ["dumb-init", "--"]
CMD ["bun", "run", "src/index.ts"]
