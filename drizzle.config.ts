import type { Config } from "drizzle-kit";
import { TURSO_DATABASE_URL, TURSO_AUTH_TOKEN } from "./src/config/turso";

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "turso",
  dbCredentials: {
    url: TURSO_DATABASE_URL,
    authToken: TURSO_AUTH_TOKEN!,
  },
} satisfies Config;
