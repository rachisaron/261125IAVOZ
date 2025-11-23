import OpenAI from 'openai';
import fs from 'fs';

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

/**
 * Transcribes audio file to Spanish text
 * @param {string} audioFilePath - Path to audio file
 * @returns {Promise<{transcript: string}>}
 */
export async function transcribeAudio(audioFilePath) {
  try {
    const audioReadStream = fs.createReadStream(audioFilePath);

    const transcription = await openai.audio.transcriptions.create({
      file: audioReadStream,
      model: 'gpt-4o-transcribe',
      language: 'es'
    });

    return {
      transcript: transcription.text
    };
  } catch (error) {
    console.error('Error transcribing audio:', error);
    throw error;
  } finally {
    // Clean up the uploaded file
    try {
      fs.unlinkSync(audioFilePath);
    } catch (cleanupError) {
      console.error('Error cleaning up audio file:', cleanupError);
    }
  }
}
