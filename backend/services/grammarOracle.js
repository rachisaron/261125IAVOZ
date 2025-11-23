import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

// JSON schema for strict response format
const grammarResponseSchema = {
  type: "object",
  properties: {
    is_error: {
      type: "boolean",
      description: "Whether there is a grammatical error"
    },
    error: {
      type: "string",
      description: "The original sentence from the student"
    },
    fix: {
      type: "string",
      description: "The corrected sentence (same as error if no error)"
    },
    reason: {
      type: "string",
      description: "Brief explanation in Spanish (8-10 words max)"
    }
  },
  required: ["is_error", "error", "fix", "reason"],
  additionalProperties: false
};

/**
 * Analyzes text for grammar errors using GPT-5-mini
 * @param {string} text - The text to analyze
 * @returns {Promise<{is_error: boolean, error: string, fix: string, reason: string}>}
 */
export async function analyzeGrammar(text) {
  try {
    // Read the grammar oracle prompt
    const promptPath = path.join(__dirname, '../../prompts/grammar-oracle-prompt.md');
    const systemPrompt = fs.readFileSync(promptPath, 'utf-8');

    const response = await openai.chat.completions.create({
      model: 'gpt-5-mini',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: text
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "grammar_analysis",
          strict: true,
          schema: grammarResponseSchema
        }
      }
    });

    const result = JSON.parse(response.choices[0].message.content);
    
    // Validate the response has all required fields
    if (typeof result.is_error !== 'boolean' || 
        !result.error || !result.fix || !result.reason) {
      throw new Error('Invalid response format from grammar oracle');
    }

    return result;
  } catch (error) {
    console.error('Error analyzing grammar:', error);
    
    // Return conservative fallback
    return {
      is_error: false,
      error: text,
      fix: text,
      reason: "Está bien dicho."
    };
  }
}
