FROM oven/bun:1-debian AS build
WORKDIR /app

COPY package.json bun.lock ./
COPY packages/api-types/package.json ./packages/api-types/
COPY packages/panel/package.json ./packages/panel/

RUN bun install --frozen-lockfile --ignore-scripts

COPY packages/api-types/ ./packages/api-types/
COPY packages/panel/ ./packages/panel/
COPY tsconfig.json ./

WORKDIR /app/packages/panel
RUN bun run build
