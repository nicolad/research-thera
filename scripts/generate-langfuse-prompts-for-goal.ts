import "dotenv/config";
import { z } from "zod";
import { generateObject } from "ai";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { Langfuse } from "langfuse";

/**
 * Generates goal-specific Langfuse prompts using DeepSeek,
 * then saves them into Langfuse Prompt Management as new versions.
 *
 * Requirements:
 * - DeepSeek: DEEPSEEK_API_KEY
 * - Langfuse: LANGFUSE_PUBLIC_KEY, LANGFUSE_SECRET_KEY, LANGFUSE_BASE_URL
 *
 * Run:
 *   pnpm exec tsx scripts/generate-langfuse-prompts-for-goal.ts
 *
 * Optional env overrides:
 *   GOAL_TITLE, GOAL_DESCRIPTION, GOAL_NOTES
 *   LANGFUSE_LABEL (default: "staging")
 *   PROMPT_NAME_PREFIX (default: "goal")
 */

const deepseek = createDeepSeek({
  apiKey: process.env.DEEPSEEK_API_KEY,
});

const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY!,
  secretKey: process.env.LANGFUSE_SECRET_KEY!,
  baseUrl: process.env.LANGFUSE_BASE_URL!,
});

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const PromptTypeSchema = z.union([z.literal("text"), z.literal("chat")]);

const LangfusePromptDefSchema = z.object({
  name: z.string().min(3),
  type: PromptTypeSchema,
  // Langfuse text prompts: string
  // Langfuse chat prompts: [{ role, content }, ...]
  prompt: z.union([
    z.string(),
    z.array(
      z.object({
        role: z.enum(["system", "user", "assistant"]),
        content: z.string(),
      }),
    ),
  ]),
  labels: z.array(z.string()).min(1),
  // Optional config stored with prompt version (model params, schemas, etc.)
  config: z.record(z.any()).optional(),
});

const GeneratedBundleSchema = z.object({
  goalSlug: z.string(),
  prompts: z.array(LangfusePromptDefSchema).min(2),
});

type GeneratedBundle = z.infer<typeof GeneratedBundleSchema>;

async function generateLangfusePrompts(params: {
  goalTitle: string;
  goalDescription: string;
  notes: string;
  label: string;
  promptNamePrefix: string;
}): Promise<GeneratedBundle> {
  const { goalTitle, goalDescription, notes, label, promptNamePrefix } = params;
  const goalSlug = slugify(goalTitle);
  const baseName = `${promptNamePrefix}/${goalSlug}`;

  /**
   * IMPORTANT:
   * - We are generating Langfuse prompt templates, so the model must output `{{variable}}` placeholders literally.
   * - These prompts are for CAREER INTERVIEW self-advocacy (NOT clinical therapy).
   */
  const { object } = await generateObject({
    model: deepseek("deepseek-chat"),
    schema: GeneratedBundleSchema,
    temperature: 0.2,
    prompt: `
You are an expert prompt engineer. Generate Langfuse Prompt Management templates for a SPECIFIC GOAL.

GOAL
Title: ${goalTitle}
Description: ${goalDescription}
Notes: ${notes}

OUTPUT FORMAT
Return ONLY valid JSON matching this schema:
{
  "goalSlug": "string",
  "prompts": [
    {
      "name": "string",
      "type": "text" | "chat",
      "prompt": "string" | [{"role":"system"|"user"|"assistant","content":"string"}],
      "labels": ["string", ...],
      "config": { ...optional JSON... }
    }
  ]
}

HARD REQUIREMENTS
- These prompts will be SAVED IN LANGFUSE. They must use Langfuse variables in the form {{variable}}.
- Do NOT replace variables with actual values. Keep placeholders literally like {{goalTitle}}.
- Create EXACTLY TWO prompts:
  1) Planner prompt: produces JSON "plan" for query-pack retrieval (many small queries).
  2) Extractor prompt: extracts structured evidence for this goal (NOT therapy).
- Both prompts MUST enforce domain: "job/employment/selection interview" only.
- Both prompts MUST exclude: forensic, legal, police, child, witness, court, abuse, medical diagnostic, interrogation.
- Avoid the term "occupational therapy". Use "occupational psychology" / "industrial-organizational psychology" when needed.
- Include fail-closed rule: if abstract missing or < 200 chars => reject with reason "insufficient_abstract".

VARIABLES TO USE (planner)
{{goalTitle}}, {{goalDescription}}, {{notes}}
Return plan JSON containing:
- track: "career_interview_self_advocacy"
- mustHavePhrases
- exclusionTerms
- clusters (self_presentation, interview_training, structured_interviews, confidence_self_efficacy, storytelling_impact)
- semanticScholarQueries (6-12)
- openAlexQueries (4-8)
- relevanceRubric
- antiRelevanceRubric

VARIABLES TO USE (extractor)
{{goalTitle}}, {{goalDescription}}, {{track}}
{{paperTitle}}, {{paperAuthors}}, {{paperYear}}, {{paperVenue}}, {{paperDoi}}, {{paperUrl}}, {{paperAbstract}}

Extractor output JSON keys:
- track
- paperMeta { title, authors[], year|null, venue|null, doi|null, url|null }
- studyType
- populationContext
- interventionOrSkill
- keyFindings (0-6)
- practicalTakeaways (0-6 mapped to impact stories + ownership + metrics + alignment question)
- relevanceScore 0..1
- confidence 0..1
- rejectReason ("" | "insufficient_abstract" | "wrong_domain" | "not_actionable_for_goal")

NAMING
Use these names exactly:
- ${baseName}/planner
- ${baseName}/extractor

LABELS
Use labels: ["${label}","generated","career-interview"]

CONFIG
Set config.model="deepseek-chat" and config.temperature=0.2 for both prompts.

Now generate the two Langfuse prompt templates.
`.trim(),
  });

  return object;
}

async function saveToLangfuse(bundle: GeneratedBundle) {
  // Creating a prompt with an existing name creates a new version in Langfuse.
  for (const p of bundle.prompts) {
    if (p.type === "text") {
      await langfuse.createPrompt({
        name: p.name,
        type: "text",
        prompt: p.prompt as string,
        labels: p.labels,
        config: p.config,
      });
    } else if (p.type === "chat") {
      await langfuse.createPrompt({
        name: p.name,
        type: "chat",
        prompt: p.prompt as Array<{
          role: "system" | "user" | "assistant";
          content: string;
        }>,
        labels: p.labels,
        config: p.config,
      });
    }
    console.log(
      `✅ Saved prompt version: ${p.name} [labels=${p.labels.join(",")}]`,
    );
  }
}

async function main() {
  // Validate required env
  requireEnv("DEEPSEEK_API_KEY");
  requireEnv("LANGFUSE_PUBLIC_KEY");
  requireEnv("LANGFUSE_SECRET_KEY");
  requireEnv("LANGFUSE_BASE_URL");

  const goalTitle =
    process.env.GOAL_TITLE ?? "Advocating for Yourself in Interviews";

  const goalDescription =
    process.env.GOAL_DESCRIPTION ??
    "Build a short, repeatable pitch that makes it obvious what I owned, what changed because of my work, and why that matters for the role. Produce 3 impact stories, and a 30–45 second self-advocacy script with an alignment question.";

  const notes =
    process.env.GOAL_NOTES ??
    "- Audience: hiring manager / recruiter\n- Domain: software engineering interviews\n- Need: ownership language + quantified impact + clear outcomes\n- Constraint: under 45 seconds";

  const label = process.env.LANGFUSE_LABEL ?? "staging";
  const promptNamePrefix = process.env.PROMPT_NAME_PREFIX ?? "goal";

  console.log("🧠 Generating Langfuse prompts via DeepSeek...");
  const bundle = await generateLangfusePrompts({
    goalTitle,
    goalDescription,
    notes,
    label,
    promptNamePrefix,
  });

  console.log(`🧾 Generated prompts for goalSlug=${bundle.goalSlug}`);
  console.log("   Prompts:", bundle.prompts.map((p) => p.name).join(", "));
  console.log("\n☁️ Saving prompts into Langfuse...");
  await saveToLangfuse(bundle);

  console.log("\n🎉 Done! Prompts are now versioned in Langfuse.");
  console.log(
    "   Use labels for controlled rollout: 'staging', 'production', etc.",
  );
}

main().catch((err) => {
  console.error("❌ Failed:", err.message);
  process.exit(1);
});
