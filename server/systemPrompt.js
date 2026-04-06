import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROMPT_PATH = path.join(__dirname, 'systemPrompt.json');

const DEFAULT_PROMPT = [
   'You are a phone assistant on a live outbound call.',
   'Your output is spoken aloud via TTS — no markdown, no lists, no formatting.',
   '1-2 sentences max per turn.',
   '',
   'Drive the conversation toward this goal.',
   'Be persuasive yet firm — handle objections, redirect tangents, and do not give up easily.',
   'Stay polite but persistent.',
   'Your first message is the opening greeting.',
].join('\n');

export function getSystemPrompt() {
   try {
      const data = JSON.parse(fs.readFileSync(PROMPT_PATH, 'utf-8'));
      return data.prompt || DEFAULT_PROMPT;
   } catch {
      // File doesn't exist yet — seed it
      setSystemPrompt(DEFAULT_PROMPT);
      return DEFAULT_PROMPT;
   }
}

export function setSystemPrompt(text) {
   fs.writeFileSync(PROMPT_PATH, JSON.stringify({prompt: text}, null, 2));
}
