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

export function promptGuard(
   fields = [
      'name',
   ],
) {
   return async (req, res, next) => {
      if (!req.body) return next();

      const textsToCheck = fields
         .map((f) => req.body[f])
         .filter((v) => typeof v === 'string' && v.trim());

      if (textsToCheck.length === 0) return next();

      try {
         const classifier = await PromptInjectionGuard.getInstance();

         for (const text of textsToCheck) {
            const [
               result,
            ] = await classifier(text);
            if (result.label === 'INJECTION' && result.score > 0.9) {
               try {
                  const db = await getDb();
                  db.run(
                     'INSERT INTO injection_logs (user_id, input_text, classification, score) VALUES (?, ?, ?, ?)',
                     [
                        req.user?.id || null,
                        text,
                        result.label,
                        result.score,
                     ],
                  );
                  saveDb();
               } catch (logErr) {
                  console.error('Failed to log injection:', logErr.message);
               }
               return res.status(400).json({
                  error: 'Potential prompt injection detected',
               });
            }
         }

         next();
      } catch (err) {
         console.error('Prompt guard error:', err.message);
         next();
      }
   };
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
