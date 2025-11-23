import OpenAI from 'openai';

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
// Note: OpenAI client will be null if API key is missing - services will handle this gracefully
let openai = null;
try {
  if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({ 
      apiKey: process.env.OPENAI_API_KEY 
    });
  }
} catch (error) {
  console.error('Failed to initialize OpenAI client:', error);
}

/**
 * Creates an ephemeral Realtime session token
 * @param {object} params
 * @param {string} params.model - Model to use (e.g., 'gpt-realtime')
 * @param {string} params.voice - Voice to use (e.g., 'verse')
 * @param {string} params.instructions - System instructions for the session
 * @returns {Promise<{client_secret: string}>}
 */
export async function createRealtimeEphemeral({ model, voice, instructions }) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set. Please add it to your Replit Secrets.');
  }

  try {
    const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        voice,
        instructions,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Realtime session creation failed: ${error}`);
    }

    const data = await response.json();
    return { client_secret: data.client_secret };
  } catch (error) {
    console.error('Error creating Realtime session:', error);
    throw error;
  }
}
