import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import OpenAI from "openai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Strict JSON schema to avoid hallucinated fields
const schema = {
  name: "CorrectionSchema",
  schema: {
    type: "object",
    properties: {
      is_error: { type: "boolean" },
      error: { type: "string" },
      fix: { type: "string" },
      reason: { type: "string" },
    },
    required: ["is_error", "error", "fix", "reason"],
    additionalProperties: false,
  },
  strict: true,
};

// Modificada para aceptar contexto
export async function runGrammarOracle(userText, contextStr = "") {
  const promptPath = path.join(
    __dirname,
    "..",
    "..",
    "prompts",
    "grammar-oracle-prompt.md",
  );
  const systemPrompt = await fs.readFile(promptPath, "utf8");

  // Construimos el input combinado
  const combinedInput = `
CONTEXTO PREVIO (Lo que dijo el profesor):
"${contextStr || "(Ninguno)"}"

FRASE DEL ALUMNO A ANALIZAR:
"${userText}"
`.trim();

  const response = await openai.responses.create({
    model: "gpt-5-mini",
    reasoning: { effort: "low" },
    // System instructions + user text
    instructions: systemPrompt,
    input: combinedInput, // Enviamos todo junto
    text: {
      format: {
        type: "json_schema",
        name: schema.name,
        schema: schema.schema,
        strict: schema.strict,
      },
    },
  });

  const raw = response.output_text || "{}";
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (_e) {
    // Fallback conservative
    parsed = {
      is_error: false,
      error: userText,
      fix: userText,
      reason: "Está bien dicho.",
    };
  }
  // Guardrail
  if (
    typeof parsed.is_error !== "boolean" ||
    typeof parsed.error !== "string" ||
    typeof parsed.fix !== "string" ||
    typeof parsed.reason !== "string"
  ) {
    parsed = {
      is_error: false,
      error: userText,
      fix: userText,
      reason: "Está bien dicho.",
    };
  }
  return parsed;
}
