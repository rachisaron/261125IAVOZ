import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import multer from "multer";

import { createRealtimeEphemeral } from "./services/realtimeSession.js";
import { runGrammarOracle } from "./services/grammarOracle.js";
import { transcribeOnce } from "./services/transcriber.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

// Static files (frontend)
app.use("/", express.static(path.join(__dirname, "..", "frontend")));

// ---- CONFIG ----
const CONFIG = {
  realtimeModel: "gpt-realtime",

  realtimeVoice: "verse", // o la mejor voz actual disponible
  grammarModel: "gpt-5-mini",
  transcribeModel: "gpt-4o-transcribe",
  correctionsEnabled: true,
  readCorrectionsAloud: true,
  realtimeTemperature: Number(process.env.REALTIME_TEMPERATURE ?? 0.6),
};

app.get("/config", (_req, res) => {
  res.json(CONFIG);
});

// ---- SESSION (Realtime) ----
app.post("/session", async (_req, res) => {
  try {
    const promptPath = path.join(
      __dirname,
      "..",
      "prompts",
      "realtime-prompt.md",
    );
    const instructions = await fs.readFile(promptPath, "utf8");

    const { client_secret } = await createRealtimeEphemeral({
      model: CONFIG.realtimeModel,
      voice: CONFIG.realtimeVoice,
      instructions,
    });

    res.json({ client_secret });
  } catch (err) {
    console.error("SESSION ERROR:", err);
    res.status(500).json({ error: "Failed to create Realtime session" });
  }
});

// ---- CORRECT (Grammar Oracle) ----
app.post("/correct", async (req, res) => {
  try {
    const { text } = req.body || {};
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Missing text" });
    }
    const result = await runGrammarOracle(text);
    res.json(result);
  } catch (err) {
    console.error("CORRECT ERROR:", err);
    // Fallback conservative
    res.json({
      is_error: false,
      error: req.body?.text || "",
      fix: req.body?.text || "",
      reason: "Está bien dicho.",
    });
  }
});

// ---- TRANSCRIBE (gpt-4o-transcribe) ----
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

app.post("/transcribe", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Missing audio file" });
    const transcript = await transcribeOnce(req.file.buffer, req.file.mimetype);
    res.json({ transcript });
  } catch (err) {
    console.error("TRANSCRIBE ERROR:", err);
    res.status(500).json({ error: "Transcription failed" });
  }
});

// ---- SPA fallback ----
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "..", "frontend", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Profe ELE – IA Voz server running on http://localhost:${PORT}`);
});
