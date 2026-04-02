class PromptInjectionGuard {
  static instance = null;

  static async getInstance() {
    if (this.instance === null) {
      const { pipeline } = await import('@huggingface/transformers');
      this.instance = await pipeline(
        'text-classification',
        'ProtectAI/deberta-v3-base-prompt-injection-v2',
        { truncation: true, max_length: 512 }
      );
      console.log('Prompt injection model loaded');
    }
    return this.instance;
  }
}

export function promptGuard(fields = ['name']) {
  return async (req, res, next) => {
    if (!req.body) return next();

    const textsToCheck = fields
      .map(f => req.body[f])
      .filter(v => typeof v === 'string' && v.trim());

    if (textsToCheck.length === 0) return next();

    try {
      const classifier = await PromptInjectionGuard.getInstance();

      for (const text of textsToCheck) {
        const [result] = await classifier(text);
        if (result.label === 'INJECTION' && result.score > 0.9) {
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

// Start loading the model at import time
PromptInjectionGuard.getInstance().catch(() => {});
