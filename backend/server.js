import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';
import { createRealtimeEphemeral } from './services/realtimeSession.js';
import { analyzeGrammar } from './services/grammarOracle.js';
import { transcribeAudio } from './services/transcriber.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Configure multer for file uploads (25 MB limit)
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 25 * 1024 * 1024 } // 25 MB
});

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// GET /config - Returns configuration for the frontend
app.get('/config', (req, res) => {
  res.json({
    realtimeModel: 'gpt-realtime',
    realtimeVoice: 'verse',
    grammarModel: 'gpt-5-mini',
    transcribeModel: 'gpt-4o-transcribe',
    correctionsEnabled: true,
    readCorrectionsAloud: true
  });
});

// POST /session - Creates a Realtime session
app.post('/session', async (req, res) => {
  try {
    // Read the realtime prompt
    const promptPath = path.join(__dirname, '../prompts/realtime-prompt.md');
    const instructions = fs.readFileSync(promptPath, 'utf-8');

    const { client_secret } = await createRealtimeEphemeral({
      model: 'gpt-realtime',
      voice: 'verse',
      instructions
    });

    res.json({ client_secret });
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ 
      error: 'Failed to create session',
      message: error.message 
    });
  }
});

// POST /correct - Analyzes text for grammar errors
app.post('/correct', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ 
        error: 'Invalid request',
        message: 'Text field is required and must be a string' 
      });
    }

    const result = await analyzeGrammar(text);
    res.json(result);
  } catch (error) {
    console.error('Error analyzing grammar:', error);
    
    // Return conservative fallback on error
    res.json({
      is_error: false,
      error: req.body.text,
      fix: req.body.text,
      reason: "Está bien dicho."
    });
  }
});

// POST /transcribe - Transcribes audio to text
app.post('/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        error: 'Invalid request',
        message: 'Audio file is required' 
      });
    }

    const result = await transcribeAudio(req.file.path);
    res.json(result);
  } catch (error) {
    console.error('Error transcribing audio:', error);
    res.status(500).json({ 
      error: 'Failed to transcribe audio',
      message: error.message 
    });
  }
});

// Serve static frontend files
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

// Fallback to index.html for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
