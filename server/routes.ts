import express, { type Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createRealtimeEphemeral } from "../backend/services/realtimeSession.js";
import { analyzeGrammar } from "../backend/services/grammarOracle.js";
import { transcribeAudio } from "../backend/services/transcriber.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for file uploads (25 MB limit)
const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
});

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // GET /config - Returns configuration for the frontend
  app.get("/config", (req, res) => {
    res.json({
      realtimeModel: "gpt-realtime",
      realtimeVoice: "verse",
      grammarModel: "gpt-5-mini",
      transcribeModel: "gpt-4o-transcribe",
      correctionsEnabled: true,
      readCorrectionsAloud: true,
    });
  });

  // POST /session - Creates a Realtime session
  app.post("/session", async (req, res) => {
    try {
      // Read the realtime prompt
      const promptPath = path.join(__dirname, "../prompts/realtime-prompt.md");
      const instructions = fs.readFileSync(promptPath, "utf-8");

      const { client_secret } = await createRealtimeEphemeral({
        model: "gpt-realtime",
        voice: "verse",
        instructions,
      });

      res.json({ client_secret });
    } catch (error: any) {
      console.error("Error creating session:", error);
      res.status(500).json({
        error: "Failed to create session",
        message: error.message,
      });
    }
  });

  // POST /correct - Analyzes text for grammar errors
  app.post("/correct", async (req, res) => {
    try {
      const { text } = req.body;

      if (!text || typeof text !== "string") {
        return res.status(400).json({
          error: "Invalid request",
          message: "Text field is required and must be a string",
        });
      }

      const result = await analyzeGrammar(text);
      res.json(result);
    } catch (error: any) {
      console.error("Error analyzing grammar:", error);

      // Return conservative fallback on error
      res.json({
        is_error: false,
        error: req.body.text,
        fix: req.body.text,
        reason: "Está bien dicho.",
      });
    }
  });

  // POST /transcribe - Transcribes audio to text
  app.post("/transcribe", upload.single("audio"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: "Invalid request",
          message: "Audio file is required",
        });
      }

      const result = await transcribeAudio(req.file.path);
      res.json(result);
    } catch (error: any) {
      console.error("Error transcribing audio:", error);
      res.status(500).json({
        error: "Failed to transcribe audio",
        message: error.message,
      });
    }
  });

  // Serve static frontend files from the frontend directory
  const frontendPath = path.join(__dirname, "../frontend");
  app.use("/app", express.static(frontendPath));

  // Redirect root to /app
  app.get("/", (req, res) => {
    res.redirect("/app");
  });

  const httpServer = createServer(app);

  return httpServer;
}
