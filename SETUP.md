# ResearchThera Quick Start Guide

## Prerequisites

Before you begin, make sure you have:

- Node.js 20 or higher installed
- pnpm installed (`npm install -g pnpm`)
- A Turso account (https://turso.tech)
- OpenAI API key
- (Optional) ElevenLabs API key for audio features

## Step 1: Clone and Install

```bash
cd ai-therapist
pnpm install
```

## Step 2: Set Up Turso Database

1. Install Turso CLI:
   ```bash
   curl -sSfL https://get.tur.so/install.sh | bash
   ```

2. Create a new database:
   ```bash
   turso db create research-thera
   ```

3. Get your database URL:
   ```bash
   turso db show research-thera --url
   ```

4. Create an auth token:
   ```bash
   turso db tokens create research-thera
   ```

## Step 3: Configure Environment Variables

Create a `.env.local` file in the project root:

```bash
# Copy from example
cp .env.example .env.local
```

Edit `.env.local` and add your credentials:

```bash
TURSO_DATABASE_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=your-auth-token
OPENAI_API_KEY=sk-your-openai-key
```

## Step 4: Initialize Database Schema

Run Drizzle migrations to create all tables:

```bash
pnpm drizzle-kit push
```

This will create all the necessary tables:
- goals
- therapy_research
- therapeutic_questions
- notes
- notes_research
- claim_cards
- notes_claims
- goal_stories
- text_segments
- audio_assets
- generation_jobs

## Step 5: Generate GraphQL Types

Generate TypeScript types from your GraphQL schema:

```bash
pnpm codegen
```

This will generate:
- Client-side hooks in `app/__generated__/`
- Server-side resolver types in `schema/`

## Step 6: Start Development Server

```bash
pnpm dev
```

Open http://localhost:3000 in your browser.

## Step 7: (Optional) Run Mastra for AI Workflows

In a separate terminal, start the Mastra development server for AI workflows:

```bash
pnpm mastra:dev
```

## Verify Installation

Visit these pages to verify everything works:

1. **Home Page**: http://localhost:3000
   - Should show the landing page with feature cards

2. **Goals Page**: http://localhost:3000/goals
   - Should display an empty goals list (no errors)

3. **Notes Page**: http://localhost:3000/notes
   - Should display an empty notes list (no errors)

4. **GraphQL Playground**: http://localhost:3000/api/graphql
   - Should show the GraphQL endpoint (may need browser extension)

## Common Issues

### "TURSO_DATABASE_URL environment variable is required"

Make sure your `.env.local` file is in the project root and contains the correct environment variables.

### TypeScript errors in __generated__ folder

Run `pnpm codegen` to regenerate the GraphQL types.

### Database schema mismatch

Run `pnpm drizzle-kit push` to sync your schema with the database.

### Port 3000 already in use

Change the port in package.json:
```json
"dev": "next dev -p 3001"
```

## Next Steps

1. **Create a Goal**: Visit `/goals` and create your first therapeutic goal
2. **Add Notes**: Navigate to a goal and add notes/reflections
3. **Explore Research**: Use the research generation features
4. **Verify Claims**: Try the claim verification system on your notes

## Development Workflow

### When you modify the GraphQL schema:

1. Edit `schema/schema.graphql`
2. Run `pnpm codegen` to regenerate types
3. Implement any new resolvers in `schema/resolvers/`

### When you modify the database schema:

1. Edit `src/db/schema.ts`
2. Run `pnpm drizzle-kit push` to update the database
3. Update any affected queries in `src/mastra/tools/turso.tools.ts`

### When you add new GraphQL operations:

1. Create a `.graphql` file in `schema/operations/`
2. Run `pnpm codegen` to generate hooks
3. Use the generated hooks in your components

## Useful Commands

```bash
# Development
pnpm dev              # Start Next.js dev server
pnpm mastra:dev       # Start Mastra dev server

# Building
pnpm build            # Build for production
pnpm start            # Start production server

# Code Generation
pnpm codegen          # Generate GraphQL types

# Database
pnpm drizzle-kit push       # Push schema changes
pnpm drizzle-kit studio     # Open Drizzle Studio

# Linting
pnpm lint             # Run ESLint
```

## Support

For issues or questions:
- Check the README.md for detailed documentation
- Review the GraphQL schema in `schema/schema.graphql`
- Examine resolver implementations in `schema/resolvers/`

Happy coding! 🚀
