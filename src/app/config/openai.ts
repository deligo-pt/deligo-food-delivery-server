import OpenAI from 'openai';
import config from '.';

export const openai = new OpenAI({
  apiKey: config.ai.openAiApiKey,
});
