# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Bun/TypeScript monorepo for a Kleinanzeigen (German classifieds) scraping platform with automated broker outreach. Scrapes listings, tracks price/seller changes via snapshots, and uses LLM-powered agents to contact sellers via email.

## Commands

### Install & Format
```bash
bun install                    # Install all workspace dependencies
bunx biome format --write .    # Format entire codebase (tabs, not spaces)
```

### Per-Package Development
```bash
# API server (Express + SQLite, port 3001)
cd packages/api-server && bun run dev

# Scraping server (connects to API via WebSocket)
cd packages/scraping-server && bun run dev

# Panel (React + Vite, port 5173)
cd packages/panel && bun run dev

# LLM messaging app (Next.js)
cd packages/llm && bun run dev
```

### Database (api-server)
```bash
bun run db:generate   # Generate Drizzle migration from schema changes
bun run db:migrate    # Apply pending migrations
```

### Tests
```bash
# Bun's native test runner — run from package dir
cd packages/scraping-kleinanzeigen && bun test              # All tests
cd packages/scraping-kleinanzeigen && bun test extract-listing-detail.test.ts  # Single file
cd packages/llm && bun test                                 # Messaging engine tests
```

### Docker (full local stack)
```bash
cd deployment/local && docker-compose up   # Panel at http://localhost:8080 via Caddy
```

## Architecture

### Package Dependency Graph
```
panel ──→ api-types
llm ──→ agent ──→ ai-sdk (Langdock/OpenAI-compatible)
scraping-server ──→ scraping-kleinanzeigen ──→ scraping-core
                ──→ humanize
                ──→ api-types
api-server ──→ api-types
```

### Data Flow
1. **Panel** creates search targets (category/location/criteria) via REST → **api-server**
2. **api-server** scheduler triggers scraping via Socket.io → **scraping-server**
3. **scraping-server** runs Patchright (Chromium), extracts HTML with happy-dom, sends results back over WebSocket
4. **api-server** ingestion service upserts listings, creates abstract/detail/seller snapshots, tracks changes
5. **Panel** displays listings, sellers, targets; **llm** app handles AI chat for broker outreach

### WebSocket Protocol (api-types/src/scraper/events.ts)
Scraper↔Server communication uses typed Socket.io events: `REGISTER`, `SCRAPE_START`, `SCRAPE_RESULT`, `SCRAPE_ERROR`, `LISTING_CHECK`, `INGEST_LISTINGS`, `LOG_LINE`, `SCRAPER_TRIGGER`, `SCRAPER_STATUS`. Types defined in `ScraperToServerEvents` and `ServerToScraperEvents` interfaces.

### Database (SQLite via Drizzle ORM)
- Schema: `packages/api-server/src/db/schema.ts`
- Migrations: `packages/api-server/drizzle/*.sql`
- Key pattern: immutable snapshots (listing abstract, listing detail, seller) linked by `previousVersionId`/`previousSnapshotId` to track changes over time
- Uses `bun:sqlite` — not Node.js compatible

### Key Directories
- `packages/api-types/src/scraper/` — Zod schemas and WebSocket event types shared between server and scraper
- `packages/agent/src/prompts.ts` — All LLM system prompts (centralized)
- `packages/api-server/src/services/` — Business logic (ingest, scheduler, targets)
- `packages/scraping-kleinanzeigen/src/` — HTML extraction and browser automation
- `packages/scraping-kleinanzeigen/src/fixtures/` — HTML test fixtures
- `packages/humanize/` — Mouse movement, scrolling, delay, viewport randomization for anti-detection

## Conventions

- **Runtime**: Bun everywhere (not Node.js)
- **Formatting**: Biome with tab indentation; auto-formatted on pre-commit via lefthook
- **TypeScript**: Strict mode, ES2022 target, bundler module resolution
- **Validation**: Zod schemas for API payloads and WebSocket events
- **Logging**: Pino with child loggers per module (`logger.child({ module: "name" })`)
- **Styling**: Tailwind CSS 4 + Radix UI + shadcn components (panel and llm)
- **Workspace references**: `"workspace:*"` in package.json dependencies
