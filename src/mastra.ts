import { createLogger } from "@mastra/core/logger";
import { Mastra } from "@mastra/core/mastra";
import { LibSQLStore, LibSQLVector } from "@mastra/libsql";

import { storyTellerAgent, therapeuticAgent } from "./agents";
import { generateTherapyResearchWorkflow } from "@/src/workflows";
import { TURSO_DATABASE_URL, TURSO_AUTH_TOKEN } from "@/src/config/turso";

// Suppress AI SDK warnings (DeepSeek JSON schema compatibility mode)
if (typeof globalThis !== "undefined") {
  (globalThis as any).AI_SDK_LOG_WARNINGS = false;
}

// Configure libSQL storage for message history, traces, and evals
const storage = new LibSQLStore({
  id: "mastra-store",
  url: TURSO_DATABASE_URL,
  authToken: TURSO_AUTH_TOKEN,
});

// Configure libSQL vectors for RAG (goal context, research, notes)
const vectors = {
  goalContext: new LibSQLVector({
    id: "goal-context-v1",
    url: TURSO_DATABASE_URL,
    authToken: TURSO_AUTH_TOKEN,
  }),
};

export const mastra = new Mastra({
  agents: {
    storyTellerAgent,
    therapeuticAgent,
  },
  storage,
  vectors,
  workflows: {
    generateTherapyResearchWorkflow,
  },
  logger: createLogger({
    name: "Mastra",
    level: "info",
  }),
});
