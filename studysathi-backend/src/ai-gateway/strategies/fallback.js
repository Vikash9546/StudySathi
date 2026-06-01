import { geminiProvider } from '../providers/gemini.provider.js';
import { openaiProvider } from '../providers/openai.provider.js';
import { anthropicProvider } from '../providers/anthropic.provider.js';
import { groqProvider } from '../providers/groq.provider.js';

const providers = {
  gemini: geminiProvider,
  openai: openaiProvider,
  anthropic: anthropicProvider,
  groq: groqProvider,
};

export async function executeWithFallback(primaryProvider, primaryModel, prompt, options = {}) {
  const chain = [primaryProvider, ...Object.keys(providers).filter(k => k !== primaryProvider)];

  for (const providerKey of chain) {
    try {
      const provider = providers[providerKey];
      if (!provider || !provider.client) continue;

      const result = await provider.generate(prompt, {
        ...options,
        model: providerKey === primaryProvider ? primaryModel : undefined,
      });

      return { ...result, provider: providerKey };
    } catch (err) {
      console.warn(`[Fallback Strategy] Provider ${providerKey} failed:`, err.message);
    }
  }

  throw new Error('All AI providers in the fallback chain failed.');
}
