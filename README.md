# ResearchThera

**Research-backed therapy notes and reflections powered by AI**

ResearchThera is a comprehensive platform for creating and managing therapeutic goals with AI-powered research integration, claim verification, and evidence-based insights. The application connects therapy notes with peer-reviewed research to provide scientifically-grounded therapeutic guidance.

## Features

### 🎯 Goal Management
- Create and track therapeutic goals
- Priority and status management (Active, Completed, Paused, Archived)
- Target date tracking
- Family member association
- Rich descriptions and metadata

### 📝 Notes & Reflections
- Create detailed therapy notes linked to goals
- Tag-based organization
- Markdown-supported content
- Automatic slug generation
- Link notes to research papers

### 🔬 Research Integration
- Connect goals with peer-reviewed research papers
- Search across multiple academic databases:
  - CrossRef
  - PubMed
  - Semantic Scholar
  - OpenAlex
  - arXiv
  - Europe PMC
  - DataCite
- Automatic relevance scoring
- Evidence level tracking
- Key findings and therapeutic techniques extraction

### ✅ Claim Verification
- AI-powered claim card generation from notes
- Evidence-based verification against research literature
- Support/contradiction/mixed verdict determination
- Confidence scoring
- Detailed provenance tracking

### 🎙️ Audio & Long-form Content
- Generate therapeutic guidance text
- Multi-language support
- Text-to-speech audio generation
- Audio segmentation and manifest tracking
- Story-based therapeutic narratives

### 📊 Generation Jobs
- Asynchronous research generation
- Therapeutic question generation
- Long-form text synthesis
- Audio production jobs
- Progress tracking and error handling

## Tech Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **React 19** - UI library
- **Apollo Client** - GraphQL client
- **Radix UI** - Accessible component primitives
- **TypeScript** - Type safety

### Backend
- **Apollo Server** - GraphQL server
- **Turso (LibSQL)** - Edge database
- **Drizzle ORM** - Type-safe database queries
- **Mastra** - AI workflow orchestration

### AI & Services
- **OpenAI** - LLM for text generation
- **DeepSeek** - Alternative LLM provider
- **ElevenLabs** - Text-to-speech
- **GraphQL Code Generator** - Type-safe operations

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm (recommended) or npm
- Turso account and database
- OpenAI API key
- ElevenLabs API key (for audio features)

### Environment Variables

Create a `.env.local` file in the root directory:

```bash
# Database
TURSO_DATABASE_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=your-auth-token

# AI Services
OPENAI_API_KEY=your-openai-key
DEEPSEEK_API_KEY=your-deepseek-key
ELEVENLABS_API_KEY=your-elevenlabs-key

# Optional: Mastra Configuration
MASTRA_API_URL=http://localhost:3000
```

### Installation

```bash
# Install dependencies
pnpm install

# Run database migrations
pnpm drizzle-kit push

# Generate GraphQL types
pnpm codegen

# Start development server
pnpm dev
```

The application will be available at `http://localhost:3000`.

### Development Workflow

1. **Start the Next.js dev server:**
   ```bash
   pnpm dev
   ```

2. **Run Mastra in development mode (for AI workflows):**
   ```bash
   pnpm mastra:dev
   ```

3. **Generate GraphQL types after schema changes:**
   ```bash
   pnpm codegen
   ```

## Database Schema

The application uses SQLite (Turso) with the following main tables:

- **goals** - Therapeutic goals with status, priority, and metadata
- **therapy_research** - Research papers linked to goals
- **therapeutic_questions** - AI-generated questions for reflection
- **notes** - User notes and reflections
- **notes_research** - Many-to-many link between notes and research
- **claim_cards** - Claim verification with evidence
- **notes_claims** - Link between notes and claim cards
- **goal_stories** - Long-form therapeutic narratives
- **text_segments** - Segmented text for audio generation
- **audio_assets** - Generated audio files with manifests
- **generation_jobs** - Async job tracking

## GraphQL API

The GraphQL API is available at `/api/graphql` with the following main operations:

### Queries
- `goals` - List all goals with filters
- `goal` - Get single goal with details
- `research` - Get research papers for a goal
- `therapeuticQuestions` - Get questions for a goal
- `notes` - Get notes for an entity
- `allNotes` - Get all notes for a user
- `note` - Get single note by ID or slug
- `generationJob` - Get job status
- `claimCard` - Get claim verification card
- `claimCardsForNote` - Get all claims for a note

### Mutations
- `createGoal` / `updateGoal` / `deleteGoal` - Goal management
- `createNote` / `updateNote` / `deleteNote` - Note management
- `generateResearch` - Generate research papers for a goal
- `generateTherapeuticQuestions` - Generate reflection questions
- `generateLongFormText` - Create therapeutic narrative
- `generateAudio` - Produce audio from text
- `buildClaimCards` - Create claim verification cards
- `checkNoteClaims` - Verify claims in a note

### Subscriptions
- `researchJobStatus` - Real-time research job updates
- `audioJobStatus` - Real-time audio generation updates

## Project Structure

```
.
├── app/                      # Next.js app directory
│   ├── api/graphql/         # Apollo Server endpoint
│   ├── goals/               # Goals pages
│   ├── notes/               # Notes pages
│   ├── components/          # React components
│   ├── providers/           # Context providers
│   └── __generated__/       # Generated GraphQL hooks
├── schema/                   # GraphQL schema & resolvers
│   ├── schema.graphql       # Schema definition
│   ├── operations/          # Client operations
│   ├── resolvers/           # Type resolvers
│   └── types/               # Generated TypeScript types
├── src/
│   ├── db/                  # Database schema (Drizzle)
│   ├── mastra/              # AI workflows and tools
│   └── voice/               # Voice generation utilities
└── scripts/                 # Utility scripts
```

## Features in Detail

### Goal Management
Goals are the central entity in ResearchThera. Each goal can have:
- Multiple research papers
- Reflection questions
- Personal notes
- Therapeutic stories
- Generated audio content

### Claim Verification
The claim verification system:
1. Extracts claims from user notes
2. Searches academic databases for relevant papers
3. Uses AI to judge evidence support/contradiction
4. Generates confidence scores
5. Provides detailed provenance information

### Research Integration
Research papers are automatically:
- Scored for relevance to goals
- Tagged with therapeutic techniques
- Linked to generated questions
- Connected to claim verification

## Contributing

This is a private project. Please contact the maintainers for contribution guidelines.

## License

Proprietary - All rights reserved

## Support

For questions or support, please open an issue in the repository.

---

Built with ❤️ using Next.js, GraphQL, and AI
