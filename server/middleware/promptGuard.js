import {getDb, saveDb} from '../db.js';

class PromptInjectionGuard {
   static instance = null;

   static async getInstance() {
      if (this.instance === null) {
         const {pipeline} = await import('@huggingface/transformers');
         this.instance = await pipeline(
            'text-classification',
            'ProtectAI/deberta-v3-base-prompt-injection-v2',
            {truncation: true, max_length: 512},
         );
         console.log('Prompt injection model loaded');
      }
      return this.instance;
   }
}

// Returns { injection: boolean, score: number } for a given text
export async function checkInjection(text) {
   try {
      const classifier = await PromptInjectionGuard.getInstance();
      const [
         result,
      ] = await classifier(text);
      return {
         injection: result.label === 'INJECTION' && result.score > 0.9,
         label: result.label,
         score: result.score,
      };
   } catch (err) {
      console.error('checkInjection error:', err.message);
      return {injection: false, label: 'ERROR', score: 0};
   }
}

// Start loading the model at import time
PromptInjectionGuard.getInstance().catch(() => {});
