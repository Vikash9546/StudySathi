/**
 * AI Gateway — Task-to-model mapping
 * Each task maps to a primary model and fallbacks.
 */

export enum AITask {
  TOPIC_EXTRACTION = 'TOPIC_EXTRACTION',
  QUESTION_MCQ = 'QUESTION_MCQ',
  QUESTION_SUBJECTIVE = 'QUESTION_SUBJECTIVE',
  FLASHCARD_GENERATION = 'FLASHCARD_GENERATION',
  AI_TUTOR = 'AI_TUTOR',
  REVISION_NOTES = 'REVISION_NOTES',
  MIND_MAP = 'MIND_MAP',
  STUDY_PLAN = 'STUDY_PLAN',
  MODERATION = 'MODERATION',
  SUBJECTIVE_EVAL = 'SUBJECTIVE_EVAL',
  EMBEDDING = 'EMBEDDING',
}

export enum AIProvider {
  ANTHROPIC = 'anthropic',
  OPENAI = 'openai',
  GEMINI = 'gemini',
  GROQ = 'groq',
}

export interface ModelConfig {
  provider: AIProvider;
  model: string;
  maxTokens?: number;
}

export const TASK_ROUTING: Record<AITask, ModelConfig[]> = {
  [AITask.TOPIC_EXTRACTION]: [
    { provider: AIProvider.GEMINI, model: 'gemini-1.5-flash', maxTokens: 1024 },
    { provider: AIProvider.OPENAI, model: 'gpt-4o-mini', maxTokens: 1024 },
  ],
  [AITask.QUESTION_MCQ]: [
    { provider: AIProvider.ANTHROPIC, model: 'claude-sonnet-4-5', maxTokens: 2048 },
    { provider: AIProvider.OPENAI, model: 'gpt-4o', maxTokens: 2048 },
  ],
  [AITask.QUESTION_SUBJECTIVE]: [
    { provider: AIProvider.ANTHROPIC, model: 'claude-sonnet-4-5', maxTokens: 2048 },
    { provider: AIProvider.OPENAI, model: 'gpt-4o', maxTokens: 2048 },
  ],
  [AITask.FLASHCARD_GENERATION]: [
    { provider: AIProvider.GROQ, model: 'llama-3.3-70b-versatile', maxTokens: 1024 },
    { provider: AIProvider.GEMINI, model: 'gemini-1.5-flash', maxTokens: 1024 },
  ],
  [AITask.AI_TUTOR]: [
    { provider: AIProvider.ANTHROPIC, model: 'claude-haiku-4-5', maxTokens: 2048 },
    { provider: AIProvider.GROQ, model: 'llama-3.3-70b-versatile', maxTokens: 2048 },
  ],
  [AITask.REVISION_NOTES]: [
    { provider: AIProvider.ANTHROPIC, model: 'claude-sonnet-4-5', maxTokens: 4096 },
    { provider: AIProvider.OPENAI, model: 'gpt-4o', maxTokens: 4096 },
  ],
  [AITask.MIND_MAP]: [
    { provider: AIProvider.GEMINI, model: 'gemini-1.5-flash', maxTokens: 2048 },
    { provider: AIProvider.ANTHROPIC, model: 'claude-haiku-4-5', maxTokens: 2048 },
  ],
  [AITask.STUDY_PLAN]: [
    { provider: AIProvider.ANTHROPIC, model: 'claude-sonnet-4-5', maxTokens: 4096 },
    { provider: AIProvider.OPENAI, model: 'gpt-4o', maxTokens: 4096 },
  ],
  [AITask.MODERATION]: [
    { provider: AIProvider.GEMINI, model: 'gemini-1.5-flash', maxTokens: 512 },
    { provider: AIProvider.OPENAI, model: 'gpt-4o-mini', maxTokens: 512 },
  ],
  [AITask.SUBJECTIVE_EVAL]: [
    { provider: AIProvider.ANTHROPIC, model: 'claude-sonnet-4-5', maxTokens: 1024 },
    { provider: AIProvider.OPENAI, model: 'gpt-4o', maxTokens: 1024 },
  ],
  [AITask.EMBEDDING]: [
    { provider: AIProvider.OPENAI, model: 'text-embedding-3-small', maxTokens: 8191 },
  ],
};
