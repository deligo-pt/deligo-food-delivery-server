import { GoogleGenAI } from '@google/genai';
import config from '.';

export const genAi = new GoogleGenAI({
  apiKey: config.ai.geminiApiKey,
});
