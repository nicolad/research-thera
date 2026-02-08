# ResearchThera Architecture Guide

## System Overview

ResearchThera is a full-stack TypeScript application that combines Next.js, GraphQL, and AI services to provide research-backed therapeutic note-taking and goal management.

## Architecture Layers

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                   │
│  • React 19 Components                                   │
│  • Radix UI Design System                                │
│  • Apollo Client (GraphQL)                               │
│  • Auto-generated TypeScript Hooks                       │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                  GraphQL API Layer                       │
│  • Apollo Server                                         │
│  • Type-safe Resolvers                                   │
│  • Schema-first Design                                   │
│  • Subscription Support                                  │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                 Business Logic Layer                     │
│  • Resolver Functions                                    │
│  • Turso Tools (Database Operations)                     │
│  • Mastra Workflows (AI Operations)                      │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                   Data Layer                             │
│  • Turso (LibSQL/SQLite)                                 │
│  • Drizzle ORM                                           │
│  • Edge-optimized Storage                                │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│               External Services                          │
│  • OpenAI (LLM)                                          │
│  • DeepSeek (Alternative LLM)                            │
│  • ElevenLabs (Text-to-Speech)                          │
│  • Research APIs (PubMed, CrossRef, etc.)                │
└─────────────────────────────────────────────────────────┘
```

## Directory Structure

### `/app` - Next.js Application
- **Purpose**: Frontend React application using App Router
- **Key Files**:
  - `layout.tsx` - Root layout with Radix UI Theme
  - `page.tsx` - Home page with feature showcase
  - `goals/` - Goal management pages
  - `notes/` - Note management pages
  - `components/` - Shared React components
  - `providers/` - Context providers (Apollo)
  - `__generated__/` - Auto-generated GraphQL hooks

### `/schema` - GraphQL Schema & Resolvers
- **Purpose**: GraphQL schema definition and resolver implementation
- **Key Files**:
  - `schema.graphql` - Type definitions, queries, mutations
  - `resolvers/` - Type-safe resolver implementations
  - `operations/` - Client-side GraphQL operations
  - `types.generated.ts` - Auto-generated TypeScript types

### `/src` - Core Business Logic
- **`/db`**: Database schema and client
  - `schema.ts` - Drizzle ORM table definitions
  - `turso.ts` - Database client setup
  - `index.ts` - Exported database utilities

- **`/mastra`**: AI workflows and tools
  - `tools/turso.tools.ts` - Database operation helpers
  - `adapters/` - Storage adapters for claim cards
  - `index.ts` - Mastra configuration

- **`/voice`**: Audio generation utilities
  - ElevenLabs integration for TTS

### `/scripts` - Utility Scripts
- Data import scripts
- Research paper enrichment
- Claim card generation utilities

## Data Model

### Core Entities

#### Goal
Central entity representing a therapeutic goal.

**Fields**:
- Basic: id, title, description, status, priority
- Dates: targetDate, createdAt, updatedAt
- Ownership: userId, familyMemberId
- Content: therapeuticText, therapeuticTextLanguage

**Relationships**:
- Has many: research, questions, stories, notes

#### Note
User-generated content linked to goals or other entities.

**Fields**:
- Content: title, content, noteType, slug
- Organization: tags[], entityId, entityType
- Ownership: userId, createdBy

**Relationships**:
- Belongs to: goal (via entityId/entityType)
- Has many: linkedResearch, claimCards

#### Research (TherapyResearch)
Academic papers linked to goals.

**Fields**:
- Metadata: title, authors[], year, journal, doi, url
- Content: abstract, keyFindings[], therapeuticTechniques[]
- Scoring: relevanceScore, extractionConfidence, evidenceLevel
- AI: extractedBy, therapeuticGoalType

**Relationships**:
- Belongs to: goal
- Linked by: notes (many-to-many)

#### ClaimCard
Evidence-based verification of claims.

**Fields**:
- Core: claim, verdict, confidence
- Scope: population, intervention, comparator, outcome, timeframe
- Evidence: evidence[] (with papers, polarity, excerpts)
- Tracking: queries[], provenance, notes

**Relationships**:
- Linked by: notes (many-to-many)

## GraphQL Schema Design

### Queries
- **Single Entity**: `goal(id, userId)`, `note(id, slug, userId)`
- **Lists**: `goals(filters)`, `notes(entityId, entityType)`, `allNotes(userId)`
- **Related Data**: `research(goalId)`, `therapeuticQuestions(goalId)`
- **Jobs**: `generationJob(id)`, `generationJobs(filters)`

### Mutations
- **CRUD**: Create/Update/Delete for Goals and Notes
- **AI Generation**:
  - `generateResearch(goalId)` - Find relevant papers
  - `generateTherapeuticQuestions(goalId)` - Create reflection prompts
  - `generateLongFormText(goalId)` - Synthesize therapeutic narrative
  - `generateAudio(goalId)` - Create TTS audio
- **Verification**:
  - `buildClaimCards(input)` - Verify arbitrary claims
  - `checkNoteClaims(noteId)` - Verify claims in a note

### Subscriptions
- `researchJobStatus(jobId)` - Real-time research job updates
- `audioJobStatus(jobId)` - Real-time audio generation updates

## Type Resolvers

### Goal Resolver
Fields resolved from database or relationships:
- `research` → `tursoTools.listTherapyResearch(goalId)`
- `notes` → `tursoTools.listNotesForEntity(goalId, "Goal", userId)`
- `questions` → `tursoTools.listTherapeuticQuestions(goalId)`
- `stories` → `tursoTools.listGoalStories(goalId)`

### Note Resolver
- `linkedResearch` → `tursoTools.getResearchForNote(noteId)`
- `claimCards` → `storage.getCardsForItem(noteId)`
- `goal` → Fetches parent goal if entityType === "Goal"

### Research Resolver
- `goal` → Fetches parent goal by goalId

### GoalStory Resolver
- `segments` → `tursoTools.getTextSegmentsForStory(storyId)`
- `audioAssets` → `tursoTools.getAudioAssetsForStory(storyId)`

## Database Operations (tursoTools)

All database operations are centralized in `src/mastra/tools/turso.tools.ts`:

**Goals**:
- `getGoal(goalId, userId)`
- `listGoals(userId, filters)`
- `createGoal(params)`
- `updateGoal(goalId, userId, updates)`

**Research**:
- `upsertTherapyResearch(goalId, userId, research)`
- `listTherapyResearch(goalId)`
- `getResearchForNote(noteId)`

**Notes**:
- `getNoteById(noteId, userId)`
- `getNoteBySlug(slug, userId)`
- `getAllNotesForUser(userId)`
- `listNotesForEntity(entityId, entityType, userId)`
- `createNote(params)`
- `updateNote(noteId, userId, updates)`
- `linkResearchToNote(noteId, researchIds[])`

**Questions & Stories**:
- `listTherapeuticQuestions(goalId)`
- `listGoalStories(goalId)`
- `getTextSegmentsForStory(storyId)`
- `getAudioAssetsForStory(storyId)`

**Jobs**:
- `createGenerationJob(id, userId, type, goalId)`
- `updateGenerationJob(id, updates)`
- `getGenerationJob(id)`

## AI Workflows (Mastra)

Mastra orchestrates long-running AI operations:

1. **Research Generation**:
   - Search academic databases
   - Score relevance to goal
   - Extract key findings and techniques
   - Store in therapy_research table

2. **Question Generation**:
   - Analyze goal and linked research
   - Generate reflection questions
   - Store in therapeutic_questions table

3. **Long-form Text**:
   - Synthesize therapeutic narrative
   - Support multiple languages
   - Segment for audio production

4. **Audio Production**:
   - Convert text to speech via ElevenLabs
   - Generate segmented audio
   - Store manifest with URLs

## Code Generation

### GraphQL Code Generator

Runs via `pnpm codegen` and generates:

1. **Client Hooks** (`app/__generated__/`):
   - `useGetGoalQuery`
   - `useGetGoalsQuery`
   - `useCreateGoalMutation`
   - etc.

2. **Resolver Types** (`schema/`):
   - `QueryResolvers`
   - `MutationResolvers`
   - `GoalResolvers`
   - etc.

Configuration in `codegen.ts`.

## Authentication & Authorization

Currently uses a demo user system:
- `userId` is passed as "demo-user" in queries
- Context provider in resolvers: `ctx.userId || "demo-user"`
- **TODO**: Implement proper auth (Clerk, NextAuth, etc.)

## Error Handling

- GraphQL errors are thrown and caught by Apollo
- Database errors propagate as GraphQL errors
- Client shows user-friendly error messages
- No errors currently exist in the codebase

## Performance Considerations

1. **Database**:
   - Turso is edge-optimized for low latency
   - Indexed queries (see schema.ts)
   - Connection pooling handled by LibSQL client

2. **GraphQL**:
   - Field-level resolvers prevent over-fetching
   - Type resolvers lazy-load relationships
   - Apollo Client caching reduces redundant requests

3. **UI**:
   - Dynamic imports for code splitting
   - SSR disabled for client-only components
   - Radix UI for accessible, performant components

## Development Best Practices

### Adding a New Feature

1. **Define GraphQL Schema** (`schema/schema.graphql`)
2. **Run Codegen** (`pnpm codegen`)
3. **Implement Resolver** (`schema/resolvers/`)
4. **Add Database Operations** (`src/mastra/tools/turso.tools.ts`)
5. **Create UI Component** (`app/components/`)
6. **Add Page Route** (`app/[feature]/page.tsx`)
7. **Write Operation** (`schema/operations/[Feature].graphql`)
8. **Re-run Codegen** (`pnpm codegen`)
9. **Use Generated Hook** in component

### Modifying Database Schema

1. **Edit Schema** (`src/db/schema.ts`)
2. **Push Changes** (`pnpm drizzle-kit push`)
3. **Update Tools** if needed (`turso.tools.ts`)
4. **Update Resolvers** if needed

### Testing

- Manual testing via UI
- GraphQL Playground at `/api/graphql`
- Drizzle Studio for database inspection: `pnpm drizzle-kit studio`

## Deployment

Recommended platforms:
- **Frontend**: Vercel (Next.js native)
- **Database**: Turso (already edge-distributed)
- **Environment Variables**: Configure in platform dashboard

## Future Enhancements

- [ ] Real authentication system
- [ ] Role-based access control
- [ ] Real-time collaboration
- [ ] Advanced search and filtering
- [ ] Export functionality (PDF, Markdown)
- [ ] Mobile responsive improvements
- [ ] Offline support with service workers
- [ ] Analytics and insights dashboard

## Troubleshooting

See SETUP.md for common issues and solutions.

---

For questions or contributions, please refer to the main README.md.
