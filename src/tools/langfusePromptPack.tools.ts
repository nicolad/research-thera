import { Langfuse } from "langfuse";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { generateObject } from "ai";
import { z } from "zod";
import crypto from "node:crypto";

const deepseek = createDeepSeek({ apiKey: process.env.DEEPSEEK_API_KEY });

const langfuse = new Langfuse({
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  baseUrl: process.env.LANGFUSE_BASE_URL,
});

function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function extractVars(template: string): string[] {
  const vars = new Set<string>();
  const re = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(template))) vars.add(m[1]);
  return [...vars];
}

function assertOnlyAllowedVars(
  template: string,
  allowed: string[],
  where: string,
) {
  const used = extractVars(template);
  const allowedSet = new Set(allowed);
  const unknown = used.filter((v) => !allowedSet.has(v));
  if (unknown.length) {
    throw new Error(
      `[${where}] Unknown Langfuse variables: ${unknown.join(", ")}. Allowed: ${allowed.join(", ")}`,
    );
  }
}

const REQUIRED_EXCLUSIONS = [
  "forensic",
  "legal",
  "police",
  "child",
  "witness",
  "court",
  "medical",
] as const;

function assertGuardrails(template: string, where: string) {
  const t = template.toLowerCase();

  // Must disambiguate job interview domain
  if (
    !/(job interview|employment interview|selection interview)/i.test(template)
  ) {
    throw new Error(
      `[${where}] Missing job interview disambiguation ("job interview" OR "employment interview" OR "selection interview").`,
    );
  }

  // Must include ALL explicit exclusions (not just one)
  const missing = REQUIRED_EXCLUSIONS.filter((x) => !t.includes(x));
  if (missing.length) {
    throw new Error(
      `[${where}] Missing explicit exclusions: ${missing.join(", ")}.`,
    );
  }

  // Avoid poison term (robust to whitespace/hyphen/newlines)
  if (/occupational[\s-]+therapy/i.test(template)) {
    throw new Error(
      `[${where}] Contains "occupational therapy" (must be occupational psychology / industrial-organizational psychology / I-O psychology).`,
    );
  }

  // Fail-closed for missing/short abstracts (make sure "200" is explicitly present)
  const hasAbstract = t.includes("abstract");
  const has200 = /\b200\b/.test(t);
  const hasMissingOrInsufficient =
    t.includes("missing") ||
    t.includes("insufficient") ||
    t.includes("too short") ||
    t.includes("fewer than");

  if (!(hasAbstract && has200 && hasMissingOrInsufficient)) {
    throw new Error(
      `[${where}] Missing fail-closed rule for missing/short abstracts (must reference abstract + 200 + missing/insufficient semantics).`,
    );
  }
}

const PromptPackSchema = z.object({
  plannerPrompt: z.string().min(200),
  extractorPrompt: z.string().min(200),
});

type PromptPack = z.infer<typeof PromptPackSchema>;

export type PromptRef = { name: string; version: number; label: string };
export type GoalPromptPack = {
  fingerprint: string;
  label: string;
  planner: PromptRef;
  extractor: PromptRef;
  repair: PromptRef;
};

async function safeGetTextPrompt(
  name: string,
  label: string,
): Promise<any | null> {
  try {
    // Langfuse returns latest version by default.
    return await langfuse.getPrompt(name, undefined, { type: "text", label });
  } catch {
    return null;
  }
}

function normalizeTemplate(template: string): string {
  // 1) Hard replace poison variants (spaces/newlines/hyphens)
  let out = template.replace(
    /occupational[\s-]+therapy/gi,
    "occupational psychology",
  );

  // 2) If the model uses generic "therapy" in an I-O context, prefer "psychology".
  //    Keep it conservative: only replace standalone "therapy" when NOT followed by common research words.
  out = out.replace(
    /\btherapy\b(?!\s+(research|study|intervention|treatment|program|trial))/gi,
    "psychology",
  );

  return out;
}

function ensureMetaLine(template: string, metaLine: string): string {
  if (template.includes(metaLine)) return template;
  // Append in a way that's hard to break JSON-ish prompt formatting.
  return `${template}\n\n${metaLine}\n`;
}

async function upsertLangfuseTextPrompt(params: {
  name: string;
  prompt: string;
  label: string;
}) {
  const { name, prompt, label } = params;

  try {
    // Some Langfuse setups treat this as "create or create new version".
    await langfuse.createPrompt({
      name,
      prompt,
      labels: [label],
      isActive: true,
    });
    return;
  } catch (err: any) {
    // If the SDK exposes createPromptVersion, use it as a safe fallback.
    const lfAny = langfuse as any;
    if (typeof lfAny.createPromptVersion === "function") {
      await lfAny.createPromptVersion({
        name,
        prompt,
        labels: [label],
        isActive: true,
      });
      return;
    }
    throw err;
  }
}

/**
 * Ensures goal-specific prompts exist in Langfuse.
 * - If missing OR signature mismatch => generate with OpenAI + create new prompt version.
 * - Else reuse existing latest version.
 */
export async function ensureLangfusePromptPackForGoal(params: {
  goalId: number;
  goalTitle: string;
  goalDescription: string;
  notes: string[];
  label?: string; // e.g. "production" | "staging"
}) {
  const {
    goalId,
    goalTitle,
    goalDescription,
    notes,
    label = "production",
  } = params;

  const goalSignature = sha256(
    JSON.stringify({ goalId, goalTitle, goalDescription, notes }),
  );

  const plannerName = `research.plan.goal_${goalId}`;
  const extractorName = `research.extract.goal_${goalId}`;
  const metaLine = `META_GOAL_SIGNATURE=${goalSignature}`;

  const existingPlanner = await safeGetTextPrompt(plannerName, label);
  const existingExtractor = await safeGetTextPrompt(extractorName, label);

  const plannerOk = Boolean(existingPlanner?.prompt?.includes(metaLine));
  const extractorOk = Boolean(existingExtractor?.prompt?.includes(metaLine));

  if (plannerOk && extractorOk) {
    console.log("✅ Reusing existing Langfuse prompts (signature match)");
    return {
      plannerPromptName: plannerName,
      extractorPromptName: extractorName,
      goalSignature,
      createdNewVersion: false,
    };
  }

  console.log("🔄 Generating new Langfuse prompt templates with OpenAI...");

  // Allowed variables for Langfuse mustache templates
  const plannerVars = [
    "goalTitle",
    "goalDescription",
    "notes",
    "timeHorizonDays",
    "roleFamily",
  ];
  const extractorVars = [
    "goalTitle",
    "goalDescription",
    "goalType",
    "paperTitle",
    "paperAuthors",
    "paperYear",
    "paperVenue",
    "paperDoi",
    "paperUrl",
    "paperAbstract",
  ];

  let pack: PromptPack | null = null;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`  Attempt ${attempt}/3...`);

      const { object } = await generateObject({
        model: deepseek("deepseek-chat"),
        temperature: 1.0, // lower variance => fewer guardrail violations
        schema: PromptPackSchema,
        prompt: `
You are generating Langfuse Prompt Management TEXT templates for ONE specific workplace/career goal.

Context for writing good templates:
Goal Title: ${goalTitle}
Goal Description: ${goalDescription}
Notes:
- ${notes.join("\n- ")}

TASK
Generate two Langfuse TEXT prompt templates (strings) that use ONLY {{variables}}.

TEMPLATE A: plannerPrompt
- Input variables allowed: ${plannerVars.map((v) => `{{${v}}}`).join(", ")}
- Output: JSON for a research query plan for job interview self-advocacy (NOT clinical therapy).
- Must include these exact phrases: "job interview" OR "employment interview" OR "selection interview"
- Must explicitly mention excluding: forensic, legal, police, child, witness, court, and medical diagnostic contexts (LIST ALL TERMS)
- CRITICAL: Use "occupational psychology" or "industrial-organizational psychology" or "I-O psychology" NEVER "occupational therapy"
- Must instruct: produce MULTIPLE smaller queries (query pack) rather than one long query
- Must include fail-closed rule: abstract < 200 characters OR missing => reject (mention 200 explicitly)

TEMPLATE B: extractorPrompt
- Input variables allowed: ${extractorVars.map((v) => `{{${v}}}`).join(", ")}
- Output: STRICT-FORMAT JSON extraction for career interview self-advocacy evidence (NOT clinical therapy).
- REQUIRED JSON FIELDS (all must be present):
  * domain: enum ["io_psych", "career_coaching", "communication_training", "other"]
  * paperMeta: {title, authors[], year, venue, doi, url}
  * studyType: enum ["meta-analysis", "RCT", "field study", "lab study", "quasi-experimental", "review", "other"]
  * populationContext, interventionOrSkill: strings or null
  * keyFindings: array of strings (3-5)
  * evidenceSnippets: array of {findingIndex: number, snippet: string}
  * practicalTakeaways: array of strings (2-4)
  * relevanceScore: number 0-1
  * confidence: number 0-1
  * rejectReason: string or null (use if relevanceScore < 0.5)
- MUST include explicit fail-closed rule stating:
  "If abstract is missing or has fewer than 200 characters, return empty extraction with relevanceScore=0 and confidence=0 and rejectReason='insufficient_abstract'"
- Must explicitly exclude: forensic, legal, police, child, witness, court, medical diagnostic interview domains (LIST ALL TERMS)
- CRITICAL: Use "occupational psychology" or "industrial-organizational psychology" NEVER "occupational therapy"

CRITICAL REQUIREMENTS FOR BOTH TEMPLATES:
1. NEVER use the phrase "occupational therapy" (including "occupational-therapy" or with newlines/spaces) - use "occupational psychology" or "I-O psychology" instead
2. Must explicitly list exclusion terms: forensic, legal, police, child, witness, court, medical
3. Must specify job/employment/selection interview context
4. Must include fail-closed rule for abstracts < 200 characters or missing (mention 200 explicitly)
5. Include the literal string "${metaLine}" in BOTH templates
6. Do NOT include any mustache variables besides: ${[...new Set([...plannerVars, ...extractorVars])].map((v) => `{{${v}}}`).join(", ")}

Return JSON with keys: plannerPrompt, extractorPrompt.
        `.trim(),
      });

      let candidate: PromptPack = object;

      // Normalize + force signature line
      candidate.plannerPrompt = ensureMetaLine(
        normalizeTemplate(candidate.plannerPrompt),
        metaLine,
      );
      candidate.extractorPrompt = ensureMetaLine(
        normalizeTemplate(candidate.extractorPrompt),
        metaLine,
      );

      // Validate templates
      assertOnlyAllowedVars(
        candidate.plannerPrompt,
        plannerVars,
        "plannerPrompt",
      );
      assertOnlyAllowedVars(
        candidate.extractorPrompt,
        extractorVars,
        "extractorPrompt",
      );

      assertGuardrails(candidate.plannerPrompt, "plannerPrompt");
      assertGuardrails(candidate.extractorPrompt, "extractorPrompt");

      pack = candidate;
      console.log(`  ✅ Valid prompts generated on attempt ${attempt}`);
      break;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.log(`  ⚠️  Attempt ${attempt} failed: ${lastError.message}`);

      if (attempt === 3) {
        console.error(
          `  ❌ All 3 attempts failed. Last error: ${lastError.message}`,
        );
        throw lastError;
      }

      await new Promise((resolve) => setTimeout(resolve, 700));
    }
  }

  if (!pack) {
    throw new Error("Failed to generate valid prompts after 3 attempts");
  }

  console.log("✅ Templates validated, saving to Langfuse...");

  await upsertLangfuseTextPrompt({
    name: plannerName,
    prompt: pack.plannerPrompt,
    label,
  });

  await upsertLangfuseTextPrompt({
    name: extractorName,
    prompt: pack.extractorPrompt,
    label,
  });

  await langfuse.flushAsync();

  console.log(`✅ Saved ${plannerName} and ${extractorName} to Langfuse`);

  return {
    plannerPromptName: plannerName,
    extractorPromptName: extractorName,
    goalSignature,
    createdNewVersion: true,
  };
}

export const langfusePromptPackTools = {
  ensure: ensureLangfusePromptPackForGoal,
};
