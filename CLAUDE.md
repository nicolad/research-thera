# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Research-based therapeutic platform combining AI-powered content generation, multi-source academic research integration, and audio delivery. Built with Next.js App Router, GraphQL (Apollo), Mastra AI agents, and Cloudflare D1/R2.

## Commands

```bash
pnpm dev              # Next.js dev server (localhost:3000)
pnpm build            # Production build
pnpm lint             # ESLint
pnpm codegen          # GraphQL code generation (resolvers + client hooks)
pnpm mastra:dev       # Mastra agent dev server
```

Database migrations (Cloudflare D1 via Wrangler):
```bash
wrangler d1 migrations create research-thera-db <migration-name>
wrangler d1 migrations apply research-thera-db
```

## Architecture

### Data Flow

Client (React + Apollo) → GraphQL API (`/api/graphql`) → Resolvers → D1 database / Mastra agents → External APIs (DeepSeek, OpenAI, research sources)

### GraphQL (Schema-First)

- Schema definitions: `schema/schema.graphql`
- Operations (queries/mutations): `schema/operations/`
- Resolvers: `schema/resolvers/` (auto-generated scaffolds via codegen)
- Generated client types and hooks: `app/__generated__/`
- **Always run `pnpm codegen` after modifying `.graphql` files**

### AI Agents (Mastra)

- Agent definitions: `src/agents/index.ts` — `storyTellerAgent` and `therapeuticAgent` (DeepSeek LLM)
- Workflows: `src/workflows/` — `generateTherapyResearchWorkflow` is a multi-step pipeline (load context → plan queries → multi-source search → extract → persist)
- Tools: `src/tools/` — research source APIs, paper extraction, RAG chunking, claim verification
- Mastra instance: `src/mastra.ts`
- Prompt management and tracing: Langfuse

### Database (Cloudflare D1 + Drizzle ORM)

- Schema: `src/db/schema.ts` (SQLite tables via Drizzle)
- DB operations: `src/db/index.ts` (all CRUD functions)
- D1 HTTP client: `src/db/d1.ts` (remote access, not Workers binding)
- Migrations: `drizzle/`
- Config: `drizzle.config.ts`, `src/config/d1.ts`

### Authentication

Clerk (`@clerk/nextjs`) with modal sign-in/sign-up (no dedicated auth pages). GraphQL context provides `userId` and `userEmail` from Clerk's `auth()` and `currentUser()`.

### Frontend

- App Router pages: `app/goals/`, `app/notes/`, `app/stories/`
- UI: Radix UI Themes (dark mode, Indigo accent)
- Apollo Client setup: `app/lib/apollo-client.ts`, wrapped in `app/providers/`
- Components: `app/components/`

### Storage

- Audio assets (TTS output): Cloudflare R2 via S3-compatible SDK (`lib/r2-uploader.ts`)
- TTS API route: `app/api/tts/route.ts` (OpenAI TTS with text chunking via Mastra RAG MDocument)

### Research Sources

Multi-source integration: Crossref, PubMed, Semantic Scholar, OpenAlex, arXiv, Europe PMC, DataCite. Rate-limited via Bottleneck with concurrency controls.

## Key Conventions

- D1 operations use HTTP API client (not Workers bindings) for local development
- JSON serialization for complex DB fields (authors, tags, evidence arrays)
- Numeric values sanitized before D1 writes to prevent NaN/Infinity in SQLite
- Note sharing uses normalized emails (trim + lowercase)
- GraphQL subscriptions via WebSocket for job status updates (research, audio generation)
